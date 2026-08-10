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

async function testAPI() {
  try {
    // Login
    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    const token = loginRes.body.access_token;
    console.log('✓ Token obtenido\n');

    // Get matches
    const matchesRes = await makeRequest('GET', 'http://localhost:5000/api/jobs/matches?limit=3', null, {
      Authorization: `Bearer ${token}`
    });

    console.log('=== RESPUESTA DEL API ===\n');
    console.log('Status:', matchesRes.status);
    console.log('\nMatches recibidos:');

    if (matchesRes.body.matches && matchesRes.body.matches.length > 0) {
      matchesRes.body.matches.forEach((match, idx) => {
        console.log(`\n${idx + 1}. Match ID: ${match.id}`);
        console.log(`   job_id: ${match.job_id} (tipo: ${typeof match.job_id})`);
        console.log(`   match_score: ${match.match_score}`);

        if (match.job) {
          console.log(`   Job Info:`);
          console.log(`     - id: ${match.job.id}`);
          console.log(`     - title: ${match.job.title}`);
          console.log(`     - company: ${match.job.company}`);
          console.log(`     - url: ${match.job.url}`);
          console.log(`     - source: ${match.job.source}`);
        }
      });

      // Show the first match structure
      console.log('\n\n=== ESTRUCTURA COMPLETA DEL PRIMER MATCH ===');
      console.log(JSON.stringify(matchesRes.body.matches[0], null, 2));
    } else {
      console.log('No hay matches disponibles');
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

testAPI().catch(console.error);
