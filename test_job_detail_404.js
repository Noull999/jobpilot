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

async function testJobDetail404() {
  console.log('=== INVESTIGANDO ERROR 404 EN DETALLE DE EMPLEO ===\n');

  let browser;
  try {
    // Get token
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

    // Monitor all network requests and responses
    const networkLog = [];
    const failedRequests = [];

    page.on('response', async response => {
      const url = response.url();
      const status = response.status();

      const logEntry = {
        method: response.request().method(),
        status: status,
        url: url.substring(url.lastIndexOf('/api/') >= 0 ? url.lastIndexOf('/api/') : 0),
        timestamp: new Date().toISOString()
      };

      networkLog.push(logEntry);

      if (status >= 400) {
        let body = '';
        try {
          body = await response.text();
        } catch (e) {
          body = '[unable to read]';
        }
        failedRequests.push({
          ...logEntry,
          body: body.substring(0, 200)
        });
      }
    });

    // Set token and navigate
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
      localStorage.removeItem('onboarding-completed');
    }, token);

    console.log('1. Navegando al dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Clear network log for next step
    networkLog.length = 0;
    failedRequests.length = 0;

    // Click button
    console.log('2. Haciendo clic en "Explorar después"...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 3000));

    // Clear network log for job click
    networkLog.length = 0;
    failedRequests.length = 0;

    console.log('3. Haciendo clic en el primer empleo...');
    console.log('   Capturando TODAS las solicitudes...\n');

    await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/jobs/"]');
      if (links.length > 0) {
        console.log('Job link found');
        links[0].click();
      }
    });

    // Wait for all requests to complete
    await new Promise(r => setTimeout(r, 3000));

    console.log('SOLICITUDES REALIZADAS:');
    console.log('----------------------\n');

    networkLog.forEach((req, idx) => {
      const status = req.status >= 400 ? '❌' : '✓';
      console.log(`${idx + 1}. ${status} ${req.method} ${req.status}`);
      console.log(`   ${req.url}`);
      console.log(`   ${req.timestamp}\n`);
    });

    if (failedRequests.length > 0) {
      console.log('\n❌ SOLICITUDES FALLIDAS:');
      console.log('------------------------\n');

      failedRequests.forEach(req => {
        console.log(`${req.method} ${req.status} ${req.url}`);
        console.log('Respuesta:');
        console.log(req.body);
        console.log('');
      });
    } else {
      console.log('\n✓ Ninguna solicitud falló');
    }

    // Check final page
    const finalPageState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        url: window.location.href,
        hasWhitelabelError: text.includes('Whitelabel'),
        has404: text.includes('404'),
        hasError: text.includes('error') || text.includes('Error'),
        jobContent: text.substring(0, 300)
      };
    });

    console.log('\nESTADO FINAL DE LA PÁGINA:');
    console.log('--------------------------');
    console.log(`URL: ${finalPageState.url}`);
    console.log(`¿Whitelabel Error?: ${finalPageState.hasWhitelabelError ? 'SÍ ❌' : 'NO ✓'}`);
    console.log(`¿404 Error?: ${finalPageState.has404 ? 'SÍ ❌' : 'NO ✓'}`);
    console.log(`¿Otro error?: ${finalPageState.hasError ? 'SÍ' : 'NO'}`);
    console.log('\nContenido:');
    console.log(finalPageState.jobContent);

  } catch (error) {
    console.error('\nERROR:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

testJobDetail404().catch(console.error);
