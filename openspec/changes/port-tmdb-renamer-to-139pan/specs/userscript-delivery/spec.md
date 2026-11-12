## ADDED Requirements

### Requirement: Installable userscript artifact
The system SHALL build a single dependency-free userscript that matches `https://yun.139.com/w/*`, starts at `document-start`, and declares only the GM capabilities and network connections it uses.

#### Scenario: Build completes
- **WHEN** the build command runs from a clean checkout
- **THEN** it produces the deterministic installable artifact under `dist/`

### Requirement: Offline automated checks
The system SHALL provide tests for parsing, matching, planning, UI behavior, request capture, 139pan response normalization, pagination, retry behavior, execution verification, and build metadata without accessing real cloud or TMDB accounts.

#### Scenario: Test suite runs
- **WHEN** the test command is executed without network access
- **THEN** all tests use local fixtures and injected request functions

### Requirement: Credential-safe artifacts
Source, fixtures, logs, documentation, and generated artifacts MUST NOT contain real 139pan authorization values, cookies, TMDB tokens, or account identifiers.

#### Scenario: Fixture records request headers
- **WHEN** an API fixture is added from observed traffic
- **THEN** it contains header names and sanitized shapes only, with all values synthetic or redacted
