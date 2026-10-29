// Política editorial do conteúdo (CLAUDE.md §3 e §5), aplicada no pipeline de
// publicação além do schema. Detecta alterações que o schema aceita
// tecnicamente, mas que não podem ir ao ar sem decisão do responsável:
// serviços renomeados a ponto de mudar o significado, afirmações não
// confirmadas e dados pessoais/comerciais.

import { SERVICE_IDS, walkSchema } from './schema.js';

const normalize = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Termos que cada serviço precisa manter (qualquer um basta) para não mudar de significado.
 * Ex.: "Sistemas SCADA" pode virar "Supervisório SCADA", mas não "Consultoria".
 */
export const SERVICE_KEYWORDS = Object.freeze({
  'automacao-industrial': ['automacao'],
  'automacao-cag-hvac': ['cag', 'hvac'],
  'automacao-subestacoes': ['subesta'],
  'sistemas-scada': ['scada'],
  'clp-plc-ihm': ['clp', 'plc', 'ihm'],
  'inversores-frequencia': ['inversor'],
  'instrumentacao-industrial': ['instrumenta'],
  'redes-industriais': ['rede'],
  'fibra-optica-industrial': ['fibra'],
  'paineis-eletricos-automacao': ['painel', 'paineis'],
  'retrofit-modernizacao': ['retrofit', 'moderniza'],
  'manutencao-preventiva-corretiva': ['manutencao'],
  'termografia-inspecoes': ['termograf', 'inspec'],
  'eficiencia-energetica': ['eficiencia'],
  'projetos-engenharia': ['projeto', 'engenharia'],
  'laudos-documentacao': ['laudo', 'documenta'],
  'comissionamento-startup': ['comissionamento', 'startup', 'start-up'],
  'monitoramento-remoto-telemetria': ['monitoramento', 'telemetria'],
  'integracao-sistemas': ['integracao'],
  'treinamento-suporte': ['treinamento', 'suporte'],
  'rebobinagem-motores': ['rebobinagem'],
});

/** Afirmações que exigem confirmação do cliente antes de publicar (CLAUDE.md §5). */
const UNCONFIRMED_CLAIMS = [
  [/\d+\s*(?:anos|%|projetos|clientes|obras)/i, 'números de desempenho, anos de mercado ou quantidade de clientes'],
  [/certifica|\bISO\s*\d|\bNR-?\s?\d/i, 'certificações ou normas atendidas'],
  [/garanti/i, 'garantias'],
  [/\blíder\b|\bmelhor(?:es)?\b|número 1|nº 1/i, 'afirmações comparativas ("líder", "melhor")'],
  [/R\$|mensalidade|\bpreço|orçamento grátis|desconto/i, 'preços ou condições comerciais'],
  [/depoimento|nossos clientes|\bcases?\b/i, 'depoimentos, clientes ou cases'],
];

/** Dados que não podem ir ao site sem confirmação (CLAUDE.md §2 e §8). */
const PRIVATE_DATA = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/, 'endereço de e-mail'],
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b|\bcnpj\b/i, 'CNPJ'],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\bcpf\b/i, 'CPF'],
  [/\brua\s|\bav\.\s|avenida|\bcep\b|\b\d{5}-\d{3}\b/i, 'endereço'],
  [/(?:\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}/, 'número de telefone (o WhatsApp é fixo no código)'],
  [/https?:\/\/|www\./i, 'link (destinos são fixos no código)'],
];

/**
 * @param {import('./schema.js').Content} content conteúdo já válido pelo schema
 * @returns {{ path: string, message: string }[]}
 */
export function checkPolicy(content) {
  const errors = [];

  for (const id of SERVICE_IDS) {
    const title = normalize(content.services.items[id].title);
    if (!SERVICE_KEYWORDS[id].some((word) => title.includes(word))) {
      errors.push({
        path: `services.items.${id}.title`,
        message: `o nome mudou de significado (deve manter: ${SERVICE_KEYWORDS[id].join(' ou ')})`,
      });
    }
  }

  walkSchema((field, path) => {
    const value =
      field.kind === 'text'
        ? path.split('.').reduce((node, key) => node[key], content)
        : field.kind === 'image'
          ? path.split('.').reduce((node, key) => node[key], content).alt
          : null;
    if (typeof value !== 'string') return;
    const where = field.kind === 'image' ? `${path}.alt` : path;
    for (const [pattern, what] of UNCONFIRMED_CLAIMS) {
      if (pattern.test(value)) errors.push({ path: where, message: `contém ${what}: exige confirmação do cliente` });
    }
    for (const [pattern, what] of PRIVATE_DATA) {
      if (pattern.test(value)) errors.push({ path: where, message: `contém ${what}: não publicar sem autorização` });
    }
  });

  return errors;
}
