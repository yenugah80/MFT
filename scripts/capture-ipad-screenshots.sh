#!/bin/bash
# Captures fresh App Store screenshots for the 13-inch iPad display bucket.
#
# Specific to this project: uses the already-built debug simulator binary
# from DerivedData (no rebuild needed — simulator app bundles are
# device-generic), the real bundle ID, and the "iPad Pro 13-inch (M5)"
# device type, which is the one already confirmed this session to produce
# ASC-accepted 2064x2752 screenshots for this app's 13-inch iPad bucket.
#
# You still need to navigate the app + tap through screens by hand (or via
# `xcrun simctl openurl <udid> "my-food-tracker:///<route>"` deep links) —
# this script only handles booting the right simulator, installing the
# build, and taking the screenshot at the right moment when you press Enter.
set -euo pipefail

BUNDLE_ID="com.zennxt.myfoodtracker"
DEVICE_NAME="iPad Screenshot Capture"
DEVICE_TYPE="com.apple.CoreSimulator.SimDeviceType.iPad-Pro-13-inch-M5-12GB"
RUNTIME="com.apple.CoreSimulator.SimRuntime.iOS-26-5"
OUTPUT_DIR="$HOME/Desktop/ipad-screenshots"
APP_PATH="$HOME/Library/Developer/Xcode/DerivedData/MFTMyFlourishTracker-fcgwqqkhmbnyjwcflwnrmhndnmqu/Build/Products/Debug-iphonesimulator/MFTMyFlourishTracker.app"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Build not found at:"
  echo "  $APP_PATH"
  echo "Run 'npx expo run:ios' once first to produce a debug build, or update APP_PATH"
  echo "in this script to point at your actual DerivedData folder (find it with:"
  echo "  find ~/Library/Developer/Xcode/DerivedData -maxdepth 1 -iname 'MFTMyFlourishTracker-*')"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Reuse an existing capture simulator if one's already set up, so repeat runs
# don't pile up duplicate devices.
UDID=$(xcrun simctl list devices | grep "$DEVICE_NAME" | grep -oE '[0-9A-F-]{36}' | head -1 || true)

if [[ -z "$UDID" ]]; then
  echo "Creating simulator: $DEVICE_NAME (iPad Pro 13-inch M5)..."
  UDID=$(xcrun simctl create "$DEVICE_NAME" "$DEVICE_TYPE" "$RUNTIME")
fi

echo "Booting simulator ($UDID)..."
xcrun simctl bootstatus "$UDID" -b 2>/dev/null || xcrun simctl boot "$UDID"
open -a Simulator --args -CurrentDeviceUDID "$UDID"
sleep 5

echo "Installing build..."
xcrun simctl install "$UDID" "$APP_PATH"

echo "Launching app..."
xcrun simctl launch "$UDID" "$BUNDLE_ID"
sleep 3

echo ""
echo "Simulator is up. For each screenshot:"
echo "  1. Navigate to the screen you want in the Simulator window"
echo "  2. Press Enter here to capture it"
echo "  3. Type a filename (no extension) and press Enter, or just Enter to skip"
echo "Press Ctrl+C when done."
echo ""

while true; do
  read -r -p "Press Enter when ready to capture (Ctrl+C to stop)... " _
  read -r -p "Filename for this shot (e.g. 03-log-meal), blank to skip: " NAME
  if [[ -z "$NAME" ]]; then
    continue
  fi
  OUT="$OUTPUT_DIR/${NAME}.png"
  xcrun simctl io "$UDID" screenshot "$OUT"
  DIMS=$(sips -g pixelWidth -g pixelHeight "$OUT" 2>/dev/null | tail -2 | awk '{printf "%s", $2}' | paste -sd 'x' -)
  echo "  Saved: $OUT ($DIMS)"
  if [[ "$DIMS" != "2064x2752" ]]; then
    echo "  WARNING: expected 2064x2752 for the 13-inch iPad bucket, got $DIMS"
  fi
done
