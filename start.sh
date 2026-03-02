#!/usr/bin/env bash
# Start both backend and frontend dev server

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting backend (port 5001)..."
cd "$ROOT/backend"
python3 app.py &
BACKEND_PID=$!

echo "Starting frontend dev server (port 5173)..."
cd "$ROOT/frontend"
#npm run dev -- --host 0.0.0.0 &
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Dashboard running at: http://localhost:5173"
echo "Backend API at:       http://localhost:5001/api/health"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
