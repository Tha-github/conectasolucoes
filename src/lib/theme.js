// CSS das cores do tema (--color-*), a partir de theme.colors já validado
// (#RRGGBB, chaves do schema). Usado pelo build (css/theme.css) e pela prévia.

const toKebab = (name) => name.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);

/** @param {Record<string, string>} colors */
export function themeCss(colors) {
  const lines = Object.entries(colors).map(([name, hex]) => `  --color-${toKebab(name)}: ${hex};`);
  return `/* Gerado pelo build a partir de content/content.json. Não edite. */\n:root {\n${lines.join('\n')}\n}\n`;
}
