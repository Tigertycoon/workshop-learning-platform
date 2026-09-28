# Validation

Validation uses the maintained application and synthetic demo data. It does not establish production readiness, Unity gameplay, XR functionality or accessibility conformance.

## Recorded local check — 2026-09-28

On Windows with Node 22.17.1 and npm 11.19.1, setup, **14/14 integration tests**, both TypeScript checks and the Vite build passed. The dependency audit reported zero known vulnerabilities in each maintained package. CI run results are available in the repository's Actions tab.

The Unity sample imported and compiled in **Unity 6000.3.19f1**, using batch mode, and exited with code 0. This verifies package resolution and compilation; it is not a Play-mode, rendering or WebGL-build acceptance result. The project records this tested editor patch version.

## Automated coverage

`npm run check` typechecks the server, starts integration tests against an isolated temporary SQLite database, and typechecks/builds the React frontend. The tests cover:

- Required configuration, malformed JSON, missing routes/assets and baseline headers.
- Anonymous/learner denial at instructor routes, current-role authorization and invalid JWT identities/signatures.
- Registration validation, password hashing and rejection of supplied instructor roles.
- Group creation/joining, strict IDs and boolean progress updates.
- Content validation and transaction rollback after a simulated database write failure.
- Submission, instructor review, feedback and game unlock; empty submissions are rejected.
- CSV quoting and neutralization of spreadsheet-formula prefixes.
- Repeated demo initialization preserving accounts, progress and submissions, including refusal in production mode.
- Upload authorization, traversal and active-extension rejection, size limit and successful image retrieval.
- Login rate limiting with retry guidance.

`npm run audit` covers all three package lockfiles. `npm run publication:check` rejects runtime data and unreviewed file formats in the tracked source tree. CI scans all Git history with Gitleaks 8.30.1, downloaded from its official release and verified against a pinned SHA-256 checksum.

## Manual browser scope

The release check uses the built frontend, fictional learner/instructor accounts and a freshly created demo database. Screenshots under `docs/screenshots` document the sign-in, chapter overview, instructor review and mobile registration views.

The browser walkthrough verified learner sign-in, persisted task completion, exercise submission, instructor sign-in/review, visible feedback after signing back in as the learner, and the resulting games unlock. The empty optional game catalog gives a clear message. Registration is also inspected at a 390 × 844 mobile breakpoint.

## Boundaries

Dependency and secret scans are useful detection tools, not guarantees that all defects or sensitive information can be recognized. Optional local WebGL builds are not part of the demo or test suite. Internet deployment, performance/load testing and third-party game compatibility require separate work.
