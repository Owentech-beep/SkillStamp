# Migration notes

This package contains the full project source, not isolated snippets. Replace matching files together: old `users` Map imports are incompatible with the new auth routes.

- `server.js` and `app.js`: server startup, public health/config, headers, error handling and API protection.
- `config/firebase.js`: server Admin SDK setup using your private local/Render credentials.
- `client/firebase-client.js`: browser Firebase Auth source, bundled to `public/firebase-client.js`.
- `routes/auth.js`: ID-token verification and persistent profile onboarding.
- `routes/skills.js`: persistent assessments, atomic credential issuance and verification.
- `routes/community.js`: profile updates, applications and notifications.
- `public/app.js` and `public/verify.js`: coordinated frontend integration; old browser grading removed.
- HTML: existing layout retained, inline click handlers converted for CSP, password reset button, read-only sign-in email and removal of misleading reset-demo deletion control.
- `.env.example`, `firestore.rules`, README: local/cloud setup.
- Tests: emulator API integration and DOM interactions.

Your recently added `config/firebase.js` and `public/firebase-client.js` are superseded by these versions. Keep your `.env` and private JSON but add the new web environment values. Do not retain a hardcoded web key inside generated public/firebase-client.js; the build replaces it.

The old in-memory records cannot be recovered by this migration. Browser-local documents remain local and are keyed by account email as before.
