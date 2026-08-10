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
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testApplyDebug() {
  console.log('=== DEBUG: APPLICATIONS SECTION ===\n');

  let browser;
  try {
    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    const token = loginRes.access_token;

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
      localStorage.removeItem('onboarding-completed');
    }, token);

    // First load
    console.log('1. First dashboard load...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    console.log('✓ Loaded\n');

    // Go through job flow
    console.log('2. Closing onboarding and going to job...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));
      if (links.length > 0) links[0].click();
    });
    await new Promise(r => setTimeout(r, 2000));
    console.log('✓ Navigated to job detail\n');

    // Go back to dashboard
    console.log('3. Back to dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Check the page state
    const beforeClick = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasSeguimiento: text.includes('Seguimiento'),
        hasEmpleosRecomendados: text.includes('Empleos Recomendados'),
        hasDashboardTitle: text.includes('Dashboard') || text.includes('dashboard'),
        pageTitle: document.body.innerText.substring(0, 200)
      };
    });

    console.log('Before clicking Postulaciones:');
    console.log(`  - Has "Seguimiento": ${beforeClick.hasSeguimiento}`);
    console.log(`  - Has "Empleos Recomendados": ${beforeClick.hasEmpleosRecomendados}`);
    console.log(`  - Page snippet: ${beforeClick.pageTitle}\n`);

    // Click Postulaciones
    console.log('4. Clicking Postulaciones button...');
    const clickResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      console.log(`Total buttons on page: ${buttons.length}`);
      const btn = buttons.find(b => b.textContent.includes('Postulaciones'));
      console.log(`Found Postulaciones button: ${!!btn}`);
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`✓ Button clicked: ${clickResult}`);

    await new Promise(r => setTimeout(r, 2500));

    // Check after click
    const afterClick = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasSeguimiento: text.includes('Seguimiento'),
        hasEmpleosRecomendados: text.includes('Empleos Recomendados'),
        hasEmpleoid: text.includes('Empleo ID'),
        jobIdCount: (text.match(/Empleo ID:\s*\d+/gi) || []).length,
        pageSnippet: text.substring(200, 500)
      };
    });

    console.log('\nAfter clicking Postulaciones:');
    console.log(`  - Has "Seguimiento": ${afterClick.hasSeguimiento}`);
    console.log(`  - Has "Empleos Recomendados": ${afterClick.hasEmpleosRecomendados}`);
    console.log(`  - Has "Empleo ID": ${afterClick.hasEmpleoid}`);
    console.log(`  - Job ID count: ${afterClick.jobIdCount}`);
    console.log(`  - Page snippet: ${afterClick.pageSnippet}`);

    if (afterClick.hasSeguimiento && afterClick.jobIdCount > 0) {
      console.log('\n✓✓✓ SUCCESS: Applications are displaying! ✓✓✓');
    } else {
      console.log('\n❌ ISSUE: Applications not displaying');
    }

  } catch (error) {
    console.error('\nERROR:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

testApplyDebug().catch(console.error);
