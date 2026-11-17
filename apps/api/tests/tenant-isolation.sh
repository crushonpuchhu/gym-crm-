#!/usr/bin/env bash
# Tenant isolation verification: brand B must not read or modify brand A records.
# Requires: API on localhost:4000, seeded dev database.
set -euo pipefail

API="${API_URL:-localhost:4000}/api/v1"
J1="$(mktemp)"; J2="$(mktemp)"
trap 'rm -f "$J1" "$J2"' EXIT

curl -s -c "$J1" -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"email":"owner@demo.com","password":"password123"}' > /dev/null
ORG_A_TOKEN="$(curl -s -b "$J1" -X POST "$API/auth/refresh" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["accessToken"])')"

RAND="$RANDOM$RANDOM"
curl -s -c "$J2" -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"iso-test-${RAND}@example.com\",\"password\":\"password123\",\"name\":\"Iso Test\",\"organizationName\":\"Iso Gym ${RAND}\"}" > /dev/null
ORG_B_TOKEN="$(curl -s -b "$J2" -X POST "$API/auth/refresh" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["accessToken"])')"

COUNT_A="$(curl -s "$API/prospects?limit=100" -H "Authorization: Bearer $ORG_A_TOKEN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["total"])')"
COUNT_B="$(curl -s "$API/prospects?limit=100" -H "Authorization: Bearer $ORG_B_TOKEN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["total"])')"

MEMBER_A="$(curl -s "$API/members?limit=1" -H "Authorization: Bearer $ORG_A_TOKEN" | python3 -c 'import json,sys; items=json.load(sys.stdin)["data"]["items"]; print(items[0]["id"] if items else "")')"
MEMBERSHIP_ID="$(curl -s "$API/memberships?limit=1" -H "Authorization: Bearer $ORG_A_TOKEN" | python3 -c 'import json,sys; items=json.load(sys.stdin)["data"]["items"]; print(items[0]["id"] if items else "")')"

echo "brand A prospects: $COUNT_A | brand B prospects visible: $COUNT_B"
[ "$COUNT_B" -eq 0 ] || { echo "FAIL: brand B sees brand A prospects"; exit 1; }

if [ -n "$MEMBERSHIP_ID" ]; then
  CROSS="$(curl -s "$API/memberships/$MEMBERSHIP_ID" -H "Authorization: Bearer $ORG_B_TOKEN" | python3 -c 'import json,sys; print(json.load(sys.stdin)["success"])')"
  [ "$CROSS" = "False" ] || { echo "FAIL: cross-tenant membership read succeeded"; exit 1; }
  echo "cross-tenant membership read blocked ✓"
fi

if [ -n "$MEMBER_A" ]; then
  CROSS_CHECKIN="$(curl -s -X POST "$API/checkins" -H "Authorization: Bearer $ORG_B_TOKEN" -H 'Content-Type: application/json' -d "{\"memberId\":\"$MEMBER_A\"}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["success"])')"
  [ "$CROSS_CHECKIN" = "False" ] || { echo "FAIL: cross-tenant check-in succeeded"; exit 1; }
  echo "cross-tenant check-in blocked ✓"
fi
echo "tenant isolation PASS"
