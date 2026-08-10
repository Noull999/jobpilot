#!/usr/bin/env node

const puppeteer = require('puppeteer');
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

async function testApplicationsUI() {
  console.log('=== TEST: APPLICATIONS DISPLAY IN UI ===\n');

  let browser;
  try {
    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    const token = loginRes.body.access_token;

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set token
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
      localStorage.removeItem('onboarding-completed');
    }, token);

    console.log('1. Loading dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    console.log('2. Closing onboarding modal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('3. Clicking "Postulaciones" button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Postulaciones'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('4. Checking if applications are displayed...');
    const appDetails = await page.evaluate(() => {
      const pageText = document.body.innerText;

      // Check for the section title
      const hasTitle = pageText.includes('Seguimiento de Postulaciones');

      // Check for application entries
      const jobIdMatches = pageText.match(/Empleo ID:\s*(\d+)/g) || [];
      const statusMatches = pageText.match(/Pendiente|Aceptada|Rechazada/g) || [];
      const dateMatches = pageText.match(/Aplicada:\s*\d+\s+de\s+\w+\s+de\s+\d+/g) || [];

      // Check for empty state message
      const hasEmptyState = pageText.includes('Aún no has registrado postulaciones');

      return {
        hasTitle,
        jobIdMatches: jobIdMatches.length,
        statusMatches: statusMatches.length,
        dateMatches: dateMatches.length,
        hasEmptyState,
        hasSomeApplications: jobIdMatches.length > 0,
        pageText: pageText.substring(0, 1000)
      };
    });

    console.log(`✓ Has "Seguimiento" title: ${appDetails.hasTitle ? 'YES' : 'NO'}`);
    console.log(`✓ Found job IDs: ${appDetails.jobIdMatches}`);
    console.log(`✓ Found status badges: ${appDetails.statusMatches}`);
    console.log(`✓ Found dates: ${appDetails.dateMatches}`);
    console.log(`✓ Has empty state: ${appDetails.hasEmptyState ? 'YES' : 'NO'}`);
    console.log(`✓ Has applications displayed: ${appDetails.hasSomeApplications ? 'YES ✓' : 'NO ❌'}\n`);

    if (appDetails.hasSomeApplications) {
      console.log('✓✓✓ APPLICATIONS ARE DISPLAYING CORRECTLY ✓✓✓');
    } else {
      console.log('❌ Applications are NOT displaying in UI');
      console.log('Page text sample:');
      console.log(appDetails.pageText);
    }

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) await browser.close();
  }
}

testApplicationsUI().catch(console.error);
