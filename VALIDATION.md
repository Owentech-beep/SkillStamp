# Validation

Completed 23 October 2026 against the packaged source:

- `npm run build`: Firebase browser bundle built successfully.
- `npm run check`: all JavaScript syntax checks passed.
- Firebase Auth + Firestore emulator suite: **25 tests passed, 0 failed, 0 skipped** (including nested tests).
- Actual Node process stopped and restarted while emulator database stayed running; user, credential, application and notification read state remained available.
- Two concurrent passing attempts produced one credential; two concurrent applications produced one application.
- Missing/invalid/revoked tokens, disabled users, wrong-role operations and other users' records were rejected.
- DOM tests exercised startup on nine existing pages, login failure feedback, assessment submission, application submission and employer verification.

Boundaries:

- Emulator tests used `demo-skillstamp`, never the user's project.
- DOM tests simulate backend responses; they are not real browser network/end-to-end tests.
- No private service account or real web API key was supplied to this environment.
- Live email delivery, Firebase console rules/configuration, production IAM and Render deployment must still be verified by the owner using the README checklist.
- No claim of production security certification is made.
