import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Cópia nova do conteúdo padrão a cada chamada. */
export const loadDefaultContent = () =>
  JSON.parse(readFileSync(new URL('../content/content.json', import.meta.url), 'utf8'));
