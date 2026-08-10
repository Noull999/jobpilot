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

async function testFixedFlow() {
  console.log('=== VERIFICACIÓN DEL FLUJO CORREGIDO ===\n');

  let browser;
  try {
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

    // Monitor all navigation
    let navigationLog = [];
    page.on('framenavigated', frame => {
      const url = frame.url();
      navigationLog.push({
        time: new Date().toISOString(),
        url: url,
        isIndeed: url.includes('indeed.com')
      });
    });

    // Set token
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
      localStorage.removeItem('onboarding-completed');
    }, token);

    console.log('1. Navegando al dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    console.log('✓ Dashboard cargado\n');

    console.log('2. Haciendo clic en "Explorar después"...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    console.log('✓ Modal cerrado\n');

    console.log('2.5. Navegando a vista de Empleos...');
    const navResult = await page.evaluate(() => {
      // Find the "Empleos" or jobs nav item
      const items = Array.from(document.querySelectorAll('nav button, nav a, [role="navigation"] button, [role="navigation"] a'));
      const jobsItem = items.find(item => item.textContent.includes('Empleos') || item.textContent.includes('jobs'));

      if (jobsItem) {
        jobsItem.click();
        return { found: true, text: jobsItem.textContent };
      }
      return { found: false };
    });

    if (navResult.found) {
      console.log(`✓ Navegó a: ${navResult.text}`);
    } else {
      console.log('⚠️  No se encontró navegación a Empleos, buscando botón...');
      // Try clicking any button that might say "Empleos"
      await page.evaluate(() => {
        const allItems = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const empleosItem = allItems.find(item => item.textContent.trim().includes('Empleos'));
        if (empleosItem) empleosItem.click();
      });
    }

    await new Promise(r => setTimeout(r, 1500));
    console.log('');

    console.log('3. Encontrando botón "Ver Oferta"...');
    const jobInfo = await page.evaluate(() => {
      // Find the "Ver Oferta" button
      const buttons = Array.from(document.querySelectorAll('a, button'));
      const verOfertaBtn = buttons.find(b => b.textContent.trim() === 'Ver Oferta →');

      if (!verOfertaBtn) {
        return { found: false };
      }

      // Check if it's a Link (react-router) or an <a> tag
      const isLink = verOfertaBtn.tagName === 'A' && !verOfertaBtn.href.includes('indeed');
      const href = verOfertaBtn.href || '';
      const target = verOfertaBtn.target || '';

      // Get nearby job title
      const parent = verOfertaBtn.closest('.bg-black-3, [class*="bg-"], div');
      const jobTitle = parent?.querySelector('h3')?.textContent || 'Unknown';

      return {
        found: true,
        isReactLink: isLink,
        href: href,
        target: target,
        textContent: verOfertaBtn.textContent,
        tagName: verOfertaBtn.tagName,
        jobTitle: jobTitle
      };
    });

    if (!jobInfo.found) {
      console.log('❌ Botón "Ver Oferta" no encontrado\n');
    } else {
      console.log(`✓ Botón encontrado`);
      console.log(`  Empleo: ${jobInfo.jobTitle}`);
      console.log(`  Tag: <${jobInfo.tagName}>`);
      console.log(`  Href: ${jobInfo.href}`);
      console.log(`  Target: ${jobInfo.target || 'none'}`);
      console.log(`  ¿Es React Link?: ${jobInfo.isReactLink ? 'SÍ ✓' : 'NO (apunta a URL externa)'}\n`);

      console.log('4. Haciendo clic en "Ver Oferta"...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('a, button'));
        const verOfertaBtn = buttons.find(b => b.textContent.trim() === 'Ver Oferta →');
        if (verOfertaBtn) {
          verOfertaBtn.click();
        }
      });

      await new Promise(r => setTimeout(r, 2000));

      const afterClickState = await page.evaluate(() => {
        return {
          currentURL: window.location.href,
          currentPath: window.location.pathname,
          hasJobDetail: document.body.innerText.includes('Compatibilidad') ||
                       document.body.innerText.includes('Descripción') ||
                       document.body.innerText.includes('Skills'),
          hasJobTitle: document.body.innerText.includes('Ingeniero') ||
                      document.body.innerText.includes('Developer') ||
                      document.body.innerText.includes('Full Stack'),
          pageTitle: document.querySelector('h1')?.textContent || '',
          isErrorPage: document.body.innerText.includes('Error') ||
                      document.body.innerText.includes('404') ||
                      document.body.innerText.includes('Whitelabel')
        };
      });

      console.log('DESPUÉS DEL CLICK:');
      console.log(`  URL: ${afterClickState.currentURL}`);
      console.log(`  Path: ${afterClickState.currentPath}`);
      console.log(`  Título de página: ${afterClickState.pageTitle}`);
      console.log(`  ¿Tiene detalles del empleo?: ${afterClickState.hasJobDetail ? 'SÍ ✓' : 'NO ❌'}`);
      console.log(`  ¿Tiene error?: ${afterClickState.isErrorPage ? 'SÍ ❌' : 'NO ✓'}\n`);

      if (afterClickState.currentURL.includes('indeed.com')) {
        console.log('❌ PROBLEM: Usuario fue redirigido a Indeed');
      } else if (!afterClickState.currentPath.startsWith('/jobs/')) {
        console.log('⚠️  WARNING: No está en ruta /jobs/');
      } else if (afterClickState.hasJobDetail && !afterClickState.isErrorPage) {
        console.log('✓ ÉXITO: Navegó a detalles del empleo correctamente');
      }
    }

    console.log('\n=== NAVEGACIONES DETECTADAS ===');
    navigationLog.forEach((nav, idx) => {
      const indicator = nav.isIndeed ? '❌' : '✓';
      console.log(`${idx + 1}. ${indicator} ${nav.url}`);
    });

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) await browser.close();
  }
}

testFixedFlow().catch(console.error);
