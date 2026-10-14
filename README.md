# dasariprashant0.github.io

Source for [dasariprashant0.github.io](https://dasariprashant0.github.io/), Prashant Dasari's personal site.

- `index.html` is the whole site: one static page, no build step, no JavaScript dependencies.
- `assets/` holds the self-hosted font, project screenshots and `github.json`.
- `.github/workflows/github-stats.yml` runs `scripts/github-stats.mjs` daily to refresh `assets/github.json` with the repo's own token, so the GitHub cards never depend on a third-party service.
- The other folders are older practice projects kept online at their original paths.

To change the site, edit `index.html` and push to `main`. GitHub Pages publishes it.
