## 1. Project Foundation

- [x] 1.1 Create package scripts, userscript metadata, deterministic builder, and base documentation
- [x] 1.2 Port cloud-neutral filename parser, TMDB client, matcher, planner, UI, and shared contracts
- [x] 1.3 Port generic rename execution, retry, verification, and recovery orchestration

## 2. 139pan Adapter

- [x] 2.1 Implement request classification, header allowlisting, body parsing, and document-start fetch/XHR observation
- [x] 2.2 Implement 139pan file normalization, business-response handling, cursor pagination, and update calls
- [x] 2.3 Implement breadcrumb extraction, captured-directory state, season detection, and SPA context invalidation

## 3. Application Integration

- [x] 3.1 Wire directory scanning, TMDB selection, plan generation, manual correction, validation, execution, and recovery into the userscript application
- [x] 3.2 Update UI wording and status states for China Mobile Cloud while preserving accessible interactions
- [x] 3.3 Document the sanitized 139pan API contract and real-account validation boundary

## 4. Verification

- [x] 4.1 Add offline tests for parser, matcher, planner, TMDB client, UI, and generic execution behavior
- [x] 4.2 Add offline tests for 139pan observer, normalization, pagination, request construction, and context invalidation
- [x] 4.3 Run test, build, and combined checks; inspect the generated metadata for credential-safe output
- [x] 4.4 Use ego-browser to verify read-only injection assumptions and current 139pan page compatibility without renaming files

## 5. Preview Scan Regression

- [x] 5.1 Restore the confirmed TMDB series when revisiting a captured folder
- [x] 5.2 Show immediate running and completion feedback for search and preview rescans
- [x] 5.3 Add regression tests, rebuild, update the installed userscript, and verify the real-page flow

## 6. Preview Selection Controls

- [x] 6.1 Make row checkboxes visible against 139pan global styles
- [x] 6.2 Add select-all and clear-selection controls with safe eligibility rules
- [x] 6.3 Add regression tests, bump version, update the installed userscript, and verify without executing renames
