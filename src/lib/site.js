// Dados de contato e destinos de link. Fixos no código: o painel não altera
// destinos (CLAUDE.md §4). Número confirmado pelo cliente (CLAUDE.md §3).

export const WHATSAPP = Object.freeze({
  number: '5591980958661',
  display: '(91) 98095-8661',
  message: 'Olá! Gostaria de falar com a Conecta Soluções sobre um serviço.',
});

/** Região de atendimento confirmada (CLAUDE.md §3), usada nos dados estruturados. */
export const AREA_SERVED = 'Região Norte do Brasil';

/** URL do wa.me com a mensagem pré-preenchida codificada. */
export const whatsappUrl = (message = WHATSAPP.message) =>
  `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(message)}`;

/**
 * Repositório do site no GitHub, usado só para o painel montar links de envio
 * (docs/publicacao.md). Com owner/name null, o painel mostra as instruções sem
 * links. Não é credencial: o envio exige que a pessoa esteja autenticada no
 * github.com com permissão de escrita.
 */
export const REPOSITORY = Object.freeze({ owner: 'Tha-github', name: 'conectasolucoes', branch: 'main' });

const GITHUB_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/;

/**
 * Página de envio de arquivos do GitHub para uma pasta do repositório, ou null
 * se o repositório não estiver configurado.
 * @param {'content' | 'src/assets/img'} dir
 */
export function githubUploadUrl(dir, repo = REPOSITORY) {
  if (!repo.owner || !repo.name || !GITHUB_NAME.test(repo.owner) || !GITHUB_NAME.test(repo.name)) return null;
  if (!['content', 'src/assets/img'].includes(dir)) return null;
  return `https://github.com/${repo.owner}/${repo.name}/upload/${encodeURIComponent(repo.branch)}/${dir}`;
}
