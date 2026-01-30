#!/usr/bin/env node
/**
 * Test Agent API Endpoints
 * Run: node scripts/test-endpoints.js
 */

const http = require('http');

const API_URL = 'http://localhost:4000';

// Helper to make HTTP requests
function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('==================================');
  console.log('🧪 Testing Agent API Endpoints');
  console.log('==================================\n');

  try {
    // Test 1: Health check
    console.log('1️⃣  GET /health');
    const health = await request('/health');
    console.log(`Status: ${health.status}`);
    console.log(JSON.stringify(health.data, null, 2));
    console.log('\n---\n');

    // Test 2: List all agents
    console.log('2️⃣  GET /v1/agents - List all agents');
    const allAgents = await request('/v1/agents');
    console.log(`Status: ${allAgents.status}`);
    console.log(JSON.stringify(allAgents.data, null, 2));
    console.log('\n---\n');

    // Test 3: Get specific agent
    console.log('3️⃣  GET /v1/agents/agent-demo-001 - Get agent info');
    const agent = await request('/v1/agents/agent-demo-001');
    console.log(`Status: ${agent.status}`);
    console.log(JSON.stringify(agent.data, null, 2));
    console.log('\n---\n');

    // Test 4: Verify capabilities
    console.log('4️⃣  POST /v1/agents/agent-demo-001/capabilities/verify');
    const capabilities = await request(
      '/v1/agents/agent-demo-001/capabilities/verify',
      'POST',
      { required: ['payment', 'validation'] }
    );
    console.log(`Status: ${capabilities.status}`);
    console.log(JSON.stringify(capabilities.data, null, 2));
    console.log('\n---\n');

    // Test 5: Check if can spend
    console.log('5️⃣  POST /v1/agents/agent-demo-001/can-spend - Check $100');
    const canSpend = await request(
      '/v1/agents/agent-demo-001/can-spend',
      'POST',
      { amount: 100 }
    );
    console.log(`Status: ${canSpend.status}`);
    console.log(JSON.stringify(canSpend.data, null, 2));
    console.log('\n---\n');

    // Test 6: Get leaderboard
    console.log('6️⃣  GET /v1/agents/leaderboard/top - Top agents');
    const leaderboard = await request('/v1/agents/leaderboard/top?limit=5');
    console.log(`Status: ${leaderboard.status}`);
    console.log(JSON.stringify(leaderboard.data, null, 2));
    console.log('\n---\n');

    // Test 7: Test with invalid agent (should return 404)
    console.log('7️⃣  GET /v1/agents/non-existent - Test 404');
    const notFound = await request('/v1/agents/non-existent-agent');
    console.log(`Status: ${notFound.status}`);
    console.log(JSON.stringify(notFound.data, null, 2));
    console.log('\n---\n');

    // Test 8: Test exceeding budget
    console.log('8️⃣  POST /v1/agents/agent-demo-001/can-spend - Exceeding budget');
    const exceedBudget = await request(
      '/v1/agents/agent-demo-001/can-spend',
      'POST',
      { amount: 999999 }
    );
    console.log(`Status: ${exceedBudget.status}`);
    console.log(JSON.stringify(exceedBudget.data, null, 2));
    console.log('\n---\n');

    console.log('==================================');
    console.log('✅ All tests completed!');
    console.log('==================================');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Backend is not running. Start it with: pnpm backend:dev');
    }
    process.exit(1);
  }
}

runTests();
