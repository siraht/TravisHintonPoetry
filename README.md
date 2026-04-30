# Travis Hinton Poetry

Astro site and publishing workflow for poems maintained in the Obsidian vault at `/home/travis/Documents/Travis Obsidian`.

## Publishing contract

- Source of truth stays in Obsidian.
- A note is published only when its frontmatter includes:
  - `related: [[My Poetry]]`
  - `tags: PoetrySite`
- Public poem tags use `siteTags`; these appear as filter links and on individual poem pages.
- Favorites use `favorite: true`; favorite poems are promoted on listing pages and also appear under the generated `Favorites` filter.
- The sync script never edits the source vault.
- Local sync creates symlinks in `.poetry-source/` and generates deployable JSON in `src/data/poems.generated.json`.

Example frontmatter:

```yaml
---
related:
  - "[[My Poetry]]"
tags:
  - PoetrySite
createdon: 2017-09-23
favorite: true
siteTags:
  - insomnia
  - identity
---
```

## Commands

- `npm run sync`: scan the vault and regenerate published poem data
- `npm run dev`: run Astro locally
- `npm run build`: create the static site
- `npm run sync:publish`: sync, commit, and push changes
- `npm run cron:install`: install a local 30-minute cron entry
