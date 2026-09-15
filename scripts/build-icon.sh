#!/usr/bin/env bash
#
# Compiles MainIcon.icon (Icon Composer / macOS 26 "Liquid Glass" format) into the
# artifacts electron-builder needs:
#
#   build/icon.icns   -> static fallback icon (DMG, Finder, macOS < 26)
#   build/Assets.car   -> compiled asset catalog for the dynamic Liquid Glass icon,
#                         injected into the .app by scripts/afterPack.cjs on macOS 26+
#
# Requires actool from Xcode 26+ (full Xcode, not just Command Line Tools).
# If actool is unavailable this script no-ops so the committed artifacts are used.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON="$ROOT/MainIcon.icon"
OUT="$ROOT/build"
NAME="MainIcon" # must match the .icon basename and CFBundleIconName

# Locate actool: prefer the active toolchain, then fall back to installed Xcode(-beta).
ACTOOL="$(xcrun --find actool 2>/dev/null || true)"
if [ -z "${ACTOOL:-}" ] || [ ! -x "$ACTOOL" ]; then
  for dev in \
    "/Applications/Xcode.app/Contents/Developer" \
    "/Applications/Xcode-beta.app/Contents/Developer"; do
    if [ -x "$dev/usr/bin/actool" ]; then ACTOOL="$dev/usr/bin/actool"; break; fi
  done
fi

if [ -z "${ACTOOL:-}" ] || [ ! -x "$ACTOOL" ]; then
  echo "build-icon: actool not found (needs Xcode 26+). Keeping committed build/icon.icns and build/Assets.car." >&2
  exit 0
fi

# actool needs DEVELOPER_DIR pointing at the toolchain that owns it.
DEVELOPER_DIR="$(dirname "$(dirname "$(dirname "$ACTOOL")")")"
export DEVELOPER_DIR

mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

"$ACTOOL" \
  --output-format human-readable-text \
  --errors --warnings \
  --app-icon "$NAME" \
  --compile "$TMP" \
  --platform macosx \
  --target-device mac \
  --minimum-deployment-target 26.0 \
  --output-partial-info-plist "$TMP/partial.plist" \
  "$ICON"

cp "$TMP/$NAME.icns" "$OUT/icon.icns"
cp "$TMP/Assets.car" "$OUT/Assets.car"

echo "build-icon: wrote build/icon.icns and build/Assets.car"
