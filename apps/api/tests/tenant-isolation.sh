#!/usr/bin/env bash
# Tenant isolation verification: org B must not read or modify org A records.
# Requires: API on localhost:4000, seeded dev database.
set -euo pipefail

API="${API_URL:-localhost:4000}/api/v1"
J1="$(mktemp)"; J2="$(mktemp)"
trap 'rm -f "$J1" "$J2"' EXIT

curl -s -c "$J1" -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"email":"owner@demo.com","password":"password123"}' > /dev/null
ORG_A_TOKEN="$(curl -s -b "$J1" -X POST "$API/auth/refresh" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["accessToken"])')"

RAND="$RANDOM$RANDOM"
curl -s -c "$J2" -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"iso-test-${RAND}@example.com\",\"password\":\"password123\",\"name\":\"Iso Test\",\"organizationName\":\"Iso Org ${RAND}\"}" > /dev/null
ORG_B_TOKEN="$(curl -s -b "$J2" -X POST "$API/auth/refresh" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["accessToken"])')"

COUNT_A="$(curl -s "$API/leads?limit=100" -H "Authorization: Bearer $ORG_A_TOKEN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["total"])')"
COUNT_B="$(curl -s "$API/leads?limit=100" -H "Authorization: Bearer $ORG_B_TOKEN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["total"])')"

DEAL_ID="$(curl -s "$API/deals?limit=1" -H "Authorization: Bearer $ORG_A_TOKEN" | python3 -c 'import json,sys; items=json.load(sys.stdin)["data"]["items"]; print(items[0]["id"] if items else "")')"

echo "org A leads: $COUNT_A | org B leads visible: $COUNT_B"
[ "$COUNT_B" -eq 0 ] || { echo "FAIL: org B sees org A leads"; exit 1; }

if [ -n "$DEAL_ID" ]; then
  CROSS="$(curl -s "$API/deals/$DEAL_ID" -H "Authorization: Bearer $ORG_B_TOKEN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["success"])')"
  [ "$CROSS" = "False" ] || { echo "FAIL: cross-tenant deal read succeeded"; exit 1; }
  echo "cross-tenant deal read blocked ✓"
fi
echo "tenant isolation PASS"
