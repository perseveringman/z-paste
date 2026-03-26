#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_PATH="$SCRIPT_DIR/native-host.js"
HOST_NAME="com.zpaste.stash"

# Extension ID
EXT_ID="${1:-}"
if [ -z "$EXT_ID" ]; then
  echo "Usage: $0 <chrome-extension-id>"
  echo "  Load the extension in Chrome first, then find the ID in chrome://extensions"
  exit 1
fi

# Create manifest content
MANIFEST=$(cat <<EOF
{
  "name": "$HOST_NAME",
  "description": "Stash Password Manager Native Messaging Host",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXT_ID/"
  ]
}
EOF
)

# Install for Chrome
CHROME_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
mkdir -p "$CHROME_DIR"
echo "$MANIFEST" > "$CHROME_DIR/$HOST_NAME.json"
echo "✅ Installed for Chrome: $CHROME_DIR/$HOST_NAME.json"

# Install for Chromium
CHROMIUM_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
mkdir -p "$CHROMIUM_DIR"
echo "$MANIFEST" > "$CHROMIUM_DIR/$HOST_NAME.json"
echo "✅ Installed for Chromium: $CHROMIUM_DIR/$HOST_NAME.json"

# Make host executable
chmod +x "$HOST_PATH"
echo "✅ Made native host executable: $HOST_PATH"

echo ""
echo "🎉 Native messaging host installed successfully!"
echo "   Restart Chrome for changes to take effect."
