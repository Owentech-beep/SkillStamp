import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
let ready;
async function getClientAuth() {
  if (!ready) ready = (async () => {
    const response = await fetch('/api/firebase-config', { credentials: 'omit' });
    if (!response.ok) throw new Error('Could not load Firebase configuration.');
    const config = await response.json();
    const auth = getAuth(initializeApp(config));
    await auth.authStateReady();
    return auth;
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}
function readable(error) {
  const messages = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account already uses this email. Log in or reset your password.',
    'auth/weak-password': 'Choose a stronger password of at least 8 characters.',
    'auth/password-does-not-meet-requirements': 'Your password does not meet the project password policy.',
    'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
    'auth/network-request-failed': 'Connection failed. Check your internet and try again.',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase.',
    'auth/invalid-api-key': 'Check the Firebase web API key on the server.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/user-disabled': 'This account is disabled.',
  };
  return new Error(messages[error.code] || 'Authentication failed. Please try again.');
}
export async function loginAccount(email, password) {
  try { return (await signInWithEmailAndPassword(await getClientAuth(), email.trim(), password)).user; }
  catch (error) { throw readable(error); }
}
export async function registerAccount(email, password) {
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
  const auth = await getClientAuth();
  try { return (await createUserWithEmailAndPassword(auth, email.trim(), password)).user; }
  catch (error) {
    // Recover a signup where Auth succeeded but the profile request failed.
    // The password must still be proved; the server preserves any existing role.
    if (error.code === 'auth/email-already-in-use') return loginAccount(email, password);
    throw readable(error);
  }
}
export async function apiRequest(url, options = {}) {
  const target = new URL(url, location.origin);
  if (target.origin !== location.origin || !target.pathname.startsWith('/api/')) throw new Error('Invalid API URL.');
  const auth = await getClientAuth();
  const user = auth.currentUser;
  if (!user) { const error = new Error('Please log in to continue.'); error.status = 401; throw error; }
  const token = await user.getIdToken();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(target, { ...options, headers, credentials: 'omit', cache: 'no-store' });
  let data;
  try { data = await response.json(); } catch { throw new Error('The server returned an unexpected response.'); }
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed.');
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}
export async function logoutAccount() {
  const auth = await getClientAuth();
  let failure;
  try { if (auth.currentUser) await apiRequest('/api/auth/logout', { method: 'POST' }); }
  catch (error) { if (error.status !== 401) failure = error; }
  finally { await signOut(auth); }
  if (failure) throw new Error('Signed out of this browser, but could not revoke other sessions.');
}
export async function resetPassword(email) {
  try { await sendPasswordResetEmail(await getClientAuth(), email.trim()); }
  catch (error) {
    if (error.code !== 'auth/user-not-found') throw readable(error);
  }
}
