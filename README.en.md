# China Mobile Cloud TMDB Renamer

[中文](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/README.md) · [Quick Start (Chinese)](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/quick-start.md) · [Development Guide (Chinese)](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/development.md) · [API Contract](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/139pan-api-contract.md)

A review-first Tampermonkey userscript that uses TMDB episode metadata to rename TV files in China Mobile Cloud (`yun.139.com`). It generates a rename plan, reports confidence and conflicts, and makes changes only after explicit confirmation.

This project ports the proven TMDB-assisted workflow from [guangyapan-tools](https://github.com/baofeidyz/guangyapan-tools) and provides the China Mobile Cloud adapter.

## Highlights

- Automatic episode matching with regular seasons and `S00` specials
- Manual episode correction and full/compact naming modes
- Preview, selection, conflict detection, and confirmation before execution
- Live-state checks before renaming and final-name verification afterward
- A recovery plan for successful operations in the current session
- Cloud authorization is kept in page memory; the TMDB token stays in userscript-isolated storage

## Quick start

Requirements: a modern browser, [Tampermonkey](https://www.tampermonkey.net/), a [TMDB Read Access Token](https://www.themoviedb.org/settings/api), and Node.js 20+ for building.

```bash
git clone https://github.com/baofeidyz/139pan-tmdb-rename.git
cd 139pan-tmdb-rename
npm run build
```

Create a new Tampermonkey script and paste the complete contents of `dist/139pan-tmdb-renamer.user.js`. Then:

1. Open an `Sxx` season folder on [China Mobile Cloud](https://yun.139.com/w/).
2. Refresh the file list so the script can observe the page's authenticated request.
3. Open “TMDB 重命名”, save your TMDB Read Access Token, and search for the show.
4. Confirm the correct TMDB result, review the generated plan, and correct uncertain matches.
5. Select only the intended files and confirm execution.

Start with a small, recoverable test folder. The complete operational guide is currently maintained in Chinese in the [Quick Start guide](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/quick-start.md).

## Development

```bash
npm test
npm run build
npm run check
```

The deterministic build output is `dist/139pan-tmdb-renamer.user.js`. See the [Development Guide](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/development.md) for architecture, module order, testing, and contribution checks.

## Security

Never include tokens, authorization headers, cookies, file IDs, or account data in bug reports. Tests are offline and do not access real TMDB or China Mobile Cloud accounts. The site uses internal web APIs that may change; see the [sanitized API contract](https://github.com/baofeidyz/139pan-tmdb-rename/blob/main/docs/139pan-api-contract.md).

Please report issues through [GitHub Issues](https://github.com/baofeidyz/139pan-tmdb-rename/issues).
