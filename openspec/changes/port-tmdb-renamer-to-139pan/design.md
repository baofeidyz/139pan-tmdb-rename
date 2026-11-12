## Context

`guangyapan-tools` is a dependency-free userscript with well-tested parsing, TMDB matching, planning, validation, execution, and UI modules. China Mobile Cloud uses a different Vue SPA and internal API. Browser observation confirmed that directory contents are loaded through `POST https://personal-kd-njs.yun.139.com/hcy/file/list`; the official compatibility layer maps personal-cloud file and folder renames to `POST /hcy/file/update`. The SPA hash remains `#/index`, so the active directory must be learned from traffic and the visible breadcrumb.

The target repository currently contains only OpenSpec scaffolding. The implementation must remain installable as one userscript, must not persist 139pan credentials, and must not mutate the real account during automated validation.

## Goals / Non-Goals

**Goals:**

- Preserve the review-first TMDB rename workflow and safety behavior from the source project.
- Isolate cloud-specific behavior behind a small request observer and client.
- Capture only the minimum authenticated request context required for list and update calls.
- Support cursor pagination, stale-source detection, temporary-name phases for swaps/cycles, bounded retries, final-state verification, and session recovery.
- Produce a deterministic userscript and comprehensive offline tests.

**Non-Goals:**

- General 139pan file management, upload, download, sharing, or deletion.
- Persisting or exporting 139pan authorization headers or cookies.
- Reverse engineering mobile clients or bypassing account/security controls.
- Performing a real rename probe without separate user authorization.

## Decisions

### Reuse domain modules and replace the cloud adapter

Parser, matcher, planner, TMDB client, UI, and generic execution orchestration will be ported with product wording updated. `bridge.js`, the cloud client, and active-folder discovery will be 139pan-specific. This minimizes behavioral drift while keeping internal API assumptions localized.

Alternative: rewrite the project around the 139pan DOM. Rejected because DOM-only listing is incomplete under pagination/virtualization and cannot safely verify server state.

### Learn request context at `document-start`

The userscript will wrap page `fetch` and `XMLHttpRequest` before the SPA starts, classify only `/hcy/file/list` and `/hcy/file/update`, and retain allowlisted headers plus redacted request shapes in memory. The latest successful list capture identifies the active `parentFileId` and provides pagination defaults.

Alternative: read tokens from local/session storage. Rejected because it couples the script to credential storage details and increases exposure.

### Replay observed API requests using `GM_xmlhttpRequest`

The client will use the captured URL, allowlisted headers, and stable request fields. List requests replace only cursor and `parentFileId`; update requests send `fileId`, `name`, and observed stable extras such as `description`.

Alternative: invoke the site's bundled functions. Rejected because webpack module identities and application internals are less stable and harder to test.

### Treat the breadcrumb as display metadata, not authority

The active directory ID comes from the latest list request. The visible breadcrumb supplies the current folder and parent series names; a MutationObserver plus list-capture events clears stale plans when either changes. Season detection requires an `Sxx` component.

### Keep writes gated and verifiable

The UI creates a preview first. Only selected, valid rows execute after confirmation. The executor re-lists before writing, uses unique temporary names for collisions, stops scheduling on authentication failures, re-lists after writing, and offers recovery only for items verified successful in the current session.

## Risks / Trade-offs

- **Internal API drift** → Classify by path suffix, learn request shapes dynamically, centralize compatibility code, and expose an explicit “waiting for page request” state.
- **Headers contain sensitive values** → Keep them in memory, allowlist keys, never log values, and use shape-only fixtures.
- **SPA navigation races** → Associate plans with captured `parentFileId` and breadcrumb key; invalidate immediately on change.
- **No observed real update request yet** → Base the initial contract on the site's shipped compatibility transform and keep real mutation validation separately gated.
- **Large directories** → Follow `nextPageCursor`, cap repeated cursors, and preserve deterministic ordering.
- **Source project divergence** → Copy the stable domain behavior now and keep cloud-neutral tests so later changes can be compared deliberately.

## Migration Plan

1. Port cloud-neutral modules and tests.
2. Implement and test the observer and 139pan client against sanitized fixtures.
3. Build the userscript and run all offline checks.
4. Install locally and perform read-only browser validation of injection, directory capture, listing, and preview.
5. Only after explicit approval, run one reversible rename-and-restore probe and document the observed update contract.

Rollback is removal/disablement of the userscript. A partial rename batch can use the current-session recovery plan after server-side verification.

## Open Questions

- Which update headers are strictly required versus merely emitted by the current web client?
- Does `/hcy/file/update` preserve the extension when `name` omits it, or must every call include the full filename? The implementation will conservatively send the full target name.
- Is `mediaMetaInfo` sufficient for all resolution/codec variants, or is a separate file-detail endpoint needed for sparse records?
