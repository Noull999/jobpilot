#!/usr/bin/env node

const http = require('http');
const puppeteer = require('puppeteer');

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

async function diagnose() {
  console.log('=== DIAGNÓSTICO DEL PROBLEMA ===\n');

  try {
    // Check API
    console.log('1. Verificando que la API esté corriendo...');
    const apiCheck = await makeRequest('GET', 'http://localhost:5000/api/health', null).catch(() => ({ status: 0 }));
    if (apiCheck.status === 0) {
      console.log('❌ API NO está corriendo en puerto 5000\n');
      return;
    }
    console.log('✓ API corriendo en puerto 5000\n');

    // Check Frontend
    console.log('2. Verificando que el frontend esté corriendo...');
    const frontendCheck = await makeRequest('GET', 'http://localhost:5188', null).catch(() => ({ status: 0 }));
    if (frontendCheck.status === 0) {
      console.log('❌ Frontend NO está corriendo en puerto 5188\n');
      return;
    }
    console.log('✓ Frontend corriendo en puerto 5188\n');

    // Check if user exists and has jobs
    console.log('3. Verificando datos del usuario...');

    const userEmails = [
      'test.features@jobpilot.com',
      'test@jobpilot.com',
      'admin@jobpilot.com'
    ];

    for (const email of userEmails) {
      const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
        email: email,
        password: 'TestPassword123!'
      }).catch(() => null);

      if (loginRes && loginRes.status === 200) {
        const token = loginRes.body.access_token;
        const matchesRes = await makeRequest('GET', 'http://localhost:5000/api/jobs/matches', null, {
          Authorization: `Bearer ${token}`
        });

        console.log(`Email: ${email}`);
        console.log(`  Login: ✓`);
        console.log(`  Empleos disponibles: ${matchesRes.body.matches?.length || 0}`);
        console.log('');
      }
    }

    // Open browser and check
    console.log('4. Abriendo navegador para inspeccionar...');
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Inyectar el token
    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
      localStorage.removeItem('onboarding-completed');
      console.log('[DEBUG] Token inyectado en localStorage');
    }, loginRes.body.access_token);

    await page.goto('http://localhost:5188/dashboard');
    await new Promise(r => setTimeout(r, 2000));

    // Take screenshot
    await page.screenshot({ path: 'screenshot-dashboard.png' });
    console.log('✓ Screenshot guardado: screenshot-dashboard.png\n');

    // Check DevTools
    console.log('5. Información del navegador:');
    const browserInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        localStorageKeys: Object.keys(localStorage),
        onboardingFlag: localStorage.getItem('onboarding-completed'),
        hasToken: !!localStorage.getItem('access_token'),
        tokenLength: localStorage.getItem('access_token')?.length || 0
      };
    });

    console.log(`URL: ${browserInfo.url}`);
    console.log(`Token en localStorage: ${browserInfo.hasToken ? `SÍ (${browserInfo.tokenLength} chars)` : 'NO'}`);
    console.log(`Flag onboarding-completed: ${browserInfo.onboardingFlag || 'NO SET'}`);
    console.log(`Keys en localStorage: ${browserInfo.localStorageKeys.join(', ')}\n`);

    // Keep open for inspection
    console.log('6. El navegador está abierto. Puedes inspeccionar:');
    console.log('   - Abrir DevTools (F12)');
    console.log('   - Ir a Application > Local Storage');
    console.log('   - Verificar qué hay en la página\n');

    console.log('Presiona Ctrl+C cuando termines de inspeccionar...\n');

    await new Promise(r => setTimeout(r, 60000));
    await browser.close();

  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

diagnose();
