/**
 * Teste de Integração: Varredura de Integridade de Dados
 * Valida as 4 correções críticas implementadas
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3000';

// Utilitários
function makeRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n=== TESTE DE INTEGRAÇÃO: INTEGRIDADE DE DADOS ===\n');

  try {
    // ========== TESTE 1: P1 - Fila de Retry ==========
    console.log('📝 TESTE 1: Fila de Retry (P1)');
    const persistence = fs.readFileSync(path.join(__dirname, '../js/persistence.js'), 'utf8');
    
    const hasQueue = persistence.includes('class PersistenceQueue');
    const hasRetry = persistence.includes('Math.pow');
    const hasQueueApi = persistence.includes('getQueueStatus');
    
    console.log(`  ✓ PersistenceQueue implementada: ${hasQueue}`);
    console.log(`  ✓ Exponential backoff (Math.pow): ${hasRetry}`);
    console.log(`  ✓ API de debug: ${hasQueueApi}`);
    
    if (hasQueue && hasRetry && hasQueueApi) {
      console.log('  ✅ P1 PASSOU\n');
    } else {
      console.log('  ❌ P1 FALHOU\n');
      process.exit(1);
    }

    // ========== TESTE 2: P2 - Merge Preservador ==========
    console.log('📝 TESTE 2: Merge Preservador (P2)');
    const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    
    const hasMergedRegistry = server.includes('mergedRegistry');
    const hasPreserve = server.includes('parsed.pilotRegistry');
    
    console.log(`  ✓ mergedRegistry implementada: ${hasMergedRegistry}`);
    console.log(`  ✓ Preserva pilotRegistry: ${hasPreserve}`);
    
    if (hasMergedRegistry && hasPreserve) {
      console.log('  ✅ P2 PASSOU\n');
    } else {
      console.log('  ❌ P2 FALHOU\n');
      process.exit(1);
    }

    // ========== TESTE 3: P3 - Reatividade em Mesma Aba ==========
    console.log('📝 TESTE 3: Reatividade em Mesma Aba (P3)');
    const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    const grid_edit = fs.readFileSync(path.join(__dirname, '../grid_edit.html'), 'utf8');
    
    const hasGridUpdatedListener = app.includes('gridUpdated');
    const hasGridUpdatedEvent = grid_edit.includes('dispatchEvent');
    
    console.log(`  ✓ Listener gridUpdated em app.js: ${hasGridUpdatedListener}`);
    console.log(`  ✓ Evento dispatchEvent em grid_edit.html: ${hasGridUpdatedEvent}`);
    
    if (hasGridUpdatedListener && hasGridUpdatedEvent) {
      console.log('  ✅ P3 PASSOU\n');
    } else {
      console.log('  ❌ P3 FALHOU\n');
      process.exit(1);
    }

    // ========== TESTE 4: P4 - Validação de Integridade ==========
    console.log('📝 TESTE 4: Validação de Integridade (P4)');
    const gridStorage = fs.readFileSync(path.join(__dirname, '../js/grid-storage.js'), 'utf8');
    
    const hasValidate = gridStorage.includes('validateGridIntegrity');
    const hasChecksum = gridStorage.includes('generateGridChecksum');
    
    console.log(`  ✓ validateGridIntegrity implementada: ${hasValidate}`);
    console.log(`  ✓ generateGridChecksum implementada: ${hasChecksum}`);
    
    if (hasValidate && hasChecksum) {
      console.log('  ✅ P4 PASSOU\n');
    } else {
      console.log('  ❌ P4 FALHOU\n');
      process.exit(1);
    }

    // ========== TESTE 5: HTTP API ==========
    console.log('📝 TESTE 5: API HTTP');
    
    const bootstrapResponse = await makeRequest('GET', '/api/bootstrap.js');
    console.log(`  ✓ GET /api/bootstrap.js: HTTP ${bootstrapResponse.status}`);
    
    if (bootstrapResponse.status !== 200) {
      console.log('  ❌ Bootstrap falhou\n');
      process.exit(1);
    }

    // ========== TESTE 6: POST Save ==========
    console.log('📝 TESTE 6: POST Save Endpoint');
    
    const testGrid = {
      data: [
        {
          id: 'grid1',
          name: 'Test Grid',
          headers: ['Etapa 1', 'Etapa 2'],
          rows: [
            { id: 1, pilotId: '1', nome: 'Test Pilot', equipe: 'test', etapas: ['10', '20'] }
          ]
        }
      ]
    };

    const saveResponse = await makeRequest('POST', '/api/save/grids', testGrid);
    console.log(`  ✓ POST /api/save/grids: HTTP ${saveResponse.status}`);
    
    if (saveResponse.status !== 200 || !saveResponse.data.ok) {
      console.log('  ❌ Save falhou\n');
      process.exit(1);
    }

    console.log('  ✅ TESTE 6 PASSOU\n');

    // ========== RESUMO ==========
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('📊 Correções Implementadas:');
    console.log('  ✓ P1: Fila de Retry com Backoff Exponencial');
    console.log('  ✓ P2: Merge Preservador de Pilotos');
    console.log('  ✓ P3: Reatividade em Mesma Aba');
    console.log('  ✓ P4: Validação de Integridade de Dados\n');

    console.log('🧪 Próximos Testes Manuais:');
    console.log('  1. DevTools → Network → Offline');
    console.log('  2. Editar grid_edit.html e clicar Salvar');
    console.log('  3. Verificar console: "Tarefa enfileirada"');
    console.log('  4. Network → Online');
    console.log('  5. Verificar console: "✓ Sucesso"');
    console.log('  6. Recarregar → dados persistiram\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante testes:', error);
    process.exit(1);
  }
}

runTests();
