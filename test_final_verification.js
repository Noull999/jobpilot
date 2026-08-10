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
      headers: { 'Content-Type': 'application/json' }
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

async function testFinal() {
  console.log('=== FINAL VERIFICATION TEST ===\n');

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

    console.log('1. Navigating to dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    console.log('✓ Dashboard loaded\n');

    console.log('2. Clicking "Explorar después" button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
      if (btn) btn.click();
    });
    console.log('✓ Button clicked\n');

    // Wait for state updates and re-renders
    await new Promise(r => setTimeout(r, 3000));

    console.log('3. Checking final state...');
    const finalState = await page.evaluate(() => {
      // Check if the onboarding modal container is visible
      const overlayBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/60');
      const onboardingContainer = Array.from(document.querySelectorAll('.fixed')).find(el =>
        el.textContent.includes('Bienvenido a JobPilot') &&
        el.querySelector('button:nth-child(2)')?.textContent.includes('Explorar después')
      );

      // Check for dashboard elements
      const dashboardElements = document.querySelectorAll('main');
      const jobLinks = document.querySelectorAll('a[href*="/jobs/"]');
      const employmentSection = Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent.includes('Empleos recomendados')
      );

      return {
        onboardingModalVisible: !!onboardingContainer,
        overlayVisible: !!overlayBackdrop,
        hasDashboard: dashboardElements.length > 0,
        jobLinksCount: jobLinks.length,
        hasEmploymentSection: !!employmentSection,
        currentPath: window.location.pathname,
        onboardingCompleted: localStorage.getItem('onboarding-completed')
      };
    });

    console.log('State After Button Click:');
    console.log(`  Onboarding Modal Visible: ${finalState.onboardingModalVisible}`);
    console.log(`  Overlay Visible: ${finalState.overlayVisible}`);
    console.log(`  Dashboard Present: ${finalState.hasDashboard}`);
    console.log(`  Job Links Found: ${finalState.jobLinksCount}`);
    console.log(`  Employment Section: ${finalState.hasEmploymentSection}`);
    console.log(`  Onboarding Completed Flag: ${finalState.onboardingCompleted}`);
    console.log('');

    // Test clicking a job link
    if (finalState.jobLinksCount > 0) {
      console.log('4. Testing job link navigation...');

      const jobLinkData = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/jobs/"]');
        if (links.length > 0) {
          return {
            href: links[0].href,
            text: links[0].textContent.substring(0, 50)
          };
        }
        return null;
      });

      if (jobLinkData) {
        console.log(`   First job link: "${jobLinkData.text}"`);
        console.log(`   URL: ${jobLinkData.href}\n`);

        // Click the job link
        await page.evaluate(() => {
          const links = document.querySelectorAll('a[href*="/jobs/"]');
          if (links.length > 0) {
            links[0].click();
          }
        });

        // Wait for navigation
        await new Promise(r => setTimeout(r, 2000));

        const jobDetailState = await page.evaluate(() => {
          const text = document.body.innerText;
          return {
            currentPath: window.location.pathname,
            currentURL: window.location.href,
            hasJobDetail: text.includes('Compatibilidad') || text.includes('Skills') || text.includes('Empresa'),
            hasError: text.includes('Error') || text.includes('404'),
            textPreview: text.substring(0, 200)
          };
        });

        console.log('   After clicking job link:');
        console.log(`   Current URL: ${jobDetailState.currentURL}`);
        console.log(`   Has job detail content: ${jobDetailState.hasJobDetail}`);
        console.log(`   Has error: ${jobDetailState.hasError}`);
      }
    }

    console.log('\n=== SUMMARY ===');
    const success = finalState.jobLinksCount > 0 && !finalState.onboardingModalVisible;
    if (success) {
      console.log('✓ VERIFICATION PASSED');
      console.log('  - Onboarding modal successfully skipped');
      console.log('  - Jobs are rendering as clickable links');
      console.log('  - Complete flow is working correctly');
    } else {
      console.log('❌ VERIFICATION FAILED');
      if (finalState.onboardingModalVisible) {
        console.log('  - Onboarding modal is still showing');
      }
      if (finalState.jobLinksCount === 0) {
        console.log('  - No job links found');
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
  } finally {
    if (browser) await browser.close();
  }
}

testFinal().catch(console.error);
