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

async function testApplicationsDebug() {
  console.log('=== VERIFICACIÓN: SECCIÓN DE POSTULACIONES ===\n');

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

    // Set token
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
      localStorage.removeItem('onboarding-completed');
    }, token);

    console.log('1. Cargando dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    console.log('2. Cerrando modal de onboarding...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('\n3. Inspeccionando navegación...');
    const navInfo = await page.evaluate(() => {
      // Check all buttons
      const buttons = Array.from(document.querySelectorAll('button'));
      const postulacionesBtn = buttons.find(b => b.textContent.includes('Postulaciones'));

      return {
        totalButtons: buttons.length,
        postulacionesBtnFound: !!postulacionesBtn,
        postulacionesBtnText: postulacionesBtn?.textContent || 'NOT FOUND',
        visibleButtons: buttons.filter(b => {
          const rect = b.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length,
        pageTitle: document.querySelector('h1')?.textContent || 'No title',
        bodyText: document.body.innerText.substring(0, 500)
      };
    });

    console.log(`✓ Total buttons en página: ${navInfo.totalButtons}`);
    console.log(`✓ Botón "Postulaciones" encontrado: ${navInfo.postulacionesBtnFound ? 'SÍ' : 'NO'}`);
    console.log(`✓ Botones visibles: ${navInfo.visibleButtons}`);
    if (navInfo.postulacionesBtnFound) {
      console.log(`✓ Texto del botón: "${navInfo.postulacionesBtnText}"`);
    }

    if (navInfo.postulacionesBtnFound) {
      console.log('\n4. Haciendo clic en botón "Postulaciones"...');
      const clickResult = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Postulaciones'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.textContent };
        }
        return { clicked: false };
      });

      if (clickResult.clicked) {
        console.log(`✓ Click ejecutado`);
      } else {
        console.log(`❌ No se pudo hacer click`);
      }

      await new Promise(r => setTimeout(r, 2000));

      console.log('\n5. Verificando sección de Postulaciones...');
      const appSection = await page.evaluate(() => {
        const pageText = document.body.innerText;
        const followUpTitle = document.body.innerText.includes('Seguimiento de Postulaciones');
        const postulacionesHeader = document.querySelector('h2');

        // Check if applications are rendered
        const applicationCards = document.querySelectorAll('[class*="border"][class*="rounded"]');

        return {
          hasFollowUpTitle: followUpTitle,
          h2Text: postulacionesHeader?.textContent || 'NO H2 FOUND',
          pageIncludesText: pageText.includes('Seguimiento'),
          totalDivs: document.querySelectorAll('div').length,
          applicationCardsFound: applicationCards.length,
          firstFewDivs: Array.from(document.querySelectorAll('div')).slice(0, 20).map(d => ({
            text: d.textContent.substring(0, 50),
            classes: d.className.substring(0, 80)
          }))
        };
      });

      console.log(`✓ Tiene título "Seguimiento": ${appSection.pageIncludesText ? 'SÍ' : 'NO'}`);
      console.log(`✓ H2 encontrado: ${appSection.h2Text}`);
      console.log(`✓ Total divs: ${appSection.totalDivs}`);

      // Get applications from API
      console.log('\n6. Verificando API de aplicaciones...');
      const appsRes = await makeRequest('GET', 'http://localhost:5000/api/jobs/applications', null, {
        Authorization: `Bearer ${token}`
      });

      console.log(`✓ API Status: ${appsRes.status}`);
      console.log(`✓ Aplicaciones en API: ${appsRes.body.applications?.length || 0}`);
      if (appsRes.body.applications && appsRes.body.applications.length > 0) {
        console.log(`  - Primera aplicación:`, JSON.stringify(appsRes.body.applications[0], null, 2));
      }
    } else {
      console.log('\n❌ Botón de Postulaciones no encontrado en la página');
      console.log('Verificando estructura de la sidebar...');
      const sidebarInfo = await page.evaluate(() => {
        const nav = document.querySelector('nav') || document.querySelector('[role="navigation"]');
        const sidebar = document.querySelector('aside') || document.querySelector('[class*="sidebar"]');

        return {
          hasNav: !!nav,
          hasSidebar: !!sidebar,
          navButtons: nav ? Array.from(nav.querySelectorAll('button')).map(b => b.textContent.substring(0, 30)) : [],
          sidebarButtons: sidebar ? Array.from(sidebar.querySelectorAll('button')).map(b => b.textContent.substring(0, 30)) : [],
          allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.substring(0, 30)).slice(0, 10)
        };
      });

      console.log('Nav encontrada:', sidebarInfo.hasNav);
      console.log('Sidebar encontrada:', sidebarInfo.hasSidebar);
      console.log('Botones en nav:', sidebarInfo.navButtons);
      console.log('Botones en sidebar:', sidebarInfo.sidebarButtons);
      console.log('Primeros 10 botones:', sidebarInfo.allButtons);
    }

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) await browser.close();
  }
}

testApplicationsDebug().catch(console.error);
