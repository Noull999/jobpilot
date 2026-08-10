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

async function testApplyJob() {
  console.log('=== PRUEBA: ENVÍO DE SOLICITUD ===\n');

  let browser;
  try {
    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    const token = loginRes.body.access_token;
    const userId = loginRes.body.user_id;

    console.log(`Usuario ID: ${userId}`);
    console.log(`Token: ${token.substring(0, 20)}...\n`);

    // Check initial applications
    console.log('PASO 1: Verificar aplicaciones iniciales');
    console.log('=====================================\n');

    const initialApps = await makeRequest('GET', 'http://localhost:5000/api/jobs/applications', null, {
      Authorization: `Bearer ${token}`
    });

    console.log(`Status: ${initialApps.status}`);
    console.log(`Aplicaciones actuales: ${initialApps.body.applications?.length || 0}\n`);

    if (initialApps.body.applications) {
      initialApps.body.applications.forEach((app, idx) => {
        console.log(`${idx + 1}. Job ID ${app.job_id} - Status: ${app.status}`);
      });
    }

    // Open browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Monitor network requests
    const networkLog = [];
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/jobs')) {
        const status = response.status();
        try {
          const body = await response.text();
          networkLog.push({
            method: response.request().method(),
            url: url.substring(url.lastIndexOf('/api/')),
            status: status,
            hasError: !body.includes('"success"') && status >= 400
          });
        } catch (e) {
          networkLog.push({
            method: response.request().method(),
            url: url.substring(url.lastIndexOf('/api/')),
            status: status,
            hasError: status >= 400
          });
        }
      }
    });

    // Set token
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('access_token', token);
      localStorage.removeItem('onboarding-completed');
    }, token);

    console.log('\nPASO 2: Navegar a un empleo y enviar solicitud');
    console.log('=============================================\n');

    console.log('• Cargando dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    console.log('• Cerrando modal onboarding...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('• Haciendo clic en primer empleo...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));
      if (links.length > 0) links[0].click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('• Haciendo clic en "Enviar Solicitud"...');
    const applyResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const applyBtn = buttons.find(b => b.textContent.includes('Enviar Solicitud'));

      if (!applyBtn) {
        return { found: false };
      }

      applyBtn.click();
      return { found: true, text: applyBtn.textContent };
    });

    if (!applyResult.found) {
      console.log('❌ Botón "Enviar Solicitud" no encontrado\n');
    } else {
      console.log(`✓ Click en: "${applyResult.text}"\n`);
    }

    // Wait for request to complete
    await new Promise(r => setTimeout(r, 2000));

    // Check for toast/notification
    const toastMsg = await page.evaluate(() => {
      const text = document.body.innerText;
      if (text.includes('Solicitud enviada')) return 'success';
      if (text.includes('Ya has aplicado')) return 'already_applied';
      if (text.includes('error')) return 'error';
      return 'unknown';
    });

    console.log(`Respuesta: ${
      toastMsg === 'success' ? '✓ Solicitud enviada' :
      toastMsg === 'already_applied' ? '⚠️ Ya aplicaste' :
      toastMsg === 'error' ? '❌ Error' :
      '? Desconocida'
    }\n`);

    // Check final applications
    console.log('PASO 3: Verificar aplicaciones después del envío');
    console.log('===============================================\n');

    const finalApps = await makeRequest('GET', 'http://localhost:5000/api/jobs/applications', null, {
      Authorization: `Bearer ${token}`
    });

    console.log(`Status: ${finalApps.status}`);
    console.log(`Aplicaciones ahora: ${finalApps.body.applications?.length || 0}\n`);

    if (finalApps.body.applications) {
      finalApps.body.applications.forEach((app, idx) => {
        console.log(`${idx + 1}. Job ID ${app.job_id} - Status: ${app.status}`);
      });
    }

    // Check if applications appear in UI
    console.log('\nPASO 4: Verificar sección "Mis Postulaciones" en UI');
    console.log('==================================================\n');

    console.log('• Volviendo al dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    console.log('• Cerrando modal de onboarding si aparece...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('• Navegando a "Mis Postulaciones"...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const appItem = buttons.find(item => item.textContent.includes('Postulaciones'));
      if (appItem) appItem.click();
    });

    await new Promise(r => setTimeout(r, 2000));

    const applicationsUI = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasApplicationsSection: text.includes('Seguimiento de Postulaciones'),
        jobIdMatches: (text.match(/Empleo ID:\s*\d+/gi) || []).length,
        statusMatches: (text.match(/Pendiente|Aceptada|Rechazada/gi) || []).length,
        showsEmpty: text.includes('Aún no has registrado'),
        hasApplicationsDisplayed: (text.match(/Empleo ID:\s*\d+/gi) || []).length > 0
      };
    });

    console.log(`✓ UI detectó sección "Seguimiento": ${applicationsUI.hasApplicationsSection ? 'SÍ' : 'NO'}`);
    console.log(`✓ Aplicaciones encontradas: ${applicationsUI.jobIdMatches}`);
    console.log(`✓ Estados encontrados: ${applicationsUI.statusMatches}`);
    console.log(`✓ Muestra vacío: ${applicationsUI.showsEmpty ? 'SÍ' : 'NO'}`);
    console.log(`✓ Aplicaciones se muestran: ${applicationsUI.hasApplicationsDisplayed ? 'SÍ ✓' : 'NO ❌'}\n`);

    // Network summary
    console.log('=== SOLICITUDES DE RED ===');
    const apiRequests = networkLog.filter(log => log.url.includes('/jobs'));
    apiRequests.forEach(req => {
      const status = req.hasError ? '❌' : '✓';
      console.log(`${status} ${req.method} ${req.status} ${req.url}`);
    });

    console.log('\n=== RESUMEN ===');
    const appsSent = finalApps.body.applications?.length || 0;
    const appsInitial = initialApps.body.applications?.length || 0;
    const newApps = appsSent - appsInitial;

    if (newApps > 0) {
      console.log(`✓ Se envió ${newApps} solicitud(es) correctamente`);
    } else {
      console.log(`⚠️ No se envió nueva solicitud (usuario ya había aplicado)`);
    }

    if (applicationsUI.hasApplicationsDisplayed) {
      console.log(`✓ Sección "Mis Postulaciones" está disponible y muestra ${applicationsUI.jobIdMatches} aplicaciones`);
      console.log(`✓✓✓ FLUJO COMPLETO FUNCIONAL ✓✓✓`);
    } else {
      console.log(`❌ Sección "Mis Postulaciones" no muestra aplicaciones`);
    }

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) await browser.close();
  }
}

testApplyJob().catch(console.error);
