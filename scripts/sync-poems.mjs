import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';
import fg from 'fast-glob';

const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);
const vaultRoot = process.env.POETRY_VAULT_PATH || '/home/travis/Documents/Travis Obsidian';
const symlinkRoot = path.join(projectRoot, '.poetry-source');
const outputFile = path.join(projectRoot, 'src/data/poems.generated.json');

function toArray(value) {
  if (Array.isArray(value)) return value.flatMap((item) => toArray(item));
  if (value == null) return [];
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}

function hasMarker(values, marker) {
  return values
    .map((value) => value.replace(/^["']|["']$/g, '').trim())
    .some((value) => value === marker);
}

function normalizePublicTag(value) {
  const label = String(value ?? '')
    .replace(/^#/, '')
    .replace(/^\[\[|\]\]$/g, '')
    .trim();

  if (!label) return null;

  const slug = slugify(label);
  if (!slug) return null;

  return { label, slug };
}

function parsePublicTags(frontmatterData) {
  const seen = new Set();
  const tags = [];

  for (const value of toArray(frontmatterData.siteTags)) {
    const tag = normalizePublicTag(value);
    if (!tag || seen.has(tag.slug)) continue;

    seen.add(tag.slug);
    tags.push(tag);
  }

  return tags;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return false;

  return ['true', 'yes', '1', 'favorite', 'featured'].includes(value.trim().toLowerCase());
}

function isFavorite(frontmatterData, publicTags) {
  if (parseBoolean(frontmatterData.favorite)) return true;

  return publicTags.some((tag) => tag.slug === 'favorite' || tag.slug === 'favorites');
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

function titleFromFile(filePath, frontmatterData) {
  if (typeof frontmatterData.title === 'string' && frontmatterData.title.trim()) {
    return frontmatterData.title.trim();
  }

  const stem = path.basename(filePath, path.extname(filePath));
  return stem.replace(/^\d{4}-\d{2}-\d{2}\s*[-–]?\s*/, '').trim() || stem;
}

function makeHash(input) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 8);
}

async function ensureCleanDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

function resolveCreatedAt(stats) {
  if (Number.isFinite(stats.birthtimeMs) && stats.birthtimeMs > 0) {
    return stats.birthtime;
  }

  return stats.mtime;
}

function resolveFrontmatterCreatedOn(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const normalized = String(value).trim();
  if (!normalized) return null;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

async function main() {
  const files = await fg('**/*.md', {
    cwd: vaultRoot,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
  });

  const entries = [];
  const usedSlugs = new Set();

  await ensureCleanDir(symlinkRoot);

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = matter(raw);
    const related = toArray(parsed.data.related);
    const tags = toArray(parsed.data.tags);

    const include =
      hasMarker(related, '[[My Poetry]]') &&
      hasMarker(tags, 'PoetrySite');

    if (!include) continue;

    const stats = await fs.stat(file);
    const createdAt =
      resolveFrontmatterCreatedOn(parsed.data.createdon) ??
      resolveCreatedAt(stats);
    const relativeSourcePath = path.relative(vaultRoot, file);
    const title = titleFromFile(file, parsed.data);
    const baseSlug = slugify(title) || slugify(relativeSourcePath) || `poem-${makeHash(relativeSourcePath)}`;
    const slug = usedSlugs.has(baseSlug) ? `${baseSlug}-${makeHash(relativeSourcePath)}` : baseSlug;
    usedSlugs.add(slug);
    const publicTags = parsePublicTags(parsed.data);
    const favorite = isFavorite(parsed.data, publicTags);

    const linkName = `${slug}.md`;
    const linkPath = path.join(symlinkRoot, linkName);
    await fs.symlink(file, linkPath);

    const cleanBody = parsed.content.replace(/\r\n/g, '\n').trim();
    const excerptSource = cleanBody.split(/\n\s*\n/).find(Boolean) ?? cleanBody;

    entries.push({
      slug,
      title,
      excerpt: excerptSource.replace(/\n+/g, ' ').trim().slice(0, 220),
      body: cleanBody,
      publicTags,
      favorite,
      relativeSourcePath,
      symlinkPath: path.relative(projectRoot, linkPath),
      sourceModified: stats.mtime.toISOString(),
      sourceCreated: createdAt.toISOString(),
    });
  }

  entries.sort((a, b) => new Date(b.sourceCreated) - new Date(a.sourceCreated));

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(entries, null, 2)}\n`);

  console.log(`Synced ${entries.length} poems from ${vaultRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
