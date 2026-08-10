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

async function testMultipleJobs() {
  console.log('=== PROBANDO MÚLTIPLES EMPLEOS ===\n');

  let browser;
  try {
    // Get token
    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    const token = loginRes.body.access_token;
    console.log('✓ Token obtenido\n');

    // Get all jobs from API
    const jobsRes = await makeRequest('GET', 'http://localhost:5000/api/jobs/matches?limit=20', null, {
      Authorization: `Bearer ${token}`
    });

    const jobs = jobsRes.body.matches || [];
    console.log(`Total empleos disponibles: ${jobs.length}\n`);

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

    // Go to dashboard
    console.log('Navegando al dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Click button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 2000));
    console.log('✓ Dashboard listo\n');

    // Test clicking each job
    console.log('PROBANDO CADA EMPLEO:');
    console.log('-------------------\n');

    for (let i = 0; i < Math.min(5, jobs.length); i++) {
      const job = jobs[i];
      console.log(`${i + 1}. ID: ${job.job_id} - ${job.job_title || 'Unknown'}`);

      const result = await page.evaluate((idx) => {
        const links = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));
        const link = links[idx];

        if (!link) return { found: false };

        return {
          found: true,
          href: link.href,
          text: link.textContent.substring(0, 50)
        };
      }, i);

      if (!result.found) {
        console.log('   ❌ Empleo no encontrado en DOM\n');
        continue;
      }

      console.log(`   Href: ${result.href}`);

      // Click the job
      await page.evaluate((idx) => {
        const links = document.querySelectorAll('a[href*="/jobs/"]');
        if (links[idx]) links[idx].click();
      }, i);

      await new Promise(r => setTimeout(r, 2000));

      const pageState = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          url: window.location.href,
          hasError: text.includes('Error') || text.includes('404') || text.includes('Whitelabel'),
          hasJobContent: text.includes('Compatibilidad') || text.includes('Descripción'),
          pageTitle: document.title,
          statusIndicator: text.includes('Not Found') ? '404' : 'OK'
        };
      });

      const status = pageState.hasError ? '❌' : '✓';
      console.log(`   ${status} URL: ${pageState.url}`);
      console.log(`   Contenido: ${pageState.hasJobContent ? 'SÍ' : 'NO'}`);
      console.log(`   Error: ${pageState.hasError ? 'SÍ' : 'NO'}\n`);

      // Go back to dashboard for next test
      if (i < Math.min(5, jobs.length) - 1) {
        await page.goBack({ waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 1000));
      }
    }

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) await browser.close();
  }
}

testMultipleJobs().catch(console.error);
