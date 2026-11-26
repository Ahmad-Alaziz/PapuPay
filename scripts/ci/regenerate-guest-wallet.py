#!/usr/bin/env python3
"""Refresh the seven private TestFlight Wallet passes with the current artwork."""

import base64
import gzip
import io
import json
import os
from pathlib import Path
import plistlib
import subprocess
import sys
from tempfile import TemporaryDirectory
import zipfile

from importlib.util import module_from_spec, spec_from_file_location


HERE = Path(__file__).resolve().parent
decoder_spec = spec_from_file_location("prepare_guest_demo", HERE / "prepare-guest-demo.py")
decoder = module_from_spec(decoder_spec)
decoder_spec.loader.exec_module(decoder)


def previous_pass_identity(passes):
    keys = ("serialNumber", "passTypeIdentifier", "teamIdentifier")
    identities = set()
    for data in passes:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                document = json.loads(archive.read("pass.json"))
                identity = tuple(document[key] for key in keys)
        except (KeyError, TypeError, ValueError, zipfile.BadZipFile) as error:
            raise ValueError("An existing pass is missing its Wallet identity.") from error
        if any(not isinstance(value, str) or not value.strip() or len(value) > 128 for value in identity):
            raise ValueError("An existing pass has an invalid Wallet identity.")
        identities.add(identity)
    if len(identities) > 1:
        raise ValueError("Existing demo passes must share one Wallet identity.")
    return dict(zip(keys, next(iter(identities)))) if identities else {}


def regenerate(encoded):
    payload = decoder.decode_configuration(encoded)
    if not payload["enabled"]:
        raise ValueError("Set PAPUPAY_GUEST_DEMO_BASE64 to the enabled demo configuration.")

    identity = {key: payload[key] for key in ("cardCode", "checkout")}
    identity.update(previous_pass_identity(payload.get("walletPasses", [])))

    signing_env = {key: value for key, value in os.environ.items() if key != "PAPUPAY_GUEST_DEMO_BASE64"}
    with TemporaryDirectory(prefix="papupay-demo-wallet-") as temporary:
        subprocess.run(
            ["node", str(HERE / "sign-guest-wallet.mjs"), temporary],
            input=json.dumps(identity), text=True, check=True, timeout=120, env=signing_env,
        )
        payload["walletPasses"] = [
            (Path(temporary) / f"{count}.pkpass").read_bytes() for count in range(7)
        ]

    updated = plistlib.dumps(payload, fmt=plistlib.FMT_BINARY)
    result = base64.b64encode(gzip.compress(updated, mtime=0))
    decoder.decode_configuration(result.decode("ascii"))
    return result


def main():
    if len(sys.argv) != 2:
        raise ValueError("Supply the path for a new, private demo secret file.")
    destination = Path(sys.argv[1])
    if destination.exists():
        raise ValueError("The output path already exists. Supply a new file path.")
    result = regenerate(os.environ.get("PAPUPAY_GUEST_DEMO_BASE64", ""))
    descriptor = os.open(destination, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(descriptor, "wb") as private_file:
        private_file.write(result + b"\n")
    print("Prepared seven Papupay Wallet passes for the existing TestFlight demo.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"Could not prepare the demo passes. {error}", file=sys.stderr)
        sys.exit(1)
