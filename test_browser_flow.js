const puppeteer = require('puppeteer');

async function testBrowserFlow() {
  console.log('=== PRUEBA DE FLUJO EN EL NAVEGADOR ===\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Capturar errores HTTP
    const httpErrors = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        httpErrors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });

    console.log('1. Abriendo aplicación...');
    await page.goto('http://localhost:5188', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Aplicación cargada\n');

    console.log('2. Navegando a login...');
    await page.goto('http://localhost:5188/login', { waitUntil: 'networkidle2' });
    console.log('✓ Página de login cargada\n');

    console.log('3. Ingresando credenciales...');
    await page.type('input[placeholder*="correo"], input[type="email"]', 'test.features@jobpilot.com', { delay: 10 });
    await page.type('input[type="password"]', 'TestPassword123!', { delay: 10 });
    console.log('✓ Credenciales ingresadas\n');

    console.log('4. Haciendo click en login...');
    // Buscar el botón por contenido de texto
    await page.click('button');  // Click en el primer botón

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      console.log('✓ Login exitoso\n');
    } catch (e) {
      console.log('⚠ Timeout esperando navegación después del login\n');
    }

    console.log('5. Esperando dashboard...');
    try {
      await page.waitForFunction(() => {
        return document.body.innerText.includes('Empleos') || document.body.innerText.includes('empleos');
      }, { timeout: 10000 });
      console.log('✓ Dashboard cargado\n');
    } catch (e) {
      console.log('⚠ Timeout esperando dashboard\n');
    }

    console.log('6. Buscando y clickeando botón "Ver todos"...');
    // Buscar botón que contenga "Ver todos" o "ver"
    const verTodosButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Ver todos') || btn.textContent.includes('todos'));
    });

    if (verTodosButton) {
      await page.evaluate(btn => btn.click(), verTodosButton);
      await page.waitForTimeout(1000);
      console.log('✓ Modal abierto\n');
    } else {
      console.log('⚠ No se encontró botón "Ver todos"\n');
    }

    console.log('7. Buscando el primer empleo en el modal...');
    const jobLinks = await page.$$('a[href*="/jobs/"]');
    console.log(`   Enlaces encontrados: ${jobLinks.length}`);

    if (jobLinks.length === 0) {
      console.log('⚠ No se encontraron enlaces a empleos\n');
      const pageContent = await page.content();
      if (pageContent.includes('job')) {
        console.log('   Pero hay menciones de "job" en la página');
      }
      return;
    }

    console.log('✓ Empleos encontrados\n');

    console.log('8. Obteniendo el primer empleo...');
    const firstJobLink = jobLinks[0];
    const firstJobHref = await page.evaluate(el => el.href, firstJobLink);
    console.log(`   Href: ${firstJobHref}\n`);

    console.log('9. Haciendo click en el primer empleo...');

    // Limpiar errores anteriores
    httpErrors.length = 0;

    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
        firstJobLink.click()
      ]);
      console.log('✓ Navegación completada\n');
    } catch (e) {
      console.log(`⚠ Error/timeout en navegación: ${e.message}\n`);
    }

    console.log('10. Estado de la página:');
    const currentUrl = page.url();
    console.log(`    URL actual: ${currentUrl}`);

    // Ver si hay errores en la página
    if (httpErrors.length > 0) {
      console.log('\n    ⚠ ERRORES HTTP DETECTADOS:');
      httpErrors.slice(-5).forEach(err => console.log(`      - ${err}`));
    }

    // Buscar signos de error en el contenido
    const bodyText = await page.evaluate(() => document.body.innerText);

    if (bodyText.includes('Error') || bodyText.includes('error') || bodyText.includes('not found') || bodyText.includes('404')) {
      console.log('\n    ⚠ MENSAJE DE ERROR ENCONTRADO EN LA PÁGINA');
      const lines = bodyText.split('\n');
      lines.forEach(line => {
        if (line.toLowerCase().includes('error') || line.toLowerCase().includes('not found')) {
          console.log(`      > ${line.trim()}`);
        }
      });
    }

    // Verificar que la página de detalle cargó correctamente
    const hasJobDetail = await page.evaluate(() => {
      return document.body.innerText.includes('Compatibilidad') ||
             document.body.innerText.includes('compatibilidad') ||
             document.body.innerText.includes('Skills') ||
             document.body.innerText.includes('Empresa');
    });

    console.log(`\n    Página de detalle cargó: ${hasJobDetail ? 'SÍ ✓' : 'NO ❌'}`);

    console.log('\n=== RESUMEN ===');
    console.log(`Errores HTTP detectados: ${httpErrors.length}`);
    console.log(`URL final: ${currentUrl}`);
    console.log(`Contenido de detalle: ${hasJobDetail ? 'Presente' : 'Ausente'}`);

  } catch (error) {
    console.error(`\n❌ ERROR FATAL:`);
    console.error(error.message);
  } finally {
    if (browser) await browser.close();
  }
}

testBrowserFlow();
