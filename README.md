# SkillStamp — Firebase edition

 SkillStamp is a hackathon application that helps students and jobseekers complete practical skills challenges, earn digital credentials, and demonstrate their skills to employers. The existing HTML/CSS interface is retained. Express handles grading, credential issuance, role checks, and application logic.823727a (Migrate SkillStamp authentication and data to Firebase)

## Included scope

- Firebase email/password registration, login and password-reset email
- Persistent Firestore profiles, assessment attempts/results, SkillStamps, applications and notifications
- Student dashboard statistics and recommendations
- Server-scored challenges, one credential per student/challenge and 100 points per unique stamp
- Employer-only verification with private answers and email addresses excluded
- Mock opportunities, duplicate-application prevention and notification read state

## Install into your current project

1. Save a local backup or commit of your current source (never commit `.env` or `secrets/`).
2. Extract the contents of this archive's `SkillStamp` folder into your existing project root, beside `server.js`. Replace the matching source files. Do not create another nested project folder.
3. Keep your local `secrets/firebase-service-account.json`. It is deliberately absent from this archive.
4. Merge the settings in `.env.example` into your existing `.env`. Enter your real Firebase **web API key** as `FIREBASE_WEB_API_KEY`. The web key is public client configuration; the service-account private key is secret.
5. Run `npm ci` then `npm run dev` using Node.js 24.
6. Open http://localhost:3000. If an older service worker cached the original app, unregister it in browser DevTools → Application → Service workers, delete only the `skillstamp-*` caches and reload.

The archive replaces the manually created `public/firebase-client.js`. It is now generated from `client/firebase-client.js` during `npm run dev`, `npm start` or `npm run build`. Configuration is served from `/api/firebase-config`; do not paste the service account into any public file.

## Firebase console setup

Use project `skillstamp-web-app`:

1. Authentication → Sign-in method → enable Email/Password.
2. Authentication → Settings → Authorized domains: add `localhost` for local work and your actual Render hostname for deployment.
3. Configure a password policy with a minimum of eight characters. The frontend also checks eight characters, but the Firebase policy is the enforcement point.
4. Create a **Cloud Firestore Standard** database with ID `(default)` in production mode. Realtime Database is not used.
5. In Firestore Rules, publish the contents of `firestore.rules` (deny client reads and writes). All application data goes through Express; Admin SDK access is authorised through IAM. Deny rules do not restrict Admin SDK, so API authorisation remains mandatory.
6. Keep the service-account JSON outside `public/` and ignored by Git.

Existing demo accounts and data in the previous server's memory are not migrated. Register again with Firebase. From then on data persists across restarts. If Firebase account creation succeeds but profile saving fails, sign in and complete the signup form with the same email/password; profile creation is retry-safe.

## Environment

| Variable | Local value / purpose |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | `./secrets/firebase-service-account.json` |
| `FIREBASE_PROJECT_ID` | `skillstamp-web-app` |
| `FIREBASE_WEB_API_KEY` | Real web API key from Firebase General → Your apps |
| `FIREBASE_AUTH_DOMAIN` | `skillstamp-web-app.firebaseapp.com` |
| `FIREBASE_WEB_APP_ID` | Your web app ID; supplied in `.env.example` |
| `PORT` | Defaults to 3000; Render supplies it |
| `NODE_ENV` | `production` on Render |

`SESSION_SECRET` is no longer used. There is no Express session cookie. The Firebase SDK persists sign-in state and refreshes ID tokens. Every protected API request includes a bearer token; Express verifies it (including revocation/disabled-user checks) and loads the role from Firestore. Old localStorage profile values cannot authorise API requests.

## Render

- Web Service, Node runtime, branch containing this migration
- Root directory: blank if `package.json` is at the repository root
- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`
- Set the Firebase web environment variables above and `NODE_ENV=production`
- Add the service-account JSON as a Render **Secret File** named `firebase-service-account.json`
- Set `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-service-account.json`
- Never set emulator environment variables in production

Start uses the build script too, so retain the build dependencies. Deploy one instance for this pilot: the API rate limiter uses process-local counters. Firestore data survives a restart or free-service sleep, but availability/cold starts still depend on the hosting plan.

## Demo and final acceptance checks

1. Register a student, update the name/skills/bio, refresh and confirm the profile.
2. Submit an incorrect answer: no credential should be issued.
3. Pass Excel with: `Total 4630. Average 661. Saturday highest. Recommend extra stock.`
4. Confirm portfolio history, one stamp and 100 points. Pass again: still one stamp.
5. Restart Node. Log in if needed. Confirm the same profile and credential remain.
6. In an InPrivate window, register an employer. Verify the student's `SS-...` ID. Invalid IDs must fail. Student accounts cannot use the verification API.
7. As a student, apply to a mock opportunity. Refresh: application remains, duplicates are blocked.
8. Confirm result, stamp and application notifications. Mark one read and refresh.
9. Log out. Protected API requests must fail. Logout revokes sessions across devices as well as signing out this browser.
10. Use Forgot password with a real email you own; check Firebase email templates/domain settings if delivery fails.

## Automated checks

```bash
npm run check
npm test
```

`npm test` runs DOM/interaction tests and skips the backend integration test unless Firebase emulators are enabled. To run the complete suite against isolated local Auth and Firestore emulators (Java 17+ needed for the pinned CLI/emulator):

```bash
FIREBASE_PROJECT_ID=demo-skillstamp npx --yes firebase-tools@14.0.0 emulators:exec --project demo-skillstamp --only auth,firestore "npm test"
```

The integration suite refuses any project other than `demo-skillstamp`. It tests genuine emulator-backed Auth/Firestore operations, concurrent transactions, record ownership, token revocation, and an actual Node process restart. It does not use your private service account or live project.

## Implementation and limits

- Passwords go directly from the Firebase browser SDK to Firebase Authentication. Express and Firestore never store passwords or hashes.
- Credentials, grading results and role changes are not accepted from browser input. Registration permits student/employer self-selection for the agreed demo; employer identity is **not** independently verified.
- Firestore transactions atomically commit assessment results, new credentials and notifications. Deterministic document keys prevent duplicate credentials/applications under concurrency. Replaying an identical attempt is idempotent.
- Profile name, location, skills and bio are editable. Sign-in email is read-only in this version; it is owned by Firebase Authentication and cannot be overwritten through the profile API.
- Notifications and portfolio results use single-field queries and sort in memory; no custom composite indexes are needed for this prototype. Larger datasets will require pagination before broad deployment.
- Challenge and opportunity catalogues remain server-owned static data. No editing feature was added. Grading remains the original simple rule-based demo; it does not certify real-world competence.
- Document uploads remain browser-local, as agreed. They are not synchronised to Firebase Storage.
- Helmet headers, a same-origin bearer-token API, JSON body limits, validation and API rate limiting are included. No permissive CORS is enabled. Auth relies on explicit bearer headers rather than automatically attached cookies, avoiding cookie-based CSRF on these endpoints.
- Firebase handles sign-in abuse controls. Public client config and web API keys are not a substitute for authorization.
- `npm audit` and production operations/review should be considered before a wider rollout. This deliverable is a tested migration for a controlled pilot, not a security certification.

<<<<<<< HEAD
Total: R4630.
Average: R661.
Saturday had the highest sales.
I recommend extra stock and staff on Saturday.

## Environment variables

- PORT: server port; defaults to 3000.
- SESSION_SECRET: set a strong random value on the hosting platform.
- NODE_ENV: set to production when deployed.

Do not commit secrets or .env files.

## Render deployment

- Service type: Web Service
- Runtime: Node
- Build command: npm ci
- Start command: npm start
- Health check path: /api/health

Deploy one server instance because application data and sessions are stored
in its memory.

## Prototype limitations

- Restarting or redeploying the server clears accounts, sessions,
  assessments, credentials, applications and notifications.
- Assessments use simple rules and keyword checks. They do not certify
  professional competence.
- Opportunities are fictional. Applications do not contact real employers.
- Existing document uploads are stored in the browser, not on the server.
- Employer registration is self-selected for demonstration purposes.
- Authentication and session storage are intended for a hackathon prototype.

## Collaboration

Create a branch for each change, push it and open a pull request into the
team's agreed integration branch. Coordinate before changing shared files
such as public/app.js.

Never commit node_modules, credentials or session cookies.
=======
No database, deployment or security-rule changes are applied to your live project by extracting this archive. Follow the setup above and complete the live acceptance checks before presenting.
>>>>>>> 823727a (Migrate SkillStamp authentication and data to Firebase)
