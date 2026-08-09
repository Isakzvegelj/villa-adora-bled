# Villa Adora Bled

The primary static website for Villa Adora, a small luxury hotel on the shore of Lake Bled, Slovenia.

Live site: <https://isakzvegelj.github.io/villa-adora-bled/>

## Stack

- Plain HTML, CSS, and JavaScript
- Responsive, single-page layout
- Bentral booking and availability widgets
- GitHub Pages deployment

There is no build step. Preview the site locally with any static HTTP server:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Project structure

- `index.html` — page markup, SEO metadata, structured data, and booking embeds
- `styles.css` — responsive visual styles
- `script.js` — navigation, carousels, and restaurant reservation email flow
- `assets/` — images and icons
- `robots.txt` and `sitemap.xml` — search-engine metadata
- `.github/workflows/pages.yml` — GitHub Pages deployment

Booking and availability data are supplied by Bentral; verify those embeds and contact details when changing the site. Pushes to `main` deploy through GitHub Pages after the workflow is enabled in repository settings.

See [`LICENSE.md`](LICENSE.md) for usage terms.
