#!/bin/bash
# Test Agent API Endpoints

API_URL="http://localhost:4000"

echo "=================================="
echo "🧪 Testing Agent API Endpoints"
echo "=================================="
echo ""

# Check if server is running
echo "1️⃣  Checking if server is running..."
if ! curl -s "$API_URL/health" > /dev/null; then
    echo "❌ Server is not running on port 4000"
    echo ""
    echo "Start the backend first with:"
    echo "  cd apps/backend"
    echo "  pnpm dev"
    echo ""
    exit 1
fi
echo "✅ Server is running"
echo ""

# Test 1: List all agents
echo "2️⃣  GET /v1/agents - List all agents"
echo "Request: curl $API_URL/v1/agents"
curl -s "$API_URL/v1/agents" | jq '.'
echo ""
echo "---"
echo ""

# Test 2: Get specific agent
echo "3️⃣  GET /v1/agents/:agentId - Get agent info"
echo "Request: curl $API_URL/v1/agents/agent-demo-001"
curl -s "$API_URL/v1/agents/agent-demo-001" | jq '.'
echo ""
echo "---"
echo ""

# Test 3: Verify capabilities
echo "4️⃣  POST /v1/agents/:agentId/capabilities/verify - Verify capabilities"
echo "Request: curl -X POST $API_URL/v1/agents/agent-demo-001/capabilities/verify"
curl -s -X POST "$API_URL/v1/agents/agent-demo-001/capabilities/verify" \
  -H "Content-Type: application/json" \
  -d '{"required": ["payment", "validation"]}' | jq '.'
echo ""
echo "---"
echo ""

# Test 4: Check if can spend
echo "5️⃣  POST /v1/agents/:agentId/can-spend - Check budget"
echo "Request: curl -X POST $API_URL/v1/agents/agent-demo-001/can-spend"
curl -s -X POST "$API_URL/v1/agents/agent-demo-001/can-spend" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}' | jq '.'
echo ""
echo "---"
echo ""

# Test 5: Get leaderboard
echo "6️⃣  GET /v1/agents/leaderboard/top - Get top agents"
echo "Request: curl $API_URL/v1/agents/leaderboard/top?limit=5"
curl -s "$API_URL/v1/agents/leaderboard/top?limit=5" | jq '.'
echo ""
echo "---"
echo ""

# Test 6: Test with invalid agent
echo "7️⃣  GET /v1/agents/:agentId - Test with invalid agent (should return 404)"
echo "Request: curl $API_URL/v1/agents/non-existent-agent"
curl -s "$API_URL/v1/agents/non-existent-agent" | jq '.'
echo ""
echo "---"
echo ""

# Test 7: Test can-spend with large amount (should fail)
echo "8️⃣  POST /v1/agents/:agentId/can-spend - Test exceeding budget"
echo "Request: curl -X POST $API_URL/v1/agents/agent-demo-001/can-spend"
curl -s -X POST "$API_URL/v1/agents/agent-demo-001/can-spend" \
  -H "Content-Type: application/json" \
  -d '{"amount": 999999}' | jq '.'
echo ""
echo "---"
echo ""

echo "=================================="
echo "✅ All tests completed!"
echo "=================================="
