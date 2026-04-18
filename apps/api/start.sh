#!/bin/sh
set -e

echo "=== AhmedabadCar API Startup Debug ==="
echo "Node version:"
node --version
echo ""

echo "Environment:"
echo "PORT=$PORT"
echo "NODE_ENV=$NODE_ENV"
echo ""

echo "Directory contents:"
ls -la /app/dist/ | head -20
echo ""

echo "Checking server.js..."
if [ -f /app/dist/server.js ]; then
  echo "✓ dist/server.js exists"
  echo "File size: $(wc -c < /app/dist/server.js) bytes"
else
  echo "❌ dist/server.js NOT FOUND"
  find /app -name "server.js" -type f
  exit 1
fi

echo ""
echo "Starting server..."
exec node /app/dist/server.js
