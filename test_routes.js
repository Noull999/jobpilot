#!/usr/bin/env node

const http = require('http');

function makeRequest(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testRoutes() {
  console.log('=== TESTING CV ROUTES ===\n');

  try {
    // Login first
    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    const token = loginRes.body.access_token;
    console.log('✓ Token obtained\n');

    // Test GET /api/cv/current - should work
    console.log('Testing GET /api/cv/current...');
    const getCurrentRes = await makeRequest('GET', 'http://localhost:5000/api/cv/current', null, {
      Authorization: `Bearer ${token}`
    });
    console.log(`Status: ${getCurrentRes.status}`);
    if (getCurrentRes.status === 200) {
      console.log('✓ GET /api/cv/current works');
      const cvId = getCurrentRes.body.cv?.id;
      console.log(`CV ID: ${cvId}\n`);

      // Test PUT /api/cv/update/<id>
      if (cvId) {
        console.log(`Testing PUT /api/cv/update/${cvId}...`);
        const updateRes = await makeRequest('PUT', `http://localhost:5000/api/cv/update/${cvId}`, {
          experience_years: 2
        }, {
          Authorization: `Bearer ${token}`
        });
        console.log(`Status: ${updateRes.status}`);
        console.log(`Response:`, JSON.stringify(updateRes.body, null, 2));
      }
    } else {
      console.log(`❌ Status: ${getCurrentRes.status}`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

testRoutes();
