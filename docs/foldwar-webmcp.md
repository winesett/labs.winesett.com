# Fold War site tools

The Fold War homepage registers two top-level JavaScript WebMCP tools using
`document.modelContext.registerTool`, when available:

- `read_foldwar_guide`: reads the current homepage or fetches one of six public
  guides and returns its main content, title, source URL and links.
- `open_foldwar_guide`: navigates the same tab to a known public Fold War page.

Topics: overview, iphone_duo, naval_duel, tic_tac_toe, nearby_play, support,
privacy. Neither tool accepts arbitrary URLs. Fetches omit credentials and
reject redirects. Tools do not access app data, install/download apps, send
email, play games, or store visitor information. There is no external library,
API key, MCP server, tracking, or paid service.

The homepage is the entry point. Navigating to a guide unloads these tools;
the normal site links still work. Unsupported browsers keep the ordinary page.
The content is read from published HTML to avoid a separate stale fact sheet.
Keep development and release information accurate in those pages.

Implementation: inline module `foldwar-site-tools` in public/foldwar/index.html.
Validation: npm test; npm run verify; git diff --check; native browser tool
discovery, all seven read topics, and navigation to the Duo guide.

WebMCP assists agents after they visit a page. It is not a search registration,
ranking guarantee, or directory listing. Keep ordinary SEO and sitemap upkeep.

Official documentation consulted October 20, 2026:
- https://learn.chatgpt.com/docs/webmcp
- https://developer.chrome.com/docs/ai/webmcp/imperative-api
