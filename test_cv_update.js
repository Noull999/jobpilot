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
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
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

async function testCVUpdate() {
  console.log('=== TEST: CV UPDATE API ===\n');

  try {
    // Login
    console.log('1. Logging in...');
    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    console.log('Login response:', JSON.stringify(loginRes.body, null, 2));
    const token = loginRes.body.access_token;

    if (!token) {
      console.error('❌ No token received');
      return;
    }

    // Get current CV
    console.log('\n2. Getting current CV...');
    const cvRes = await makeRequest('GET', 'http://localhost:5000/api/cv/current', null, {
      Authorization: `Bearer ${token}`
    });

    console.log('CV response status:', cvRes.status);
    console.log('CV response:', JSON.stringify(cvRes.body, null, 2));

    if (!cvRes.body.cv) {
      console.error('❌ No CV returned');
      return;
    }

    const cvId = cvRes.body.cv.id;
    console.log(`✓ CV ID: ${cvId}`);
    console.log(`✓ Current experience_years: ${cvRes.body.cv.experience_years}`);

    // Update CV
    console.log('\n3. Updating CV with experience_years = 1...');
    const updateRes = await makeRequest('PUT', `http://localhost:5000/api/cv/update/${cvId}`, {
      experience_years: 1
    }, {
      Authorization: `Bearer ${token}`
    });

    console.log('Update response status:', updateRes.status);
    console.log('Update response:', JSON.stringify(updateRes.body, null, 2));

    if (updateRes.status === 200) {
      console.log(`✓ Update successful!`);
      console.log(`✓ New experience_years: ${updateRes.body.cv?.experience_years}`);
    } else {
      console.error(`❌ Update failed with status ${updateRes.status}`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

testCVUpdate();
