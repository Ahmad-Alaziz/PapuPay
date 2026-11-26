#!/usr/bin/env python3
"""Fail an archive before upload if its app or App Clip packaging is incomplete."""
import json
import plistlib
import sys
from pathlib import Path

archive = Path(sys.argv[1])
expected_version = sys.argv[2]
app = archive / 'Products/Applications/PapuPay.app'
clip = app / 'AppClips/PapuPayClip.app'
bundles = {
    app: 'com.papupay.app',
    clip: 'com.papupay.app.Clip',
}
report = []
for bundle, identifier in bundles.items():
    with (bundle / 'Info.plist').open('rb') as f:
        info = plistlib.load(f)
    launch = info.get('UILaunchScreen', {})
    assert launch.get('UIImageName') == 'PapuPayLaunchLockup', f'Missing launch mark: {bundle}'
    assert launch.get('UIColorName') == 'GuestLaunchPaper', f'Missing launch paper: {bundle}'
    assert info['CFBundleIdentifier'] == identifier, f'Wrong identifier: {bundle}'
    assert info['CFBundleVersion'] == expected_version, f'Wrong build number: {bundle}'
    assert info['CFBundleShortVersionString'] == '1.0', f'Wrong marketing version: {bundle}'
    assert (bundle / info['CFBundleExecutable']).is_file(), f'Missing executable: {bundle}'
    assert (bundle / 'PrivacyInfo.xcprivacy').is_file(), f'Missing privacy manifest: {bundle}'
    assert (bundle / 'Frameworks/RiveRuntime.framework/RiveRuntime').is_file(), f'Missing Rive runtime: {bundle}'
    for required in ['Assets.car', 'GuestDemo.plist', 'menu.pdf', 'PapuPoster.ttf', 'sweeto-pass.riv']:
        assert (bundle / required).is_file(), f'Missing Sweeto guest resource {required}: {bundle}'
    assert 'PapuPoster.ttf' in info.get('UIAppFonts', []), f'Poster font not registered: {bundle}'
    if bundle == clip:
        assert 'NSAppClip' in info, 'Missing App Clip declaration'
        assert 'CFBundleURLTypes' not in info, 'App Clips cannot register custom URL schemes'
    report.append({'bundle': identifier, 'version': info['CFBundleShortVersionString'], 'build': info['CFBundleVersion']})
print(json.dumps({'archive': archive.name, 'bundles': report, 'passed': True}, indent=2))
