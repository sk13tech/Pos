import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User, type Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

// Lazy init — only create Firebase app if config exists
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function init() {
  if (app) return;
  if (!isConfigured) return;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// ---- Auth ----
export async function googleSignIn() {
  init();
  if (!auth) throw new Error('Firebase not configured');
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function googleSignOut() {
  if (!auth) return;
  await signOut(auth);
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('retail_panel_') && k !== 'retail_panel_dark') keysToRemove.push(k);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

export function onAuthChange(cb: (user: User | null) => void) {
  init();
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

export function getCurrentUser(): User | null {
  return auth?.currentUser ?? null;
}

// ---- Upload to cloud ----
function collectData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('retail_panel_') && key !== 'retail_panel_dark') {
      const val = localStorage.getItem(key);
      if (val !== null) {
        try { data[key] = JSON.parse(val); } catch { data[key] = val; }
      }
    }
  }
  data['_updatedAt'] = new Date().toISOString();
  return data;
}

export function syncToCloud(): void {
  const user = auth?.currentUser;
  if (!user || !db) return;
  setDoc(doc(db, 'users', user.uid), collectData()).catch(() => {});
}

export async function syncToCloudNow(): Promise<void> {
  const user = auth?.currentUser;
  if (!user || !db) throw new Error('Not signed in');
  await setDoc(doc(db, 'users', user.uid), collectData());
}

// ---- Download from cloud ----
export async function restoreFromCloud(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return false;
    const data = snap.data();
    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith('_')) continue;
      if (key.startsWith('retail_panel_')) {
        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      }
    }
    return true;
  } catch {
    return false;
  }
}

export type { User };
