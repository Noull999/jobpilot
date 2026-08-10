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

async function testToken() {
  console.log('=== TOKEN PERSISTENCE CHECK ===\n');

  let browser;
  try {
    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    const token = loginRes.access_token;
    console.log(`Token obtained: ${token.substring(0, 20)}...\n`);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Method 1: Set token before navigation
    console.log('Method 1: Set token with evaluateOnNewDocument, then navigate...');
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
    }, token);

    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const tokenCheck1 = await page.evaluate(() => {
      return {
        token: localStorage.getItem('access_token'),
        hasToken: !!localStorage.getItem('access_token'),
        currentUrl: window.location.href,
        isDashboard: window.location.pathname.includes('dashboard'),
        pageTitle: document.title,
        hasWelcome: document.body.innerText.includes('Bienvenido')
      };
    });

    console.log(`  Token in localStorage: ${tokenCheck1.hasToken ? 'YES' : 'NO'}`);
    console.log(`  Current URL: ${tokenCheck1.currentUrl}`);
    console.log(`  Is dashboard: ${tokenCheck1.isDashboard}`);
    console.log(`  Has "Bienvenido": ${tokenCheck1.hasWelcome}`);
    console.log(`  Token substring: ${tokenCheck1.token ? tokenCheck1.token.substring(0, 20) + '...' : 'NONE'}\n`);

    // Method 2: Navigation, then set token
    console.log('Method 2: Navigate, then wait and close onboarding...');
    const page2 = await browser.newPage();

    await page2.goto('http://localhost:5188/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 500));

    await page2.evaluate((token) => {
      localStorage.setItem('access_token', token);
    }, token);

    await page2.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const tokenCheck2 = await page2.evaluate(() => {
      return {
        hasToken: !!localStorage.getItem('access_token'),
        currentUrl: window.location.href,
        isDashboard: window.location.pathname.includes('dashboard'),
        hasWelcome: document.body.innerText.includes('Bienvenido'),
        hasEmpleosRec: document.body.innerText.includes('Empleos Recomendados')
      };
    });

    console.log(`  Token in localStorage: ${tokenCheck2.hasToken ? 'YES' : 'NO'}`);
    console.log(`  Current URL: ${tokenCheck2.currentUrl}`);
    console.log(`  Is dashboard: ${tokenCheck2.isDashboard}`);
    console.log(`  Has "Bienvenido": ${tokenCheck2.hasWelcome}`);
    console.log(`  Has "Empleos Recomendados": ${tokenCheck2.hasEmpleosRec}`);

    if (tokenCheck2.hasEmpleosRec) {
      console.log('\n✓ Method 2 works better!');
    }

  } catch (error) {
    console.error('\nERROR:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

testToken().catch(console.error);
