#!/usr/bin/env bash
# PowerTrack - Electricity Information Platform Launcher (macOS & Linux)

echo "========================================================"
echo "              ⚡ POWERTRACK APPLICATION"
echo "           \"Track Power. Stay Informed.\""
echo "========================================================"
echo "Starting local web and API server on port 8085..."
echo ""

# Open browser in background after small delay
(
  sleep 1
  if command -v open >/dev/null 2>&1; then
    open "http://localhost:8085/"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:8085/"
  fi
) &

# Run Node server
node server.js
