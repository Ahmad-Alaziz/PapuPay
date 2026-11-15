#!/usr/bin/env python3
"""Checks the private-resource boundary using only synthetic test data."""

import base64
import gzip
import importlib.util
import io
from pathlib import Path
import plistlib
import unittest
import zipfile


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

    def test_decompression_is_bounded(self):
        oversized = base64.b64encode(gzip.compress(b"x" * (512 * 1024 + 1))).decode("ascii")
        with self.assertRaises(ValueError):
            module.decode_configuration(oversized)


if __name__ == "__main__":
    unittest.main()
