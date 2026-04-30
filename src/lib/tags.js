export const FAVORITES_TAG = {
  label: 'Favorites',
  slug: 'favorites',
};

const FAVORITE_TAG_SLUGS = new Set(['favorite', 'favorites']);

function dateValue(poem) {
  const timestamp = new Date(poem.sourceCreated).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizeTag(tag) {
  if (!tag || typeof tag !== 'object') return null;
  if (typeof tag.slug !== 'string' || typeof tag.label !== 'string') return null;

  const slug = tag.slug.trim();
  const label = tag.label.trim();

  if (!slug || !label) return null;

  return { label, slug };
}

function publicTagsForPoem(poem) {
  if (!Array.isArray(poem.publicTags)) return [];

  return poem.publicTags
    .map(normalizeTag)
    .filter(Boolean)
    .filter((tag) => !FAVORITE_TAG_SLUGS.has(tag.slug));
}

export function isFavoriteTagSlug(slug) {
  return FAVORITE_TAG_SLUGS.has(String(slug ?? '').trim());
}

export function getPoemTags(poem) {
  const tags = publicTagsForPoem(poem);

  if (poem.favorite) {
    return [FAVORITES_TAG, ...tags];
  }

  return tags;
}

export function getAllTags(poems) {
  const bySlug = new Map();

  if (poems.some((poem) => poem.favorite)) {
    bySlug.set(FAVORITES_TAG.slug, FAVORITES_TAG);
  }

  for (const poem of poems) {
    for (const tag of publicTagsForPoem(poem)) {
      if (!bySlug.has(tag.slug)) {
        bySlug.set(tag.slug, tag);
      }
    }
  }

  return [...bySlug.values()].sort((a, b) => {
    if (a.slug === FAVORITES_TAG.slug) return -1;
    if (b.slug === FAVORITES_TAG.slug) return 1;

    return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
  });
}

export function poemMatchesTag(poem, slug) {
  if (isFavoriteTagSlug(slug)) {
    return Boolean(poem.favorite);
  }

  return publicTagsForPoem(poem).some((tag) => tag.slug === slug);
}

export function findTagBySlug(poems, slug) {
  return getAllTags(poems).find((tag) => tag.slug === slug) ?? null;
}

export function sortPoemsForListing(poems) {
  return [...poems].sort((a, b) => {
    if (a.favorite !== b.favorite) {
      return a.favorite ? -1 : 1;
    }

    return dateValue(b) - dateValue(a);
  });
}
