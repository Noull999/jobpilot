#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugNetworkCalls() {
  console.log('=== DEBUGGING FRONTEND NETWORK CALLS ===\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Capture all API requests and responses
    const apiCalls = [];
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Error')) {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/')) {
        try {
          const text = await response.text();
          apiCalls.push({
            method: response.request().method(),
            url,
            status: response.status(),
            responseSize: text.length,
            responsePreview: text.substring(0, 200)
          });
        } catch (e) {
          apiCalls.push({
            method: response.request().method(),
            url,
            status: response.status(),
            error: 'Could not read response'
          });
        }
      }
    });

    console.log('1. Logging in...');
    await page.goto('http://localhost:5188/login', { waitUntil: 'networkidle2' });

    await page.type('input[type="email"]', 'test.features@jobpilot.com', { delay: 10 });
    await page.type('input[type="password"]', 'TestPassword123!', { delay: 10 });

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b =>
        b.textContent.includes('Ingresar') ||
        b.textContent.includes('Login') ||
        b.textContent.toLowerCase().includes('ingresar')
      );
      if (btn) {
        btn.click();
      } else {
        const firstBtn = buttons.find(b => b.textContent.trim().length > 0);
        if (firstBtn) firstBtn.click();
      }
    });

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      console.log('✓ Login successful\n');
    } catch (e) {
      console.log('⚠ Navigation timeout\n');
    }

    // Clear the API calls log from login
    const loginApiCalls = [...apiCalls];
    apiCalls.length = 0;

    console.log('2. Navigating to dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    console.log('✓ Dashboard loaded\n');

    console.log('3. Skipping onboarding...');
    const onboardingExists = await page.evaluate(() => {
      return document.body.innerText.includes('Bienvenido a JobPilot');
    });

    if (onboardingExists) {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Explorar'));
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 2000));
      console.log('✓ Onboarding skipped\n');
    }

    console.log('4. Waiting for dashboard to fully load...');
    await new Promise(r => setTimeout(r, 3000));
    console.log('✓ Dashboard should be fully loaded\n');

    console.log('5. Checking for JavaScript Errors...');
    await new Promise(r => setTimeout(r, 1000));
    if (consoleErrors.length > 0) {
      console.log('   Found errors:');
      consoleErrors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log('   No console errors detected\n');
    }

    console.log('6. API Calls Made During Dashboard Load:\n');
    apiCalls.forEach((call, idx) => {
      console.log(`${idx + 1}. ${call.method} ${call.status} - ${call.url}`);
      if (call.responsePreview && call.responsePreview.length > 0) {
        console.log(`   Response: ${call.responsePreview.substring(0, 100)}...`);
      }
      if (call.error) {
        console.log(`   Error: ${call.error}`);
      }
      console.log('');
    });

    console.log('7. Checking Frontend Job Matches State...');
    const frontendState = await page.evaluate(() => {
      const text = document.body.innerText;
      // Extract job count from the page
      const jobCountMatch = text.match(/(\d+)\s*(?:Empleos Recomendados|job)/i);
      const jobCount = jobCountMatch ? jobCountMatch[1] : 'unknown';

      return {
        pageURL: window.location.href,
        jobsShowing: document.querySelectorAll('[class*="job"]').length > 0,
        hasJobSection: text.toLowerCase().includes('empleos recomendados'),
        jobCountText: text.match(/(\d+)(?:\s+job|\s+emple)/i)?.[1] || 'not found'
      };
    });

    console.log('Frontend State:');
    console.log(JSON.stringify(frontendState, null, 2));
    console.log('');

    console.log('8. Checking localStorage...');
    const localStorageData = await page.evaluate(() => {
      return {
        hasToken: !!localStorage.getItem('access_token'),
        tokenLength: localStorage.getItem('access_token')?.length || 0,
        onboardingCompleted: localStorage.getItem('onboarding-completed')
      };
    });
    console.log('localStorage Data:');
    console.log(JSON.stringify(localStorageData, null, 2));

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
  } finally {
    if (browser) await browser.close();
  }
}

debugNetworkCalls().catch(console.error);
