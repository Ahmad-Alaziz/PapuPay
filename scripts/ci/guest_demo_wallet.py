"""Rebuild the seven internal pass states using the identity from the protected demo."""
import hashlib
import io
import json
import os
from pathlib import Path
import ssl
import subprocess
from tempfile import TemporaryDirectory
import zipfile


HERE = Path(__file__).resolve().parent
SIGNATURES = HERE / "guest-wallet-signatures"
# Reconstructed only after the protected seed has passed its own transport limits.
MAX_REBUILT_PASS_BYTES = 256 * 1024


def read_signed_pass(data, directory):
    """Verify every file against the manifest and return the verified CMS signer."""
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        names = archive.namelist()
        if len(names) > 64 or len(names) != len(set(names)) or sum(row.file_size for row in archive.infolist()) > 2 * 1024 * 1024:
            raise ValueError("Unexpected demo pass package contents.")
        manifest = archive.read("manifest.json")
        signature = archive.read("signature")
        document = json.loads(archive.read("pass.json"))
        hashes = {name: hashlib.sha1(archive.read(name)).hexdigest()
                  for name in names if name not in {"manifest.json", "signature"}}
        if json.loads(manifest) != hashes:
            raise ValueError("Demo pass manifest does not match its contents.")
    # The original signer is anchored in the protected seed. Verify detached CMS
    # first, then compare actual certificates; no certificate from git is trusted.
    (directory / "manifest").write_bytes(manifest)
    (directory / "signature").write_bytes(signature)
    verified = subprocess.run([
        "openssl", "smime", "-verify", "-binary", "-noverify", "-inform", "DER",
        "-in", str(directory / "signature"), "-content", str(directory / "manifest"),
        "-signer", str(directory / "cert.pem"), "-out", os.devnull,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
    if verified.returncode:
        raise ValueError("Invalid detached signature for the demo pass manifest.")
    cert = ssl.PEM_cert_to_DER_cert((directory / "cert.pem").read_text())
    return document, cert, signature


def pass_identity(document, payload):
    qr = next((barcode for barcode in document["barcodes"]
               if barcode.get("format") == "PKBarcodeFormatQR"), {})
    if qr.get("message") != payload["checkout"] or qr.get("altText") != payload["cardCode"]:
        raise ValueError("The protected demo card and Wallet QR identities differ.")
    return {key: document[key] for key in ("serialNumber", "passTypeIdentifier", "teamIdentifier")}


def refresh_passes(payload, signatures=SIGNATURES, *, issue=False):
    originals = payload.get("walletPasses", [])
    if len(originals) != 7:
        raise ValueError("Seven original signed demo passes are required to preserve the card.")
    result, proofs = [], []
    with TemporaryDirectory(prefix="papupay-wallet-rebuild-") as temporary:
        directory = Path(temporary)
        previous, signer, _ = read_signed_pass(originals[0], directory)
        identity = pass_identity(previous, payload)
        for original in originals[1:]:
            previous, cert, _ = read_signed_pass(original, directory)
            if cert != signer or pass_identity(previous, payload) != identity:
                raise ValueError("Original demo passes must share the same signer and card identity.")
        args = ["node", str(HERE / "sign-guest-wallet.mjs"), temporary]
        env = {"PATH": os.environ["PATH"]}
        if issue:
            env.update({key: value for key, value in os.environ.items() if key.startswith("PAPUPAY_WALLET_")})
        else:
            args.extend(["--signatures", str(signatures)])
        subprocess.run(args, input=json.dumps({**identity, "checkout": payload["checkout"],
                       "cardCode": payload["cardCode"]}), text=True, check=True, timeout=120, env=env)
        for n in range(7):
            data = (directory / f"{n}.pkpass").read_bytes()
            if not 0 < len(data) <= MAX_REBUILT_PASS_BYTES:
                raise ValueError("Rebuilt demo pass exceeds its bundle budget.")
            document, cert, proof = read_signed_pass(data, directory)
            if cert != signer or pass_identity(document, payload) != identity:
                raise ValueError("Rebuilt demo pass changed its signer or identity.")
            link = f"https://papupay.com/v/sweeto/restore#demo=sweeto-testflight-v1.{n}"
            store = document["storeCard"]
            action_urls = [action.get("url") for action in document.get("featuredActions", [])]
            details_link = any(f'href="{link}"' in field.get("attributedValue", "")
                               for field in store.get("backFields", []))
            if document.get("appLaunchURL") != link or link not in action_urls or not details_link:
                raise ValueError("Rebuilt demo pass is missing its stamp-specific recovery link.")
            if not any(field.get("key") == "stamps" and field.get("value") == f"{n} / 6"
                       for field in store.get("headerFields", [])):
                raise ValueError("Rebuilt demo pass has an incorrect visible stamp balance.")
            result.append(data)
            proofs.append(proof)
    return result, proofs
