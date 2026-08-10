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
  console.log('=== DIRECT DASHBOARD TEST ===\n');

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
    console.log(`✓ Token obtained: ${token.substring(0, 40)}...\n`);

    // Step 2: Open browser and set token
    console.log('2. Opening browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set the token in localStorage before navigating
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
      // Clear the onboarding-completed flag to test the onboarding flow
      localStorage.removeItem('onboarding-completed');
    }, token);

    console.log('✓ Browser opened and token set\n');

    // Step 3: Navigate to dashboard
    console.log('3. Navigating to dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('✓ Dashboard page loaded\n');

    // Step 4: Wait for page content
    await new Promise(r => setTimeout(r, 2000));

    // Step 5: Check page state
    console.log('4. Checking page state...');
    const pageState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasOnboarding: text.includes('Bienvenido a JobPilot'),
        hasDashboard: text.includes('Dashboard') || text.includes('dashboard'),
        hasJobs: text.includes('Empleos') || text.includes('empleos'),
        jobCount: (text.match(/(\d+)\s*(?:empleos|matches)/i) || [null, 'unknown'])[1],
        currentPath: window.location.pathname,
        currentURL: window.location.href,
        localStorageToken: !!localStorage.getItem('access_token'),
        onboardingCompleted: localStorage.getItem('onboarding-completed'),
        textPreview: text.substring(0, 300)
      };
    });

    console.log('Page State:');
    console.log(`  Current URL: ${pageState.currentURL}`);
    console.log(`  Has Onboarding Modal: ${pageState.hasOnboarding}`);
    console.log(`  Has Dashboard Content: ${pageState.hasDashboard}`);
    console.log(`  Has Jobs Section: ${pageState.hasJobs}`);
    console.log(`  Job Count: ${pageState.jobCount}`);
    console.log(`  Token in localStorage: ${pageState.localStorageToken}`);
    console.log(`  Onboarding Completed: ${pageState.onboardingCompleted}\n`);

    // Step 6: If onboarding modal exists, click the button
    if (pageState.hasOnboarding) {
      console.log('5. Onboarding modal detected, clicking "Explorar después"...');

      const buttonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');

        if (btn) {
          console.log('Button found, clicking...');
          btn.click();
          return true;
        }

        console.log('Button not found. Available buttons:');
        buttons.forEach((b, idx) => {
          const text = b.textContent.trim();
          if (text) console.log(`  ${idx}: "${text}"`);
        });
        return false;
      });

      if (!buttonClicked) {
        console.log('❌ Could not click button\n');
      } else {
        console.log('✓ Button clicked\n');

        // Wait for dashboard to load after clicking
        console.log('6. Waiting for dashboard to load...');
        await new Promise(r => setTimeout(r, 2000));

        // Check if modal is gone
        const modalGone = await page.evaluate(() => {
          return !document.body.innerText.includes('Bienvenido a JobPilot');
        });

        if (modalGone) {
          console.log('✓ Modal closed\n');
        } else {
          console.log('⚠ Modal still visible\n');
        }
      }
    }

    // Step 7: Check for jobs
    console.log('7. Checking for jobs...');
    const jobsStatus = await page.evaluate(() => {
      const jobLinks = document.querySelectorAll('a[href*="/jobs/"]');
      const text = document.body.innerText;

      return {
        jobLinksCount: jobLinks.length,
        jobLinks: Array.from(jobLinks).slice(0, 3).map(link => ({
          text: link.textContent.trim().substring(0, 50),
          href: link.href
        })),
        hasText: {
          'empleos': text.includes('Empleos') || text.includes('empleos'),
          'matches': text.includes('matches'),
          'recomendados': text.includes('Recomendados'),
          'jobTitles': text.includes('Ingeniero') || text.includes('Developer')
        }
      };
    });

    console.log(`Job Links Found: ${jobsStatus.jobLinksCount}`);
    console.log('Has Text:');
    Object.entries(jobsStatus.hasText).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    if (jobsStatus.jobLinksCount > 0) {
      console.log('\n✓ Jobs rendered as links!');
      jobsStatus.jobLinks.forEach((job, idx) => {
        console.log(`  ${idx + 1}. ${job.text}`);
        console.log(`     → ${job.href}`);
      });
    } else {
      console.log('\n❌ No job links found');
    }

    console.log('\n=== SUMMARY ===');
    console.log(`✓ Login: Working`);
    console.log(`✓ Navigation: Working`);
    console.log(`Jobs Rendering: ${jobsStatus.jobLinksCount > 0 ? '✓ Working' : '❌ Broken'}`);

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
  } finally {
    if (browser) await browser.close();
  }
}

testDashboard().catch(console.error);
