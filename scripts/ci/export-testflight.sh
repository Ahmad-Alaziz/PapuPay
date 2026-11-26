#!/usr/bin/env bash
set -euo pipefail
umask 077
if [[ "${GITHUB_ACTIONS:-}" != true || "${RUNNER_ENVIRONMENT:-}" != github-hosted || "${GITHUB_REF:-}" != refs/heads/main ]]; then
  echo "Run this only in the GitHub-hosted main-branch TestFlight workflow." >&2
  exit 2
fi
for name in APP_STORE_CONNECT_KEY_IDENTIFIER APP_STORE_CONNECT_ISSUER_ID APP_STORE_CONNECT_PRIVATE_KEY CERTIFICATE_PRIVATE_KEY; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::Missing apple-signing environment secret: $name"
    exit 1
  fi
done

signing_dir="$RUNNER_TEMP/papupay-signing"
mkdir -p "$signing_dir/certificates" "$signing_dir/profiles" build/reports
export APP_STORE_CONNECT_DISABLE_JWT_CACHE=true
export APP_STORE_CONNECT_CERTIFICATES_DIRECTORY="$signing_dir/certificates"
export APP_STORE_CONNECT_PROFILES_DIRECTORY="$signing_dir/profiles"
keychain_path="$signing_dir/papupay.keychain-db"
keychain_password="$(openssl rand -hex 32)"
echo "::add-mask::$keychain_password"
demo_resource="apps/ios/Resources/GuestDemo.plist"
if [[ -f "$demo_resource" ]]; then
  cp "$demo_resource" "$signing_dir/GuestDemo.original.plist"
fi

cleanup() {
  if [[ -f "$signing_dir/GuestDemo.original.plist" ]]; then
    cp "$signing_dir/GuestDemo.original.plist" "$demo_resource"
  else
    rm -f "$demo_resource"
  fi
  security delete-keychain "$keychain_path" >/dev/null 2>&1 || true
  if [[ -f "$signing_dir/installed-profiles.txt" ]]; then
    while IFS= read -r profile; do rm -f "$profile"; done < "$signing_dir/installed-profiles.txt"
  fi
  rm -rf "$signing_dir"
}
trap cleanup EXIT

# Only this protected TestFlight workflow injects private demo data. The
# committed resource remains disabled and no private values enter build logs.
python3 scripts/ci/prepare-guest-demo.py --refresh-wallet "$demo_resource"
unset PAPUPAY_GUEST_DEMO_BASE64

keychain initialize --path "$keychain_path" --password "$keychain_password"
# Reuse one dedicated private key across runs; do not create a new Apple certificate per build.
# Exact identifiers prevent this workflow from touching unrelated apps on the team.
for bundle in com.papupay.app com.papupay.app.Clip; do
  app-store-connect fetch-signing-files "$bundle" --type IOS_APP_STORE \
    --strict-match-identifier --create \
    --certificates-dir "$signing_dir/certificates" --profiles-dir "$signing_dir/profiles"
done
keychain add-certificates --path "$keychain_path" \
  --certificate "$signing_dir/certificates/*.p12"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$keychain_password" "$keychain_path" >/dev/null
# Xcode looks for installed profiles, not arbitrary downloaded paths.
python3 - "$signing_dir" <<'PY_PROFILE'
import plistlib, shutil, subprocess, sys
from pathlib import Path
source = Path(sys.argv[1]) / 'profiles'
destination = Path.home() / 'Library/Developer/Xcode/UserData/Provisioning Profiles'
destination.mkdir(parents=True, exist_ok=True)
for profile in source.glob('*.mobileprovision'):
    decoded = subprocess.check_output(['security', 'cms', '-D', '-i', str(profile)])
    identifier = plistlib.loads(decoded)['UUID']
    installed = destination / f'{identifier}.mobileprovision'
    shutil.copy2(profile, installed)
    with (source.parent / 'installed-profiles.txt').open('a') as paths:
        paths.write(str(installed) + '\n')
PY_PROFILE
xcode-project use-profiles --project apps/ios/PapuPay.xcodeproj \
  --profile "$signing_dir/profiles/*.mobileprovision" \
  --export-options-plist "$signing_dir/export-options.plist" \
  --custom-export-options '{"destination":"export","manageAppVersionAndBuildNumber":false}'

# The pinned signing helper models the old method enum; Xcode uses the current name.
python3 - "$signing_dir/export-options.plist" <<'PY_EXPORT'
import plistlib, sys
from pathlib import Path
path = Path(sys.argv[1])
options = plistlib.loads(path.read_bytes())
options['method'] = 'app-store-connect'
path.write_bytes(plistlib.dumps(options))
PY_EXPORT

bash scripts/ci/archive-ios.sh signed
xcodebuild -exportArchive -archivePath "$PWD/build/PapuPay.xcarchive" \
  -exportOptionsPlist "$signing_dir/export-options.plist" \
  -exportPath "$PWD/build/export" > build/reports/export.log 2>&1 || {
    tail -n 100 build/reports/export.log
    exit 1
  }
if [[ ! -s build/export/PapuPay.ipa ]]; then
  echo "::error::Xcode did not export build/export/PapuPay.ipa"
  exit 1
fi
