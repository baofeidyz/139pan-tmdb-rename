## ADDED Requirements

### Requirement: Minimal request observation
The system SHALL observe page `fetch` and `XMLHttpRequest` calls for the 139pan list and update endpoints at document start and SHALL retain only allowlisted headers, URLs, methods, request shapes, and timestamps in memory.

#### Scenario: Official list request occurs
- **WHEN** the 139pan page requests `/hcy/file/list`
- **THEN** the system captures enough context to replay directory listing without persisting credential values

### Requirement: Active directory discovery
The system SHALL identify the active directory from the latest list request's `parentFileId` and combine it with visible breadcrumb names to derive the series title, season number, and display path.

#### Scenario: User enters an S01 folder
- **WHEN** a list request for the new directory is captured and the breadcrumb ends in `S01`
- **THEN** the system treats the parent breadcrumb component as the series title and season 1 as the active season

### Requirement: Cursor-paginated listing
The system SHALL request all pages from `/hcy/file/list` by following `data.nextPageCursor` and normalize each `data.items` record into the cloud-neutral file contract.

#### Scenario: Directory has more than one page
- **WHEN** the first response contains a non-empty next-page cursor
- **THEN** the client requests subsequent pages until the cursor is empty without duplicating items

### Requirement: Authenticated rename update
The system SHALL rename a file through `/hcy/file/update` using the captured runtime authorization context and a body containing the file ID, full new name, and observed stable extras.

#### Scenario: Successful update response
- **WHEN** the endpoint returns HTTP success and a successful business code
- **THEN** the client reports success but still relies on a subsequent directory listing for final verification

### Requirement: Context invalidation
The system MUST clear an existing plan when the captured directory ID or breadcrumb display path changes.

#### Scenario: SPA navigation changes directory
- **WHEN** the user navigates to another directory without a full page reload
- **THEN** files, matches, validation, results, and recovery data from the previous directory are discarded
