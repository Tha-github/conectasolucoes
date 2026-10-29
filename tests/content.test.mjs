import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SERVICE_KEYWORDS, checkPolicy } from '../src/lib/policy.js';
import { SERVICE_IDS } from '../src/lib/schema.js';
import { validateContent } from '../src/lib/validate.js';
import { loadDefaultContent } from './helpers.mjs';

// Lista e ordem confirmadas pelo cliente (CLAUDE.md §3). Os nomes podem ser
// editados no painel, desde que mantenham o significado (src/lib/policy.js);
// por isso estes testes não exigem o texto exato do conteúdo atual.
const BRIEFING_SERVICES = [
  'Automação Industrial',
  'Automação de CAG / HVAC',
  'Automação de Subestações',
  'Sistemas SCADA',
  'CLP / PLC / IHM',
  'Inversores de Frequência',
  'Instrumentação Industrial',
  'Redes Industriais',
  'Fibra Óptica Industrial',
  'Painéis Elétricos e Automação',
  'Retrofit e Modernização',
  'Manutenção Preventiva e Corretiva',
  'Termografia e Inspeções Técnicas',
  'Eficiência Energética',
  'Projetos e Engenharia',
  'Laudos e Documentação Técnica',
  'Comissionamento e Startup',
  'Monitoramento Remoto / Telemetria',
  'Integração de Sistemas',
  'Treinamento e Suporte Técnico',
  'Rebobinagem de Motores Elétricos',
];

test('o conteúdo atual é válido e respeita a política editorial', () => {
  const content = loadDefaultContent();
  const result = validateContent(content);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.errors, null, 2));
  assert.deepEqual(checkPolicy(content), []);
});

test('o schema define exatamente 21 serviços, sem IDs repetidos, na ordem do briefing', () => {
  assert.equal(SERVICE_IDS.length, 21);
  assert.equal(new Set(SERVICE_IDS).size, 21);
  assert.deepEqual(Object.keys(SERVICE_KEYWORDS), [...SERVICE_IDS]);
});

test('os nomes do briefing passam na política de significado, posição por posição', () => {
  const content = loadDefaultContent();
  SERVICE_IDS.forEach((id, i) => {
    content.services.items[id].title = BRIEFING_SERVICES[i];
  });
  assert.deepEqual(checkPolicy(content), []);
});

test('o conteúdo tem os 21 serviços na ordem do schema', () => {
  assert.deepEqual(Object.keys(loadDefaultContent().services.items), [...SERVICE_IDS]);
});

test('rebobinagem de motores elétricos está incluída e não pode ser descaracterizada', () => {
  assert.ok(SERVICE_IDS.includes('rebobinagem-motores'));
  const content = loadDefaultContent();
  content.services.items['rebobinagem-motores'].title = 'Outros serviços';
  assert.deepEqual(
    checkPolicy(content).map((e) => e.path),
    ['services.items.rebobinagem-motores.title'],
  );
});

test('sem logotipo, o texto alternativo é o nome da marca (nunca uma marca inventada)', () => {
  const { brand } = loadDefaultContent();
  if (brand.logo.src === null) assert.equal(brand.logo.alt, brand.name);
  else assert.match(brand.logo.src, /^assets\/img\//);
});
