#!/usr/bin/env bash
set -euo pipefail
TOKEN="${1:-${TOKEN:-}}"
[[ -z "$TOKEN" ]] && { echo "Usage: TOKEN=<token> $0"; exit 1; }
PORT="${PORT:-4010}"
BASE_URL="http://127.0.0.1:${PORT}"

cleanup(){ [[ -n "${PID:-}" ]] && kill "$PID" >/dev/null 2>&1 || true; [[ -n "${PID:-}" ]] && wait "$PID" 2>/dev/null || true; }
trap cleanup EXIT

cd "$(dirname "$0")/.."
npm run build >/dev/null
PORT="$PORT" NODE_ENV=dev ENABLE_DB_ON_BOOT=false ENABLE_REDIS_ON_BOOT=false node dist/src/server.js >/tmp/pomofocus2-smoke.log 2>&1 & PID=$!
sleep 2

call(){
  curl -sS -X POST "${BASE_URL}/graphql" -H "Content-Type: application/json" -H "Authorization: Bearer ${TOKEN}" -d "$1"
}

echo "[1] getSettings"
R1=$(call '{"query":"query { getSettings { focusMinutes shortBreakMinutes longBreakMinutes longBreakInterval } }"}'); echo "$R1"

echo "[2] startSession without taskId"
R2=$(call '{"query":"mutation { startSession(input:{idempotencyKey:\"idem-smoke-1\",taskId:null}){ id } }"}'); echo "$R2"

echo "[3] createTask"
R3=$(call '{"query":"mutation { createTask(input:{title:\"smoke-task\",estimatedPomodoros:1,idempotencyKey:\"idem-smoke-2\"}){ id title status } }"}'); echo "$R3"
TASK_ID=$(echo "$R3" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s)?.data?.createTask?.id||"")}catch{console.log("")}})')
[[ -z "$TASK_ID" ]] && { echo "[WARN] createTask failed"; exit 0; }

echo "[4] startSession with taskId"
R4=$(call "{\"query\":\"mutation { startSession(input:{idempotencyKey:\\\"idem-smoke-3\\\",taskId:\\\"$TASK_ID\\\"}){ id mode running remainingSeconds } }\"}"); echo "$R4"
SESSION_ID=$(echo "$R4" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s)?.data?.startSession?.id||"")}catch{console.log("")}})')

if [[ -n "$SESSION_ID" ]]; then
  echo "[5] getSessionState"
  R5=$(call "{\"query\":\"query { getSessionState(taskId:\\\"$TASK_ID\\\"){ id taskId mode running remainingSeconds restorable } }\"}"); echo "$R5"
  echo "[6] resetSession"
  R6=$(call "{\"query\":\"mutation { resetSession(input:{idempotencyKey:\\\"idem-smoke-4\\\",sessionId:\\\"$SESSION_ID\\\"}){ id mode running remainingSeconds version } }\"}"); echo "$R6"
  echo "[7] completeFocusCycle"
  R7=$(call "{\"query\":\"mutation { completeFocusCycle(input:{idempotencyKey:\\\"idem-smoke-5\\\",sessionId:\\\"$SESSION_ID\\\"}){ session { id mode running remainingSeconds } } }\"}"); echo "$R7"
  echo "[8] skipBreak"
  R8=$(call "{\"query\":\"mutation { skipBreak(input:{idempotencyKey:\\\"idem-smoke-6\\\",sessionId:\\\"$SESSION_ID\\\"}){ id mode running remainingSeconds } }\"}"); echo "$R8"
fi
