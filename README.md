# SkillStamp

SkillStamp is a hackathon prototype that lets students complete practical
skills challenges, earn digital credentials and demonstrate their skills
to employers.

## Technology

- Frontend: HTML, CSS and vanilla JavaScript
- Backend: Node.js and Express
- Authentication: bcrypt password hashing and cookie-based sessions
- Storage: temporary, in-memory data; no database

## Features

- Student and employer registration and login
- Profile editing
- Challenge browsing and server-side assessment scoring
- Unique SkillStamp credentials
- Student portfolio and dashboard statistics
- Employer credential verification
- Mock opportunities and application submission
- In-app notifications

## Run locally

Use Node.js 24.

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

For normal execution without the development watcher:

```bash
npm start
```

## Demo journey

1. Register as a student.
2. Complete the Excel Data Analysis challenge.
3. View the score and credential in the portfolio.
4. Copy the credential ID.
5. Open a separate private browser window.
6. Register as an employer and verify the credential.
7. Return to the student account, apply for a mock opportunity and view
   notifications on the dashboard.

## Example Excel submission

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