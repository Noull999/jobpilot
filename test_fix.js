#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testFix() {
  console.log('=== TESTING ONBOARDING FIX ===\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Intercept all network requests to monitor data loading
    const apiCalls = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        apiCalls.push({
          url: url.substring(url.lastIndexOf('/api/')),
          status: response.status(),
          method: response.request().method()
        });
      }
    });

    console.log('1. Logging in...');
    await page.goto('http://localhost:5188/login', { waitUntil: 'networkidle2' });

    await page.type('input[type="email"]', 'test.features@jobpilot.com', { delay: 10 });
    await page.type('input[type="password"]', 'TestPassword123!', { delay: 10 });

    // Click login button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b =>
        b.textContent.includes('Ingresar') ||
        b.textContent.includes('Login')
      );
      if (btn) btn.click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    console.log('✓ Login successful\n');

    // Navigate to dashboard
    console.log('2. Navigating to dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    console.log('✓ Dashboard page loaded\n');

    // Check for onboarding modal
    console.log('3. Checking for onboarding modal...');
    const modalExists = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Bienvenido a JobPilot');
    });

    if (!modalExists) {
      console.log('   ⚠ No onboarding modal found, continuing...\n');
    } else {
      console.log('   ✓ Onboarding modal detected\n');

      console.log('4. Clicking "Explorar después" button...');

      // Wait a moment for modal to be fully rendered
      await new Promise(r => setTimeout(r, 500));

      // Click the button using a more reliable method
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');

        if (btn) {
          console.log('Found button, clicking...');
          btn.click();
          return true;
        }

        // Debug: log all button texts
        console.log('Available buttons:', buttons.map(b => b.textContent.trim()).filter(t => t.length > 0));
        return false;
      });

      if (!clicked) {
        console.log('   ❌ Button not found!\n');
        const pageText = await page.evaluate(() => document.body.innerText);
        console.log('Page text preview:');
        console.log(pageText.substring(0, 500));
        return;
      }

      console.log('   ✓ Button clicked\n');

      // Wait for modal to close and dashboard to load
      console.log('5. Waiting for dashboard to load...');
      await new Promise(r => setTimeout(r, 2000));

      const modalGone = await page.evaluate(() => {
        return !document.body.innerText.includes('Bienvenido a JobPilot');
      });

      if (modalGone) {
        console.log('   ✓ Modal closed\n');
      } else {
        console.log('   ⚠ Modal still visible\n');
      }
    }

    // Clear API call log to see only dashboard load requests
    apiCalls.length = 0;

    // Wait for dashboard data to load
    console.log('6. Waiting for job data to load...');
    await new Promise(r => setTimeout(r, 2000));

    // Check if jobs are loaded
    console.log('7. Checking for jobs...');
    const jobsStatus = await page.evaluate(() => {
      const text = document.body.innerText;

      // Check for job links
      const jobLinks = document.querySelectorAll('a[href*="/jobs/"]');

      // Check for job text content
      const hasJobTitles = text.includes('Ingeniero Senior Python') ||
                          text.includes('Prompt Engineering') ||
                          text.includes('Developer');

      return {
        jobLinksCount: jobLinks.length,
        jobsFound: Array.from(jobLinks).map(link => ({
          text: link.textContent.substring(0, 50),
          href: link.href
        })),
        hasJobTitles,
        pageText: text.substring(0, 500)
      };
    });

    console.log(`   Job links found: ${jobsStatus.jobLinksCount}`);
    console.log(`   Has job titles in text: ${jobsStatus.hasJobTitles}`);

    if (jobsStatus.jobLinksCount > 0) {
      console.log('   ✓ Jobs are rendered as links!\n');
      jobsStatus.jobsFound.slice(0, 3).forEach((job, idx) => {
        console.log(`     ${idx + 1}. ${job.text}`);
        console.log(`        → ${job.href}\n`);
      });
    } else {
      console.log('   ❌ No job links found\n');
      console.log('   Page text preview:');
      console.log(jobsStatus.pageText);
    }

    // Check API calls
    console.log('8. API calls made:');
    apiCalls.forEach(call => {
      console.log(`   ${call.method} ${call.status} ${call.url}`);
    });

    if (apiCalls.length === 0) {
      console.log('   ⚠ No API calls detected during this phase');
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Modal closed: ${modalGone !== false ? 'YES' : 'NO'}`);
    console.log(`Job links found: ${jobsStatus.jobLinksCount}`);
    console.log(`Jobs rendering: ${jobsStatus.jobLinksCount > 0 ? 'WORKING ✓' : 'BROKEN ❌'}`);

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
  } finally {
    if (browser) await browser.close();
  }
}

testFix().catch(console.error);
