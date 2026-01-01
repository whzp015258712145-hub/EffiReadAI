#!/bin/bash

# Navigate to the project root
cd "$(dirname "$0")"

echo "========================================"
echo "  EffiReadAI Bootloader"
echo "========================================"

# 1. Clean up old processes to prevent port conflicts
echo "Cleaning up old processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null

# 2. Start Backend
echo "Starting Backend Server (3000)..."
cd server
node index.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 3. Start Frontend
echo "Starting Frontend (5173)..."
cd client
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Function to kill processes on exit
cleanup() {
    echo ""
    echo "Stopping EffiReadAI..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT

echo "Waiting for initialization..."
sleep 4

# 4. Final verification
if ! lsof -i:3000 > /dev/null; then
    echo "❌ ERROR: Backend (3000) failed to start."
    echo "Check backend.log:"
    cat backend.log
    exit 1
fi

echo "✅ All systems go!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# 5. Open Browser
# Force 5173 if possible, or just open 5173 (Vite will likely get it now after cleanup)
open "http://localhost:5173"

echo "========================================"
echo "  EffiReadAI is running at http://localhost:5173"
echo "  Close this window or press Ctrl+C to stop."
echo "========================================"

wait
