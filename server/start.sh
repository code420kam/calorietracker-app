#!/bin/bash
# Stabiler Server-Start mit disown
cd /home/kamil/CalorieTracker
node server/index.cjs &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
disown $SERVER_PID
sleep 2
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "Server laeuft auf Port 3001"
else
    echo "Server-Prozess beendet, Exit-Code: $?"
fi
