#!/usr/bin/env node

const http = require('http');

function makeRequest(method, url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testLogin() {
  try {
    console.log('Testing login...\n');

    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    console.log('Login Response:');
    console.log(`Status: ${loginRes.status}`);
    console.log(`Headers:`, loginRes.headers);
    console.log(`Body:`, JSON.stringify(loginRes.body, null, 2));

    if (loginRes.body.access_token) {
      console.log('\n✓ Token obtained successfully');
      console.log(`Token: ${loginRes.body.access_token.substring(0, 50)}...`);
    } else {
      console.log('\n❌ No token in response');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
