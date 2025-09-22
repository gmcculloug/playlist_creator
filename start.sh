#!/bin/bash

echo "🎸 Starting Playlist Creator"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm 11.6 or higher."
    exit 1
fi

# Start the application
echo "🚀 Starting the application..."
echo ""
npm run dev
