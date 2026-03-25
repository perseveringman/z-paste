#!/bin/bash
HOST_NAME="com.zpaste.stash"

rm -f "$HOME/Library/Google/Chrome/NativeMessagingHosts/$HOST_NAME.json"
rm -f "$HOME/Library/Application Support/Chromium/NativeMessagingHosts/$HOST_NAME.json"

echo "✅ Native messaging host uninstalled."
