#!/bin/bash
set -e

if [ -n "$GOOGLE_SERVICE_INFO_PLIST" ]; then
  echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > "$EAS_BUILD_WORKINGDIR/GoogleService-Info.plist"
  echo "GoogleService-Info.plist written successfully"
fi
