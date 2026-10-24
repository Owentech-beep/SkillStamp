import { db, firebaseAuth } from './config/firebase.js';
import { createApp } from './app.js';
const apiKey = process.env.FIREBASE_WEB_API_KEY;
if (!apiKey) throw new Error('Set FIREBASE_WEB_API_KEY in .env locally or in Render Environment.');
const projectId = process.env.FIREBASE_PROJECT_ID || 'skillstamp-web-app';
const app = createApp({ db, firebaseAuth, production: process.env.NODE_ENV === 'production', webConfig: {
  apiKey,
  projectId,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  appId: process.env.FIREBASE_WEB_APP_ID || '1:120846463454:web:bec41b0b6006416ebbed4f',
} });
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`SkillStamp running on port ${port}`));
