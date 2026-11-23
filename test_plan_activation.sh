#!/bin/bash
BASE_URL="http://localhost:3000/api/plan-activation"

echo -e "\n=== 1. POST / (Create Activation) ==="
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL" -H "Content-Type: application/json" -d '{
  "userId": "curl_test_user_123",
  "planNetflix": "premium",
  "amount": 25000,
  "statut": "pending",
  "reqteStatusSuccess": "success",
  "numeroOM": "237699000000",
  "email": "test@example.com",
  "typePaiement": "orange_money",
  "dureeActivation": 30,
  "dateExpiration": "2026-04-19T00:00:00.000Z"
}')
echo "Response: $CREATE_RESPONSE"
ACTIVATION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.planActivationId // .data.id')

if [ "$ACTIVATION_ID" == "null" ] || [ -z "$ACTIVATION_ID" ]; then
    echo "Failed to extract ID. Cannot proceed with specific tests."
    exit 1
fi
echo "Created Activation ID: $ACTIVATION_ID"

echo -e "\n=== 2. GET / (Get All with Params) ==="
curl -s -X GET "$BASE_URL?limit=5&offset=0&statut=pending" | jq .

echo -e "\n=== 3. GET /:id (Get by ID) ==="
curl -s -X GET "$BASE_URL/$ACTIVATION_ID" | jq .

echo -e "\n=== 4. PUT /:id (Update Activation) ==="
curl -s -X PUT "$BASE_URL/$ACTIVATION_ID" -H "Content-Type: application/json" -d '{
  "planType": "standard",
  "status": "active"
}' | jq .

echo -e "\n=== 5. PUT /:id/status (Change Status) ==="
curl -s -X PUT "$BASE_URL/$ACTIVATION_ID/status" -H "Content-Type: application/json" -d '{
  "status": "completed"
}' | jq .

echo -e "\n=== 6. PUT /:id/period (Update Period) ==="
curl -s -X PUT "$BASE_URL/$ACTIVATION_ID/period" -H "Content-Type: application/json" -d '{
  "dureePlan": 60,
  "joursMarge": 5,
  "dateFin": "2026-05-19T00:00:00.000Z"
}' | jq .

echo -e "\n=== 7. GET /user/:userId (Get by User ID) ==="
curl -s -X GET "$BASE_URL/user/curl_test_user_123" | jq .

echo -e "\n=== 8. DELETE /:id (Delete Activation) ==="
curl -s -X DELETE "$BASE_URL/$ACTIVATION_ID" | jq .
