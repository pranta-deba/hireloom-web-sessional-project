/**
 * Firebase is initialised lazily from the config the admin saves in the dashboard
 * (served by /api/config/public) — no keys are baked into the build.
 */
let cached = { key: '', auth: null };

export async function getFirebaseAuth(config) {
  if (!config?.apiKey) throw new Error('Firebase is not configured. An admin can enable it in Dashboard → Settings → Firebase.');
  const key = `${config.apiKey}|${config.projectId}|${config.appId}`;
  if (cached.auth && cached.key === key) return cached.auth;
  const [{ initializeApp, getApps, deleteApp }, { getAuth }] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  for (const app of getApps()) await deleteApp(app);
  const app = initializeApp(config);
  cached = { key, auth: getAuth(app) };
  return cached.auth;
}

export async function signInWithProvider(config, providerName) {
  const auth = await getFirebaseAuth(config);
  const { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut } = await import('firebase/auth');
  const provider = providerName === 'github' ? new GithubAuthProvider() : new GoogleAuthProvider();
  if (providerName === 'github') provider.addScope('user:email');
  else provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const idToken = await cred.user.getIdToken();
  await signOut(auth); // the server session is the source of truth
  return idToken;
}

/** Step 1 of phone auth — sends an SMS. Returns a confirmation handle. */
export async function startPhoneSignIn(config, phoneNumber, containerId) {
  const auth = await getFirebaseAuth(config);
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
  if (window.__hlRecaptcha) {
    try {
      window.__hlRecaptcha.clear();
    } catch {
      /* noop */
    }
  }
  window.__hlRecaptcha = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  return signInWithPhoneNumber(auth, phoneNumber, window.__hlRecaptcha);
}

/** Step 2 — confirm the SMS code and get an ID token for the server. */
export async function confirmPhoneCode(confirmation, code) {
  const cred = await confirmation.confirm(code);
  const token = await cred.user.getIdToken();
  const { signOut } = await import('firebase/auth');
  await signOut(cred.user.auth);
  return token;
}

export function firebaseError(e) {
  const code = e?.code || '';
  const map = {
    'auth/popup-closed-by-user': 'The sign-in popup was closed.',
    'auth/cancelled-popup-request': 'Another sign-in is already in progress.',
    'auth/invalid-phone-number': 'That phone number looks invalid. Use +countrycode format.',
    'auth/invalid-verification-code': 'Incorrect SMS code.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/unauthorized-domain': 'This domain is not authorised in Firebase → Authentication → Settings.',
    'auth/operation-not-allowed': 'This sign-in method is disabled in the Firebase console.',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email but a different sign-in method.',
  };
  return map[code] || e?.message || 'Authentication failed.';
}
