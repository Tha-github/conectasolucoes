// Migração explícita entre versões do schema de conteúdo.
//
// Para uma mudança incompatível no schema:
//   1. incremente SCHEMA_VERSION em schema.js;
//   2. registre aqui MIGRATIONS[versãoAnterior] = (dados) => dadosNaNovaVersão;
//   3. adicione um teste com um arquivo da versão anterior.
// Cada função recebe uma cópia e deve devolver o objeto com schemaVersion + 1.
// O resultado final ainda passa pela validação estrita (sem propriedades extras).

import { SCHEMA_VERSION } from './schema.js';

/** @type {Readonly<Record<number, (data: Record<string, unknown>) => Record<string, unknown>>>} */
/** Campos de imagem da versão 1 (fixos naquela versão; não derivar do schema atual). */
const V1_IMAGE_PATHS = [
  ['brand', 'logo'],
  ['hero', 'image'],
  ['about', 'image'],
];

/** Títulos padrão da versão 2 → [título v2, parte leve v3, destaque v3]. */
const V2_TITLE_SPLITS = {
  hero: [
    'Soluções técnicas para instalações industriais na Região Norte',
    'Soluções técnicas para instalações industriais',
    'na Região Norte',
  ],
  about: [
    'Engenharia e automação aplicadas à operação industrial',
    'Engenharia e automação',
    'aplicadas à operação industrial',
  ],
  services: ['Do projeto à manutenção', 'Do projeto', 'à manutenção'],
  approach: ['Atuação técnica e integrada', 'Atuação técnica', 'e integrada'],
  area: ['Região Norte do Brasil', 'Região Norte', 'do Brasil'],
  contact: ['Vamos conversar sobre a sua instalação?', 'Vamos conversar sobre', 'a sua instalação?'],
};

const v3Image = (src, alt) => ({ src: `assets/img/${src}`, alt, focus: 'center' });

/** Campos criados na versão 3, com os valores publicados naquela versão (fixos). */
const V3_ADDITIONS = {
  hero: {
    detail: v3Image('hero-sala-eletrica.webp', 'Sala elétrica com painéis de média tensão alinhados'),
    seal: { label: 'Atendimento', title: 'Região Norte', text: 'do Brasil' },
  },
  about: {
    cta: 'Falar com a equipe',
    gallery: {
      scada: v3Image('galeria-scada.webp', 'Estação de supervisão com telas de processo de uma central de água gelada'),
      protecao: v3Image(
        'galeria-protecao.webp',
        'Dispositivos de proteção e controle montados em trilho, com fiação identificada',
      ),
      paineis: v3Image('galeria-paineis.webp', 'Painel elétrico com medidores, sinalizadores e chaves de comando'),
      supervisao: v3Image('galeria-supervisao.webp', 'Sala de controle com mesa de operação e telas de supervisão'),
      transformador: v3Image(
        'galeria-transformador.webp',
        'Transformadores de potência instalados em ambiente abrigado',
      ),
      infraestrutura: v3Image(
        'galeria-infraestrutura.webp',
        'Eletrocalhas e leitos de cabos fixados no teto de uma instalação',
      ),
      subestacao: v3Image('galeria-subestacao.webp', 'Transformador de alta tensão no pátio de uma subestação'),
    },
    facts: {
      area: { label: 'Área', value: 'Engenharia e automação' },
      regiao: { label: 'Região', value: 'Norte do Brasil' },
      servicos: { label: 'Serviços', value: '21 frentes técnicas' },
      ciclo: { label: 'Atuação', value: 'Do projeto ao suporte' },
      motores: { label: 'Motores elétricos', value: 'Rebobinagem' },
      contato: { label: 'Contato', value: 'Pelo WhatsApp' },
    },
  },
  services: { cta: 'Consultar um serviço' },
  approach: {
    text: 'Automação, elétrica e instrumentação tratadas em conjunto, em todas as etapas da vida de uma instalação industrial.',
  },
  area: { cta: 'Consultar disponibilidade' },
  contact: {
    image: v3Image(
      'contato-planta-industrial.webp',
      'Vista aérea de uma planta industrial com tubulações, tanques e estruturas metálicas',
    ),
  },
};

export const MIGRATIONS = Object.freeze({
  // v1 → v2: imagens ganham "focus" (enquadramento). Valor neutro: "center".
  // Defensiva: dados não confiáveis; estruturas inesperadas ficam como estão
  // e a validação posterior aponta o problema.
  1: (data) => {
    for (const [group, key] of V1_IMAGE_PATHS) {
      const img = data[group]?.[key];
      if (img && typeof img === 'object' && !Array.isArray(img) && !Object.hasOwn(img, 'focus')) {
        img.focus = 'center';
      }
    }
    return { ...data, schemaVersion: 2 };
  },

  // v2 → v3: redesign estrutural. Títulos padrão da v2 são divididos entre a
  // parte leve e a parte em destaque; títulos personalizados ficam inteiros
  // (destaque vazio). Campos novos recebem os valores publicados com a v3.
  2: (data) => {
    for (const [group, values] of Object.entries(V3_ADDITIONS)) {
      const section = data[group];
      if (!section || typeof section !== 'object' || Array.isArray(section)) continue;
      const split = V2_TITLE_SPLITS[group];
      if (split && !Object.hasOwn(section, 'titleAccent')) {
        if (section.title === split[0]) [section.title, section.titleAccent] = split.slice(1);
        else section.titleAccent = '';
      }
      for (const [key, value] of Object.entries(values)) {
        if (!Object.hasOwn(section, key)) section[key] = structuredClone(value);
      }
    }
    return { ...data, schemaVersion: 3 };
  },
});

/**
 * @typedef {{ path: string, message: string }} MigrationError
 * @typedef {{ ok: true, value: Record<string, unknown>, from: number } | { ok: false, errors: MigrationError[] }} MigrationResult
 */

const fail = (message) => ({ ok: false, errors: [{ path: 'schemaVersion', message }] });

/**
 * Leva dados de qualquer versão suportada até a versão atual.
 * Não valida o conteúdo; use validateContent no resultado.
 * @param {unknown} data
 * @param {{ migrations?: typeof MIGRATIONS, target?: number }} [options]
 * @returns {MigrationResult}
 */
export function migrateContent(data, { migrations = MIGRATIONS, target = SCHEMA_VERSION } = {}) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, errors: [{ path: '', message: 'o conteúdo deve ser um objeto JSON' }] };
  }
  const from = /** @type {Record<string, unknown>} */ (data).schemaVersion;
  if (!Number.isInteger(from) || /** @type {number} */ (from) < 1) {
    return fail('ausente ou inválida (esperado um número inteiro a partir de 1)');
  }
  if (/** @type {number} */ (from) > target) {
    return fail(`versão ${from} é mais nova que a suportada (${target}); atualize o site antes de importar`);
  }

  let current = structuredClone(/** @type {Record<string, unknown>} */ (data));
  for (let version = /** @type {number} */ (from); version < target; version++) {
    const step = Object.hasOwn(migrations, version) ? migrations[version] : null;
    if (!step) return fail(`não há migração da versão ${version} para ${version + 1}`);
    current = step(structuredClone(current));
    if (current?.schemaVersion !== version + 1) {
      return fail(`a migração ${version} → ${version + 1} não atualizou schemaVersion`);
    }
  }
  return { ok: true, value: current, from: /** @type {number} */ (from) };
}
