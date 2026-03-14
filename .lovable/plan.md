

## Plan: Add new changelog entries for recently shipped features

The current changelog has entries up to **v1.4.0** (March 10, 2026). We need to insert new entries for all the features built since then.

### New entries to add via the admin edge function

| Date | Version | Category | Title | Description |
|------|---------|----------|-------|-------------|
| 2026-03-14 | v1.6.0 | feature | **Web Search endpoint — /v1/search** | Search the web programmatically. Returns ranked results with titles, URLs, and snippets. Supports `num_results` and `country` parameters for geo-targeted queries. |
| 2026-03-13 | v1.5.2 | feature | **Branding extraction** | Add `"branding"` to the `formats` array on any scrape call to extract brand colors (CSS variables, theme-color meta), fonts, and logos automatically. |
| 2026-03-13 | v1.5.1 | feature | **Scrape actions — interact before scraping** | New `actions` parameter lets you click buttons, type into inputs, scroll, wait, and press keys before the page content is captured. |
| 2026-03-12 | v1.5.0 | feature | **Geo-targeted scraping** | New `location` parameter with `country` and `languages` fields to scrape pages as seen from a specific region. |
| 2026-03-11 | v1.4.1 | improvement | **Dynamic rate-limit documentation** | The API docs now pull plan limits directly from the database so credits, RPM, and pricing always stay up to date. |

### Implementation

Insert these 5 rows into the `changelog_entries` table via a database migration, ordered with the newest first. All entries will be `is_published = true`.

### Files changed

None — this is a data-only change via SQL migration.

