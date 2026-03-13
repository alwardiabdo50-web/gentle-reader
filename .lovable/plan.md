

## SDK & Code Generation for Docs Page

### What Changes

Update `src/pages/DocsPage.tsx` to:

1. **Fetch the user's API keys** from the `api_keys` table (active ones only) and let them pick which key to use via a dropdown at the top of the docs page. The selected key prefix is displayed (actual key isn't stored, so we show `nc_live_xxxx...` as placeholder but with their real prefix).

2. **Add a language switcher** (cURL / Python / Node.js) to each endpoint section. Each tab auto-generates the snippet with the selected API key prefix placeholder.

3. **Add Pipeline endpoint docs** — the new `/v1/pipeline` endpoint is missing from the docs page. Add it as a new tab alongside Scrape, Crawl, Map, Extract, Usage.

4. **SDK install banners** — when Python or Node.js is selected, show a one-liner install command at the top (`pip install requests` / `npm install node-fetch` or native fetch).

### Implementation Details

- **API key selector**: A `<Select>` dropdown at the top of the page listing active keys by name + prefix. Default text: `nc_live_your_api_key_here`. When a key is selected, all snippets update to show `nc_live_XXXXX...` (prefix only, since we don't have the full key — include a note saying "Replace with your full API key").

- **Snippet generation**: A helper function `generateSnippets(endpoint, params, apiKeyPlaceholder)` returns `{ curl, python, nodejs }` strings. Each endpoint tab uses a nested `<Tabs>` for language selection.

- **Python snippets**: Use `requests` library with `requests.post(url, json=body, headers=headers)` pattern.

- **Node.js snippets**: Use native `fetch()` with `JSON.stringify(body)`.

- **Pipeline tab**: Documents `POST /v1/pipeline` with inline and saved pipeline modes, parameters table, and examples for all 3 languages.

### Files

| File | Action |
|------|--------|
| `src/pages/DocsPage.tsx` | Major rewrite — add language tabs, API key selector, pipeline docs, snippet generation |

### No database or edge function changes needed.

