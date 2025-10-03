#!/bin/bash

SESSION_ID="sess_1759505889913_6jnfv6o65"

echo "Test 1: Avec guillemets simples"
curl -X POST "http://localhost:3000/api/netflix/page/goToPlan?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"buttonSelector": "button[data-uia=\"cta-button\"]"}' 2>/dev/null | jq -r '.debug.selector // .message' | head -1

echo ""
echo "Test 2: Sans échappement dans le JSON"
curl -X POST "http://localhost:3000/api/netflix/page/goToPlan?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d "{\"buttonSelector\": \"button[data-uia='cta-button']\"}" 2>/dev/null | jq -r '.debug.selector // .message' | head -1

echo ""
echo "Test 3: Via query parameter"
curl -X POST "http://localhost:3000/api/netflix/page/goToPlan?sessionId=$SESSION_ID&buttonSelector=button%5Bdata-uia%3D%22cta-button%22%5D" 2>/dev/null | jq -r '.debug.selector // .message' | head -1

