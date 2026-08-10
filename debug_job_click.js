#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugJobClick() {
  console.log('=== DEBUGGING JOB CLICK 404 ERROR ===\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Track all network requests and responses
    const failedRequests = [];
    const networkLog = [];

    page.on('response', response => {
      const url = response.url();
      const status = response.status();

      networkLog.push({
        url,
        status,
        method: response.request().method(),
        timestamp: new Date().toISOString()
      });

      if (status >= 400) {
        failedRequests.push({
          url,
          status,
          statusText: response.statusText(),
          method: response.request().method()
        });
      }
    });

    console.log('1. Opening application...');
    await page.goto('http://localhost:5188', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Application loaded\n');

    console.log('2. Navigating to login...');
    await page.goto('http://localhost:5188/login', { waitUntil: 'networkidle2' });
    console.log('✓ Login page loaded\n');

    console.log('3. Logging in...');
    await page.type('input[type="email"]', 'test.features@jobpilot.com', { delay: 10 });
    await page.type('input[type="password"]', 'TestPassword123!', { delay: 10 });

    // Find and click the login button
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
        // Fallback: click any button with text content
        const firstBtn = buttons.find(b => b.textContent.trim().length > 0);
        if (firstBtn) firstBtn.click();
      }
    });

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      console.log('✓ Login successful\n');
    } catch (e) {
      console.log('⚠ Navigation timeout, continuing...\n');
    }

    console.log('4. Checking current URL after login...');
    const urlAfterLogin = page.url();
    console.log(`   URL: ${urlAfterLogin}\n`);

    console.log('5. Waiting for dashboard or navigating to it...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('✓ Dashboard page loaded\n');

    console.log('6. Checking for onboarding modal...');
    const onboardingExists = await page.evaluate(() => {
      return document.body.innerText.includes('Bienvenido a JobPilot') ||
             document.body.innerText.includes('Explorar después');
    });

    if (onboardingExists) {
      console.log('   ⚠ Onboarding modal detected, clicking "Explorar después" to skip...');

      // Try to find and click the skip button
      try {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b =>
            b.textContent.includes('Explorar después') ||
            b.textContent.includes('Explorar')
          );
          if (btn) {
            console.log('Button found, clicking...');
            btn.click();
          }
        });

        // Wait a bit longer for the modal to close
        await new Promise(r => setTimeout(r, 2000));

        // Verify the modal is gone
        const stillShowingOnboarding = await page.evaluate(() => {
          return document.body.innerText.includes('Bienvenido a JobPilot');
        });

        if (!stillShowingOnboarding) {
          console.log('   ✓ Onboarding skipped successfully\n');
        } else {
          console.log('   ⚠ Onboarding still showing after click, trying alternative method...');
          // Try clicking by text content directly
          await page.click('button:contains("Explorar después")').catch(() => {
            // If that fails, just wait a bit longer
            return new Promise(resolve => setTimeout(resolve, 1000));
          });
          console.log('   ✓ Alternative method attempted\n');
        }
      } catch (e) {
        console.log(`   ⚠ Error skipping onboarding: ${e.message}\n`);
      }
    } else {
      console.log('   ✓ No onboarding modal\n');
    }

    // Verify we have employment section now
    const hasEmploymentSection = await page.evaluate(() => {
      return document.body.innerText.toLowerCase().includes('empleos') ||
             document.body.innerText.toLowerCase().includes('employment');
    });
    console.log('   Has employment section:', hasEmploymentSection, '\n');

    console.log('7. Checking employment data loaded...');
    const jobCount = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/Empleos recomendados.*?(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    console.log(`   Frontend shows ${jobCount} jobs\n`);

    console.log('8. Looking for "Ver todos" modal button...');
    // Try to find and click the modal button
    const modalButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Ver todos'));
    });

    if (modalButton) {
      console.log('   ✓ "Ver todos" button found, clicking it...');
      await page.evaluate(btn => btn.click(), modalButton);
      await new Promise(r => setTimeout(r, 1500));
      console.log('   ✓ Modal should be open\n');
    } else {
      console.log('   ⚠ No "Ver todos" button found\n');
    }

    console.log('9. Finding job links...');
    const jobLinks = await page.$$('a[href*="/jobs/"]');
    console.log(`   Found ${jobLinks.length} job links with /jobs/ href\n`);

    if (jobLinks.length === 0) {
      console.log('❌ No /jobs/ links found! Analyzing page structure...\n');

      // Get all links on the page
      const allLinks = await page.$$eval('a', links =>
        links.map(link => ({
          text: link.textContent.trim().substring(0, 50),
          href: link.href.substring(0, 100)
        }))
      );

      console.log('   All links on page:');
      allLinks.slice(0, 10).forEach(link => {
        console.log(`     - "${link.text}" -> ${link.href}`);
      });
      console.log('');

      // Check if employment section exists
      const hasEmployment = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('empleos') || text.includes('employment');
      });

      console.log('   Page has employment section:', hasEmployment);

      // Look for any clickable elements with job-related content
      const jobElements = await page.evaluate(() => {
        const text = document.body.innerText;
        const lines = text.split('\n');
        return lines.filter(line =>
          (line.includes('Ingeniero') || line.includes('Developer') || line.includes('Engineer')) &&
          line.trim().length > 10
        ).slice(0, 5);
      });

      if (jobElements.length > 0) {
        console.log('   Job titles found on page:');
        jobElements.forEach(job => {
          console.log(`     - ${job.substring(0, 80)}`);
        });
      }
      console.log('');

      // Get the actual employment section HTML
      console.log('   Dumping employment section content:\n');
      const sectionContent = await page.evaluate(() => {
        // Find elements containing "Empleos" or similar
        const allElements = document.querySelectorAll('*');
        for (let el of allElements) {
          if (el.innerText && el.innerText.toLowerCase().includes('empleos')) {
            // Get the parent container
            let container = el;
            while (container.parentElement && container.children.length < 20) {
              container = container.parentElement;
            }
            return container.innerText.substring(0, 1000);
          }
        }
        return document.body.innerText.substring(0, 1000);
      });

      console.log(sectionContent);
      console.log('');

      // Get full page text to understand structure
      console.log('   Full page body text (first 2000 chars):\n');
      const fullText = await page.evaluate(() => document.body.innerText);
      console.log(fullText.substring(0, 2000));
      console.log('\n...\n');

      // Check for React root and if component mounted
      const reactInfo = await page.evaluate(() => {
        const root = document.getElementById('root');
        return {
          rootExists: !!root,
          rootHasChildren: root ? root.children.length > 0 : false,
          bodyText: document.body.innerText.substring(0, 100)
        };
      });

      console.log('   React Info:', reactInfo);
      console.log('');
      return;
    }

    console.log('9. Clicking first job link...');
    const firstJobLink = jobLinks[0];
    const jobHref = await page.evaluate(el => el.href, firstJobLink);
    console.log(`   Job URL: ${jobHref}\n`);

    // Clear previous network log to see only the request for job detail
    const preClickNetworkLog = [...networkLog];
    networkLog.length = 0;
    failedRequests.length = 0;

    console.log('10. Waiting for navigation and capturing network...');

    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
        firstJobLink.click()
      ]);
    } catch (e) {
      console.log(`⚠ Navigation error: ${e.message}`);
    }

    console.log('✓ Navigation completed\n');

    console.log('11. Current URL:', page.url());
    console.log('');

    // Check for errors
    const bodyText = await page.evaluate(() => document.body.innerText);

    if (bodyText.includes('404') || bodyText.includes('Whitelabel') || bodyText.includes('Error')) {
      console.log('❌ ERROR PAGE DETECTED!');
      console.log('   Content:', bodyText.substring(0, 500));
      console.log('');
    }

    console.log('12. Network requests made during job navigation:');
    if (networkLog.length === 0) {
      console.log('   (No new requests - using cached state)');
    } else {
      networkLog.forEach(req => {
        const statusColor = req.status >= 400 ? '❌' : '✓';
        console.log(`   ${statusColor} ${req.method} ${req.status} - ${req.url.substring(0, 80)}`);
      });
    }

    console.log('');
    console.log('13. Failed requests:');
    if (failedRequests.length === 0) {
      console.log('   ✓ None detected');
    } else {
      failedRequests.forEach(req => {
        console.log(`   ❌ ${req.method} ${req.status} - ${req.url}`);
      });
    }

    console.log('');
    console.log('14. Checking React state...');
    const reactState = await page.evaluate(() => {
      return {
        currentUrl: window.location.href,
        currentPathname: window.location.pathname,
        hasJobData: !!document.querySelector('[class*="job"]'),
        bodyClasses: document.body.className
      };
    });
    console.log('   URL:', reactState.currentUrl);
    console.log('   Pathname:', reactState.currentPathname);
    console.log('   Has job elements:', reactState.hasJobData);
    console.log('');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:');
    console.error(error.message);
  } finally {
    if (browser) await browser.close();
  }
}

debugJobClick().catch(console.error);
