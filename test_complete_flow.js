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

async function testCompleteFlow() {
  console.log('=== PRUEBA COMPLETA DEL FLUJO ===\n');

  let browser;
  try {
    // Step 1: Verify API is working
    console.log('PASO 1: Verificar que la API funciona');
    console.log('--------------------------------------');

    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    console.log(`Status: ${loginRes.status}`);
    console.log(`Token: ${loginRes.body.access_token ? 'SÍ ✓' : 'NO ❌'}`);

    if (!loginRes.body.access_token) {
      console.error('❌ Error en login de API\n');
      return;
    }

    const token = loginRes.body.access_token;

    const matchesRes = await makeRequest('GET', 'http://localhost:5000/api/jobs/matches?limit=10', null, {
      Authorization: `Bearer ${token}`
    });

    console.log(`Matches desde API: ${matchesRes.body.matches?.length || 0} empleos ✓\n`);

    // Step 2: Test Frontend
    console.log('PASO 2: Prueba en el navegador');
    console.log('------------------------------');

    browser = await puppeteer.launch({
      headless: false,  // Cambiar a true para headless
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Capture all console messages and network errors
    const consoleMessages = [];
    const networkErrors = [];

    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('response', res => {
      if (res.status() >= 400 && res.url().includes('/api/')) {
        networkErrors.push(`${res.status()} ${res.url()}`);
      }
    });

    // Set token before navigation
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
      localStorage.removeItem('onboarding-completed');
    }, token);

    console.log('Navegando al dashboard...');
    await page.goto('http://localhost:5188/dashboard', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });
    console.log('✓ Dashboard cargado\n');

    // Wait for render
    await new Promise(r => setTimeout(r, 2000));

    // Step 3: Check initial state
    console.log('PASO 3: Estado inicial del dashboard');
    console.log('-----------------------------------');

    const initialState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasOnboardingModal: text.includes('Bienvenido a JobPilot'),
        hasEmploymentSection: text.includes('Empleos'),
        currentPath: window.location.pathname,
        tokenExists: !!localStorage.getItem('access_token')
      };
    });

    console.log(`Modal de onboarding: ${initialState.hasOnboardingModal ? 'SÍ' : 'NO'}`);
    console.log(`Sección de empleos: ${initialState.hasEmploymentSection ? 'SÍ' : 'NO'}`);
    console.log(`Token en localStorage: ${initialState.tokenExists ? 'SÍ' : 'NO'}\n`);

    // Step 4: Click the button
    if (initialState.hasOnboardingModal) {
      console.log('PASO 4: Haciendo clic en "Explorar después"');
      console.log('----------------------------------------');

      const buttonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (!buttonClicked) {
        console.log('❌ Botón no encontrado\n');
        return;
      }

      console.log('✓ Botón clickeado\n');

      // Wait for state updates
      await new Promise(r => setTimeout(r, 3000));
    }

    // Step 5: Check if jobs loaded
    console.log('PASO 5: Verificar que los empleos se cargaron');
    console.log('-------------------------------------------');

    const jobsState = await page.evaluate(() => {
      const jobLinks = document.querySelectorAll('a[href*="/jobs/"]');
      const text = document.body.innerText;

      return {
        jobLinksCount: jobLinks.length,
        jobLinks: Array.from(jobLinks).map(link => ({
          href: link.href,
          text: link.textContent.substring(0, 50)
        })),
        hasEmploymentText: text.includes('Empleos') && text.includes('compatibilidad'),
        pageText: text.substring(0, 300)
      };
    });

    console.log(`Enlaces a empleos encontrados: ${jobsState.jobLinksCount}`);
    console.log(`Sección de empleos visible: ${jobsState.hasEmploymentText ? 'SÍ' : 'NO'}`);

    if (jobsState.jobLinksCount === 0) {
      console.log('\n❌ PROBLEMA: No hay enlaces a empleos\n');
      console.log('Contenido de la página:');
      console.log(jobsState.pageText);
      console.log('\n');
    } else {
      console.log(`✓ ${jobsState.jobLinksCount} empleos renderizados correctamente\n`);

      // Step 6: Click first job
      console.log('PASO 6: Hacer clic en el primer empleo');
      console.log('------------------------------------');

      const firstJobHref = jobsState.jobLinks[0]?.href;
      console.log(`URL: ${firstJobHref}`);

      await page.evaluate(() => {
        const link = document.querySelector('a[href*="/jobs/"]');
        if (link) link.click();
      });

      console.log('Esperando navegación...');
      await new Promise(r => setTimeout(r, 2000));

      const jobDetailState = await page.evaluate(() => {
        return {
          currentURL: window.location.href,
          currentPath: window.location.pathname,
          hasContent: document.body.innerText.length > 100,
          hasError: document.body.innerText.includes('Error') || document.body.innerText.includes('404'),
          textPreview: document.body.innerText.substring(0, 200)
        };
      });

      console.log(`✓ Navegó a: ${jobDetailState.currentPath}`);
      console.log(`  Contenido: ${jobDetailState.hasContent ? 'SÍ ✓' : 'NO ❌'}`);
      console.log(`  Error: ${jobDetailState.hasError ? 'SÍ ❌' : 'NO ✓'}\n`);

      if (jobDetailState.hasError) {
        console.log('CONTENIDO:');
        console.log(jobDetailState.textPreview);
      }
    }

    // Step 7: Report
    console.log('=== RESUMEN FINAL ===');
    console.log(`Estado de la API: FUNCIONANDO ✓`);
    console.log(`Dashboard carga: SÍ ✓`);
    console.log(`Empleos se renderizen: ${jobsState.jobLinksCount > 0 ? 'SÍ ✓' : 'NO ❌'}`);
    console.log(`Enlaces clickeables: ${jobsState.jobLinksCount > 0 ? 'SÍ ✓' : 'NO ❌'}`);

    if (networkErrors.length > 0) {
      console.log(`\nErrores de red detectados:`);
      networkErrors.forEach(err => console.log(`  - ${err}`));
    }

    if (consoleMessages.filter(m => m.includes('error')).length > 0) {
      console.log(`\nErrores en consola:`);
      consoleMessages.filter(m => m.includes('error')).forEach(msg => console.log(`  - ${msg}`));
    }

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      // Keep browser open for 30 seconds to inspect
      console.log('\nNavigador permanecerá abierto por 30 segundos...');
      await new Promise(r => setTimeout(r, 30000));
      await browser.close();
    }
  }
}

testCompleteFlow().catch(console.error);
