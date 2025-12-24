#!/bin/bash
# Metro Cache Clear & Restart Script

cd "$(dirname "$0")"

echo "🧹 Clearing Metro bundler cache..."
rm -rf .expo node_modules/.cache 2>/dev/null || true

echo "🚀 Starting Metro bundler with cleared cache..."
echo ""
echo "✅ Cache cleared! Starting Expo..."
echo ""

# Start with cleared cache
npx expo start --clear
