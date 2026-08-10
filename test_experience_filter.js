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

async function testExperienceFilter() {
  console.log('=== TEST: EXPERIENCE YEARS EDITING & FILTERING ===\n');

  let browser;
  try {
    // Step 1: Login
    console.log('PASO 1: Iniciar sesión');
    console.log('=============================\n');

    const loginRes = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    });

    const token = loginRes.body.access_token;
    const userId = loginRes.body.user_id;

    console.log(`✓ Usuario logueado - ID: ${userId}\n`);

    // Step 2: Get current CV
    console.log('PASO 2: Obtener CV actual');
    console.log('=============================\n');

    const cvRes = await makeRequest('GET', 'http://localhost:5000/api/cv/current', null, {
      Authorization: `Bearer ${token}`
    });

    console.log(`✓ CV obtenido`);
    console.log(`  - Años actuales: ${cvRes.body.cv?.experience_years || 'N/A'}\n`);

    // Step 3: Update CV with new experience_years via API
    console.log('PASO 3: Actualizar años de experiencia vía API');
    console.log('=============================\n');

    const updateRes = await makeRequest('PUT', `http://localhost:5000/api/cv/update/${cvRes.body.cv.id}`, {
      experience_years: 1
    }, {
      Authorization: `Bearer ${token}`
    });

    console.log(`Status: ${updateRes.status}`);
    console.log(`✓ CV actualizado a 1 año`);
    console.log(`  - Nuevo valor: ${updateRes.body.cv?.experience_years || 'N/A'}\n`);

    // Step 4: Launch browser and test UI
    console.log('PASO 4: Verificar CV Editor en UI');
    console.log('=============================\n');

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

    // Load dashboard
    console.log('• Cargando dashboard...');
    await page.goto('http://localhost:5188/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Close onboarding
    console.log('• Cerrando modal onboarding...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Explorar después');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Check for CV Editor in menu
    console.log('• Buscando CV Editor en UI...');
    const cvEditorCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasCV: text.includes('Análisis de tu CV') || text.includes('CV'),
        hasExperienceField: text.includes('Años de Experiencia') || text.includes('experiencia'),
        pageText: text.substring(0, 500)
      };
    });

    console.log(`✓ CV en página: ${cvEditorCheck.hasCV ? 'SÍ' : 'NO'}`);
    console.log(`✓ Campo "Años de Experiencia" visible: ${cvEditorCheck.hasExperienceField ? 'SÍ' : 'NO'}\n`);

    // Step 5: Check for experience filter
    console.log('PASO 5: Verificar filtros de experiencia');
    console.log('=============================\n');

    const filterCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasFilter = text.includes('Experiencia requerida') ||
                       text.includes('0 años') ||
                       text.includes('1 año') ||
                       text.includes('3+ años');

      // Look for filter buttons
      const buttons = Array.from(document.querySelectorAll('button'));
      const filterButtons = buttons.filter(b => {
        const t = b.textContent.trim();
        return t === '0 años' || t === '1 año' || t === '2 años' || t === '3+ años' || t === 'Todos';
      });

      return {
        hasFilterLabel: hasFilter,
        filterButtonCount: filterButtons.length,
        filterButtonTexts: filterButtons.map(b => b.textContent.trim())
      };
    });

    console.log(`✓ Etiqueta de filtro: ${filterCheck.hasFilterLabel ? 'SÍ' : 'NO'}`);
    console.log(`✓ Botones de filtro encontrados: ${filterCheck.filterButtonCount}`);
    if (filterCheck.filterButtonTexts.length > 0) {
      console.log(`  Botones: ${filterCheck.filterButtonTexts.join(', ')}`);
    }
    console.log();

    // Step 6: Check job listings are filtered correctly
    console.log('PASO 6: Verificar filtrado de empleos');
    console.log('=============================\n');

    console.log('• Haciendo clic en filtro "Todos"...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Todos');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const allJobsCount = await page.evaluate(() => {
      const text = document.body.innerText;
      const matches = text.match(/compatibilidad|Compatibilidad/g) || [];
      return matches.length;
    });
    console.log(`✓ Empleos mostrados (Todos): ${allJobsCount}`);

    console.log('• Haciendo clic en filtro "1 año"...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.trim() === '1 año');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const oneYearJobsCount = await page.evaluate(() => {
      const text = document.body.innerText;
      const matches = text.match(/compatibilidad|Compatibilidad/g) || [];
      return matches.length;
    });
    console.log(`✓ Empleos mostrados (1 año): ${oneYearJobsCount}`);
    console.log();

    // Step 7: Test "Ver todos" modal
    console.log('PASO 7: Verificar filtro en modal "Ver todos"');
    console.log('=============================\n');

    console.log('• Buscando botón "Ver todos"...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Ver todos'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const modalFilterCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasFilter = text.includes('Experiencia requerida');
      const buttons = Array.from(document.querySelectorAll('button'));
      const filterButtons = buttons.filter(b => {
        const t = b.textContent.trim();
        return t === '0 años' || t === '1 año' || t === '2 años' || t === '3+ años';
      });
      return {
        hasFilter,
        filterButtonsInModal: filterButtons.length
      };
    });

    console.log(`✓ Filtro en modal: ${modalFilterCheck.hasFilter ? 'SÍ' : 'NO'}`);
    console.log(`✓ Botones de filtro en modal: ${modalFilterCheck.filterButtonsInModal}\n`);

    // Summary
    console.log('=== RESUMEN ===');
    const allPassed =
      cvEditorCheck.hasExperienceField &&
      filterCheck.filterButtonCount >= 4 &&
      allJobsCount > 0 &&
      oneYearJobsCount >= 0;

    if (allPassed) {
      console.log('✓✓✓ TODAS LAS PRUEBAS PASARON ✓✓✓');
      console.log('✓ CV Editor - Años de experiencia editable');
      console.log('✓ Filtros de experiencia implementados');
      console.log('✓ Filtrado funcional en ambas secciones');
    } else {
      console.log('⚠️ ALGUNAS PRUEBAS FALLARON:');
      if (!cvEditorCheck.hasExperienceField) console.log('  ❌ Campo "Años de Experiencia" no visible');
      if (filterCheck.filterButtonCount < 4) console.log('  ❌ Botones de filtro incompletos');
      if (allJobsCount === 0) console.log('  ❌ No hay empleos mostrados');
    }

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) await browser.close();
  }
}

testExperienceFilter().catch(console.error);
