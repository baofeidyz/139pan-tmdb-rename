## ADDED Requirements

### Requirement: TMDB metadata selection
The system SHALL search TMDB using the detected series name and SHALL require the user to explicitly select a series before loading episode metadata.

#### Scenario: Multiple search results
- **WHEN** TMDB returns one or more candidate series
- **THEN** the system displays the candidates and does not automatically choose the first result

### Requirement: Reviewable rename plan
The system SHALL parse current filenames, match regular and special episodes, preserve recognized variant tags, and display the old name, proposed episode, confidence evidence, target name, and warnings before any write.

#### Scenario: Ambiguous match
- **WHEN** a file lacks sufficient evidence for a high-confidence episode match
- **THEN** the row is not selected by default and the user can choose an episode or mark it unmatched

### Requirement: Blocking validation
The system MUST block execution for duplicate targets, occupied target names, stale sources, illegal names, or indistinguishable duplicate variants.

#### Scenario: Duplicate target
- **WHEN** two selected rows resolve to the same target filename
- **THEN** execution remains disabled and both conflicts are identified

### Requirement: Safe execution and recovery
The system SHALL re-read the directory before execution, handle swaps and cycles with unique temporary names, use bounded concurrency and retries, verify final names by file ID, and generate a recovery plan only for verified successes.

#### Scenario: Partial batch success
- **WHEN** some rename operations succeed and others fail
- **THEN** the system reports each result and offers recovery only for successfully verified items

### Requirement: Authentication failure handling
The system MUST stop scheduling new rename operations after a 401 or 403 response.

#### Scenario: Authorization expires mid-batch
- **WHEN** an update request returns 401 or 403
- **THEN** unscheduled items are skipped and the batch is reported as aborted
