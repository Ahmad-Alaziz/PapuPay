#!/usr/bin/env bash
set -euo pipefail
mode="${1:-unsigned}"
if [[ "$mode" != unsigned && "$mode" != signed ]]; then
  echo "Usage: archive-ios.sh unsigned|signed" >&2
  exit 2
fi
if [[ "$mode" == signed && "${RUNNER_ENVIRONMENT:-}" != github-hosted ]]; then
  echo "Signed archives are restricted to the GitHub-hosted release workflow." >&2
  exit 2
fi
build_number="${GITHUB_RUN_NUMBER:-1}.${GITHUB_RUN_ATTEMPT:-1}"
mkdir -p build/reports
xcodebuild -version
signing=(CODE_SIGN_STYLE=Manual)
if [[ "$mode" == unsigned ]]; then
  signing=(CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO)
fi
xcodebuild -project apps/ios/PapuPay.xcodeproj -scheme PapuPay \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$PWD/build/PapuPay.xcarchive" \
  -derivedDataPath "$PWD/build/DerivedData" \
  -clonedSourcePackagesDirPath "${PAPUPAY_SPM_PATH:-$PWD/build/SourcePackages}" \
  -onlyUsePackageVersionsFromResolvedFile \
  CURRENT_PROJECT_VERSION="$build_number" \
  "${signing[@]}" archive > build/reports/archive.log 2>&1 || {
    tail -n 100 build/reports/archive.log
    exit 1
  }
python3 scripts/ci/verify-ios-archive.py build/PapuPay.xcarchive "$build_number" \
  | tee build/reports/archive-summary.json
python3 scripts/check-clip-size.py \
  build/PapuPay.xcarchive/Products/Applications/PapuPay.app/AppClips/PapuPayClip.app \
  --json | tee build/reports/clip-size.json
