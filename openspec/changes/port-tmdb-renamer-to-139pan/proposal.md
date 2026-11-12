## Why

The proven TMDB-assisted rename workflow in `guangyapan-tools` only supports Guangya Cloud, while the user's media library is also stored in China Mobile Cloud (`yun.139.com`). A native userscript adapter is needed so the same review-first, conflict-safe workflow can operate against 139pan without persisting cloud credentials.

## What Changes

- Create a self-contained Tampermonkey userscript for `https://yun.139.com/w/*`.
- Port filename parsing, TMDB lookup and matching, rename planning, manual episode selection, validation, execution verification, and session recovery from `guangyapan-tools`.
- Add a 139pan request observer that learns the authenticated `/hcy/file/list` and `/hcy/file/update` request context at runtime.
- Add a 139pan client that handles cursor pagination, normalizes file records, renames files, retries transient failures, and verifies final names.
- Derive the active series and season from the visible breadcrumb plus the latest captured directory request, because the SPA URL does not contain the directory ID.
- Add unit tests and a deterministic build that never calls the real 139pan or TMDB services.
- Keep real-account browser validation read-only until the user explicitly authorizes a reversible rename probe.

## Capabilities

### New Capabilities

- `tmdb-rename-workflow`: Review-first TMDB matching, manual correction, conflict validation, safe execution, verification, and recovery.
- `139pan-web-adapter`: Runtime request capture, directory discovery, cursor-based listing, normalized file records, and authenticated rename calls for China Mobile Cloud.
- `userscript-delivery`: Deterministic dependency-free userscript build, metadata, local checks, and installation artifact.

### Modified Capabilities

None.

## Impact

- New source, tests, build scripts, documentation, and generated userscript in this repository.
- Reads internal 139pan web APIs observed on `yun.139.com`; compatibility may require updates if the site changes.
- Reuses logic from the sibling `guangyapan-tools` repository with cloud-specific names and adapters separated.
- TMDB remains the only external metadata service; its token stays in userscript-isolated storage.
