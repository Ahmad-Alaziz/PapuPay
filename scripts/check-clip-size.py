#!/usr/bin/env python3
"""Conservative raw bundle-size gate. App Store thinned download report is final."""
import argparse, json
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('app',type=Path,help='Release-iphoneos/PapuPayClip.app path')
parser.add_argument('--limit-mb',type=float,default=15)
parser.add_argument('--json',action='store_true')
a=parser.parse_args()
if not a.app.is_dir() or a.app.suffix!='.app': parser.error('Provide an existing device .app bundle, not a simulator build or IPA.')
files=[(str(p.relative_to(a.app)),p.stat().st_size) for p in a.app.rglob('*') if p.is_file() and not p.is_symlink()]
total=sum(size for _,size in files);limit=int(a.limit_mb*1_000_000)
report={'bundle':a.app.name,'uncompressedBytes':total,'decimalMB':round(total/1_000_000,3),'MiB':round(total/1024**2,3),'budgetBytes':limit,'remainingBytes':limit-total,'passesRawSizeGate':total<=limit,'largestFiles':[{'path':p,'bytes':n} for p,n in sorted(files,key=lambda pair:pair[1],reverse=True)[:8]],'note':'Raw device bundle, including the embedded Live Activity extension and Rive framework. Verify the signed, thinned variant in an Xcode archive/App Store size report before distribution.'}
print(json.dumps(report,indent=2) if a.json else f'{a.app.name}: {total/1_000_000:.2f} MB / {a.limit_mb:g} MB raw bundle budget. '+('PASS' if total<=limit else 'FAIL'))
raise SystemExit(0 if total<=limit else 1)
