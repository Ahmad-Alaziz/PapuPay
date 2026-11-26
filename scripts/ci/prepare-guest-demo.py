#!/usr/bin/env python3
"""Materialize a TestFlight-only demo resource without logging its private values."""

import argparse
import base64
import gzip
import io
import os
from pathlib import Path
import plistlib
import sys
import zipfile

from guest_demo_wallet import refresh_passes


def decode_configuration(encoded):
    encoded = encoded.strip()
    if not encoded:
        return {"enabled": False}
    if len(encoded) > 48 * 1024:
        raise ValueError("Demo configuration exceeds the encrypted-secret limit.")
    try:
        raw = base64.b64decode(encoded, validate=True)
        if raw.startswith(b"\x1f\x8b"):
            with gzip.GzipFile(fileobj=io.BytesIO(raw)) as compressed:
                raw = compressed.read(512 * 1024 + 1)
        if len(raw) > 512 * 1024:
            raise ValueError()
        payload = plistlib.loads(raw)
    except Exception:
        raise ValueError("Demo configuration is not a valid base64 property list.") from None
    if not isinstance(payload, dict) or payload.get("enabled") is not True or payload.get("venueId") != "sweeto":
        raise ValueError("Demo configuration must explicitly enable the Sweeto test venue.")
    for key in ("cardCode", "checkout"):
        value = payload.get(key)
        if not isinstance(value, str) or not value or len(value) > 240:
            raise ValueError("Demo card identity is missing or invalid.")
    wifi = payload.get("wifi")
    if not isinstance(wifi, dict):
        raise ValueError("Demo Wi-Fi configuration is missing.")
    ssid = wifi.get("ssid")
    if not isinstance(ssid, str) or not 1 <= len(ssid.encode("utf-8")) <= 32:
        raise ValueError("Demo Wi-Fi network name is invalid.")
    security = wifi.get("security")
    if security not in ("WPA", "WEP", "nopass") or not isinstance(wifi.get("hidden", False), bool):
        raise ValueError("Demo Wi-Fi security settings are invalid.")
    password = wifi.get("password")
    if security != "nopass" and (not isinstance(password, str) or not password or len(password) > 128):
        raise ValueError("Demo Wi-Fi password is invalid.")
    passes = payload.get("walletPasses")
    if passes is not None:
        if not isinstance(passes, list) or len(passes) != 7:
            raise ValueError("Bundled demo Wallet passes must cover all seven stamp states.")
        for wallet in passes:
            if not isinstance(wallet, bytes) or len(wallet) > 50 * 1024:
                raise ValueError("Bundled demo Wallet pass is invalid or too large.")
            try:
                with zipfile.ZipFile(io.BytesIO(wallet)) as archive:
                    if not {"pass.json", "manifest.json", "signature"}.issubset(archive.namelist()):
                        raise ValueError()
            except Exception:
                raise ValueError("Bundled demo Wallet pass is not a signed pass package.") from None
    return payload


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--refresh-wallet", action="store_true")
    args = parser.parse_args()
    configuration = decode_configuration(os.environ.get("PAPUPAY_GUEST_DEMO_BASE64", ""))
    if args.refresh_wallet and configuration["enabled"]:
        configuration["walletPasses"], _ = refresh_passes(configuration)
    destination = args.destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(plistlib.dumps(configuration, fmt=plistlib.FMT_BINARY))
    destination.chmod(0o600)
    print("Bundled guest demo enabled for TestFlight." if configuration["enabled"] else "Bundled guest demo disabled.")


if __name__ == "__main__":
    try:
        main()
    except ValueError as error:
        print(f"::error::{error}", file=sys.stderr)
        sys.exit(1)
