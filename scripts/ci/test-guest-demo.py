#!/usr/bin/env python3
"""Checks the private-resource boundary using only synthetic test data."""

import base64
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import plistlib
import subprocess
from tempfile import TemporaryDirectory
import unittest
import zipfile

from guest_demo_wallet import pass_identity, read_signed_pass


spec = importlib.util.spec_from_file_location("prepare_demo", Path(__file__).with_name("prepare-guest-demo.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def encoded(configuration, compressed=True):
    raw = plistlib.dumps(configuration, fmt=plistlib.FMT_BINARY)
    return base64.b64encode(gzip.compress(raw) if compressed else raw).decode("ascii")


def test_configuration():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name in ("pass.json", "manifest.json", "signature"):
            archive.writestr(name, b"synthetic test fixture")
    return {
        "enabled": True,
        "venueId": "sweeto",
        "cardCode": "DEMO2026",
        "checkout": "PAPUPAY-DEMO:SWEETO:DEMO2026",
        "wifi": {"ssid": "Example demo network", "password": "example-only-password", "security": "WPA", "hidden": False},
        "walletPasses": [buffer.getvalue()] * 7,
    }


class DemoResourceTests(unittest.TestCase):
    def test_missing_secret_cannot_enable_demo(self):
        self.assertEqual(module.decode_configuration(""), {"enabled": False})

    def test_round_trip_preserves_all_stamp_states_and_private_fields(self):
        configuration = test_configuration()
        for compressed in (False, True):
            self.assertEqual(module.decode_configuration(encoded(configuration, compressed) + "\n"), configuration)

    def test_wrong_venue_cannot_activate_this_demo(self):
        configuration = test_configuration()
        configuration["venueId"] = "another-venue"
        with self.assertRaisesRegex(ValueError, "Sweeto"):
            module.decode_configuration(encoded(configuration))

    def test_partial_wallet_state_set_is_rejected(self):
        configuration = test_configuration()
        configuration["walletPasses"].pop()
        with self.assertRaisesRegex(ValueError, "seven"):
            module.decode_configuration(encoded(configuration))

    def test_bad_input_does_not_echo_private_values(self):
        secret = "private-value-that-is-not-base64"
        with self.assertRaises(ValueError) as result:
            module.decode_configuration(secret)
        self.assertNotIn(secret, str(result.exception))

    def test_refresh_requires_the_original_checkout_and_code(self):
        from_seed = {"cardCode": "example", "checkout": "sample-barcode"}
        document = {"serialNumber": "serial", "passTypeIdentifier": "pass.test", "teamIdentifier": "TEST",
                    "barcodes": [{"format": "PKBarcodeFormatQR", "message": "sample-barcode", "altText": "example"}]}
        self.assertEqual(pass_identity(document, from_seed)["serialNumber"], "serial")
        for key in from_seed:
            with self.assertRaisesRegex(ValueError, "identities differ"):
                pass_identity(document, {**from_seed, key: "another-card"})

    def test_refresh_rejects_tampering_with_manifest_or_artwork(self):
        with TemporaryDirectory(prefix="papupay-wallet-proof-test-") as temporary:
            directory = Path(temporary)
            files = {"pass.json": b"{}", "icon.png": b"original-art"}
            def manifest_for(contents):
                return json.dumps({name: hashlib.sha1(data).hexdigest() for name, data in contents.items()}).encode()
            original = manifest_for(files)
            (directory / "input").write_bytes(original)
            def openssl(*args):
                subprocess.run(["openssl", *args], cwd=directory, stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL, check=True)
            openssl("req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=Temporary Test",
                    "-days", "1", "-keyout", "test.key", "-out", "test.pem")
            openssl("smime", "-sign", "-binary", "-in", "input", "-signer", "test.pem",
                    "-inkey", "test.key", "-outform", "DER", "-out", "test.der")
            def package(contents, manifest):
                buffer = io.BytesIO()
                with zipfile.ZipFile(buffer, "w") as archive:
                    for name, data in contents.items():
                        archive.writestr(name, data)
                    archive.writestr("manifest.json", manifest)
                    archive.writestr("signature", (directory / "test.der").read_bytes())
                return buffer.getvalue()
            self.assertEqual(read_signed_pass(package(files, original), directory)[0], {})
            changed = {**files, "icon.png": b"changed-art"}
            with self.assertRaisesRegex(ValueError, "manifest does not match"):
                read_signed_pass(package(changed, original), directory)
            with self.assertRaisesRegex(ValueError, "Invalid detached signature"):
                read_signed_pass(package(changed, manifest_for(changed)), directory)

    def test_decompression_is_bounded(self):
        oversized = base64.b64encode(gzip.compress(b"x" * (512 * 1024 + 1))).decode("ascii")
        with self.assertRaises(ValueError):
            module.decode_configuration(oversized)


if __name__ == "__main__":
    unittest.main()
