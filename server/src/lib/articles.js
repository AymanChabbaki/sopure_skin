import { escapeHtml as esc } from './utils.js';

/**
 * Guide bodies are written as plain text in the admin: blank lines separate paragraphs,
 * "## " / "### " start headings and "- " lines form a list. Mirrored by ArticleBody in the client.
 */
export function parseArticle(text = '') {
  return String(text)
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const heading = block.match(/^(#{2,3})\s+(.*)$/s);
      if (heading) return { type: heading[1].length === 2 ? 'h2' : 'h3', text: heading[2].trim() };
      const lines = block.split('\n');
      if (lines.every((l) => /^[-•]\s+/.test(l))) return { type: 'ul', items: lines.map((l) => l.replace(/^[-•]\s+/, '')) };
      return { type: 'p', text: block };
    });
}

export const articleHtml = (text) =>
  parseArticle(text)
    .map((b) => (b.type === 'ul' ? `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : `<${b.type}>${esc(b.text)}</${b.type}>`))
    .join('');
