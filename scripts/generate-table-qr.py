#!/usr/bin/env python3
"""Generate the canonical table QR as SVG and PNG. Requires: pip install qrcode."""
import argparse
from pathlib import Path
import struct
import zlib
import qrcode
import qrcode.image.svg

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--table", type=int, required=True)
parser.add_argument("--hall", choices=["koszyki"], default="koszyki")
parser.add_argument("--output", type=Path, default=Path("docs/testing"))
args = parser.parse_args()
if not 1 <= args.table <= 999: parser.error("table must be 1–999")
url = f"https://papupay.com/go/{args.hall}/{args.table}"
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=4)
qr.add_data(url); qr.make(fit=True)
args.output.mkdir(parents=True, exist_ok=True)
base = args.output / f"{args.hall}-table-{args.table}"
qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(str(base)+".svg")
matrix=qr.get_matrix(); scale=12; size=len(matrix)*scale
def chunk(kind,data):
    return struct.pack(">I",len(data))+kind+data+struct.pack(">I",zlib.crc32(kind+data)&0xffffffff)
rows=b"".join((b"\0"+b"".join((bytes((23,60,43)) if cell else b"\xff\xff\xff")*scale for cell in row))*scale for row in matrix)
png=b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",size,size,8,2,0,0,0))+chunk(b"IDAT",zlib.compress(rows))+chunk(b"IEND",b"")
Path(str(base)+".png").write_bytes(png)
print(url)
