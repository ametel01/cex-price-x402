#!/bin/bash
# Stop the CEX Price API server

echo "🛑 Stopping server on port 8080..."

# Find and kill processes on port 8080
PIDS=$(lsof -ti:8080 2>/dev/null)

if [ -z "$PIDS" ]; then
  echo "✅ No server running on port 8080"
  exit 0
fi

# Try graceful shutdown first
echo "   Sending SIGTERM to processes: $PIDS"
echo $PIDS | xargs kill -TERM 2>/dev/null

# Wait for graceful shutdown
sleep 2

# Check if still running
REMAINING=$(lsof -ti:8080 2>/dev/null)
if [ -n "$REMAINING" ]; then
  echo "⚠️  Force killing remaining processes: $REMAINING"
  echo $REMAINING | xargs kill -9 2>/dev/null
  sleep 1
fi

# Final check
if lsof -ti:8080 &>/dev/null; then
  echo "❌ Failed to stop server"
  exit 1
else
  echo "✅ Server stopped successfully"
  exit 0
fi
