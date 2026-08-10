#!/usr/bin/env node

const puppeteer = require('puppeteer');
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
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testDashboard() {
  console.log('=== DASHBOARD TEST WITH CONSOLE LOGS ===\n');

  let browser;
  try {
    // Step 1: Get token from API
    console.log('1. Getting authentication token...');
    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    if (!loginRes.access_token) {
      console.error('❌ Failed to get token');
      return;
    }

    const token = loginRes.access_token;
    console.log(`✓ Token obtained\n`);

    // Step 2: Open browser and set token
    console.log('2. Opening browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG]') || msg.type() === 'error') {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Set the token in localStorage before navigating
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
      localStorage.removeItem('onboarding-completed');
    }, token);

    console.log('✓ Browser opened\n');

    // Step 3: Navigate to dashboard
    console.log('3. Navigating to dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('✓ Dashboard page loaded\n');

    // Wait for initial render
    await new Promise(r => setTimeout(r, 2000));

    // Step 4: Check console logs and page state
    console.log('4. Current console logs:');
    consoleLogs.forEach(log => console.log('   ' + log));
    console.log('');

    // Step 5: Click the button
    console.log('5. Clicking "Explorar después" button...');
    const buttonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');

      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!buttonClicked) {
      console.log('❌ Button not found\n');
    } else {
      console.log('✓ Button clicked\n');
    }

    // Wait for state updates
    await new Promise(r => setTimeout(r, 2000));

    // Step 6: Check logs again
    console.log('6. Console logs after button click:');
    consoleLogs.forEach(log => console.log('   ' + log));
    console.log('');

    // Step 7: Check final state
    const finalState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasOnboarding: text.includes('Bienvenido a JobPilot'),
        jobLinksCount: document.querySelectorAll('a[href*="/jobs/"]').length,
        hasJobs: text.includes('Empleos') && text.includes('matches')
      };
    });

    console.log('7. Final State:');
    console.log(`   Modal visible: ${finalState.hasOnboarding}`);
    console.log(`   Job links: ${finalState.jobLinksCount}`);
    console.log(`   Has jobs section: ${finalState.hasJobs}\n`);

    if (finalState.jobLinksCount > 0) {
      console.log('✓ SUCCESS: Jobs are rendering!');
    } else {
      console.log('❌ FAILURE: Jobs are not rendering');
    }

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
  } finally {
    if (browser) await browser.close();
  }
}

testDashboard().catch(console.error);
