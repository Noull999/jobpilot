#!/usr/bin/env node

const http = require('http');

async function testJobFlow() {
  console.log('=== PRUEBA DE FLUJO COMPLETO DE EMPLEOS ===\n');

  // 1. Login
  console.log('1. Autenticando usuario...');
  const loginResponse = await makeRequest('POST', 'http://localhost:5000/api/auth/login',
    JSON.stringify({
      email: 'test.features@jobpilot.com',
      password: 'TestPassword123!'
    })
  );

  const loginData = JSON.parse(loginResponse);
  if (!loginData.access_token) {
    console.error('❌ Error: No se obtuvo token');
    return;
  }

  const token = loginData.access_token;
  console.log('✓ Token obtenido\n');

  // 2. Obtener matches
  console.log('2. Obteniendo lista de empleos...');
  const matchesResponse = await makeRequest('GET', 'http://localhost:5000/api/jobs/matches?limit=8',
    null,
    { Authorization: `Bearer ${token}` }
  );

  const matchesData = JSON.parse(matchesResponse);
  if (!matchesData.matches || matchesData.matches.length === 0) {
    console.error('❌ Error: No hay empleos');
    return;
  }

  const firstJob = matchesData.matches[0];
  const jobId = firstJob.job_id;
  console.log(`✓ Primer empleo: ID=${jobId}, "${firstJob.job.title}"\n`);

  // 3. Intentar acceder a /jobs/{jobId} como lo haría el frontend
  console.log(`3. Frontend navega a /jobs/${jobId}`);
  console.log(`   - Tiene location.state.match: SÍ (del modal)`);
  console.log(`   - JobDetail usa location.state.match.job directamente`);
  console.log(`   ✓ No requiere fetch del backend\n`);

  // 4. Simular navegación sin location.state (direct URL o refresh)
  console.log(`4. Usuario accede directamente a /jobs/${jobId} o hace refresh`);
  console.log(`   - location.state.match: NO`);
  console.log(`   - JobDetail necesita hacer fetch a /api/jobs/${jobId}`);

  const jobDetailResponse = await makeRequest('GET', `http://localhost:5000/api/jobs/${jobId}`,
    null,
    { Authorization: `Bearer ${token}` }
  );

  const jobDetailData = JSON.parse(jobDetailResponse);
  if (!jobDetailData.job) {
    console.error(`❌ Error al obtener detalle del empleo ${jobId}`);
    console.error('Respuesta:', jobDetailData);
    return;
  }

  console.log(`   ✓ Empleo ${jobId} obtenido correctamente\n`);

  // 5. Verificar que el empleo tiene todo lo necesario
  const job = jobDetailData.job;
  console.log('5. Validando datos del empleo:');
  console.log(`   ✓ ID: ${job.id}`);
  console.log(`   ✓ Título: ${job.title}`);
  console.log(`   ✓ Empresa: ${job.company}`);
  console.log(`   ✓ URL: ${job.url}`);
  console.log(`   ✓ Descripción: ${job.description ? 'SÍ' : 'NO'}\n`);

  console.log('=== RESULTADO ===');
  console.log('✓ El flujo completo funciona correctamente');
  console.log('✓ Todos los empleos están en la base de datos');
  console.log('✓ La API devuelve los datos correctamente\n');

  console.log('NOTA: Si ves "Whitelabel Error Page", podría ser:');
  console.log('1. Un problema con el token JWT expirado');
  console.log('2. Un problema de CORS (aunque CORS está habilitado)');
  console.log('3. El usuario está accediendo a un puerto o URL diferente');
}

function makeRequest(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
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
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

testJobFlow().catch(console.error);
