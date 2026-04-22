import { marked } from 'marked';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

marked.use({
  gfm: true,
  breaks: true,
});

function normalizeObsidianMarkdown(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1');
}

export function formatDate(value) {
  if (!value) return 'Undated';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return DATE_FORMATTER.format(date);
}

export function bodyToPlainText(body) {
  return normalizeObsidianMarkdown(body)
    .replace(/`{1,3}/g, '')
    .replace(/[*_~]+/g, '')
    .trim();
}

export function makeExcerpt(body, maxLength = 180) {
  const plain = bodyToPlainText(body).replace(/\s+/g, ' ');
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}...`;
}

export function renderPoemHtml(body) {
  const normalized = normalizeObsidianMarkdown(body).trim();

  if (!normalized) {
    return '<p class="empty-poem">No poem text yet.</p>';
  }

  const stanzas = normalized
    .split(/\n\s*\n/g)
    .map((stanza) => stanza.trim())
    .filter(Boolean);

  return stanzas
    .map((stanza) => {
      const lines = stanza
        .split('\n')
        .map((line) => marked.parseInline(line.trimEnd()))
        .join('<br>');

      return `<p>${lines}</p>`;
    })
    .join('');
}
