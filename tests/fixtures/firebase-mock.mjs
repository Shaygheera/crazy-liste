// Firebase simulé pour les tests : les modules du SDK (gstatic) sont remplacés par de petits modules
// qui parlent à un serveur fictif tenu ici, en mémoire, partagé entre plusieurs navigateurs (« appareils »).
// Seul le sous-ensemble utilisé par Crazy Liste est simulé. La règle d'accès des vraies règles Firestore
// (un compte ne lit et n'écrit que sous users/<son uid>/) est reproduite pour vérifier que l'application s'y conforme.
const API = 'https://mock-firebase.test';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };

const MODULES = {
  'firebase-app.js': `export function initializeApp(config) { return { config }; }`,
  'firebase-auth.js': `
const API = '${API}';
const KEY = '__mockFirebaseUser';
let current = JSON.parse(localStorage.getItem(KEY) || 'null');
const listeners = [];
export function getAuth(app) { return { app }; }
export class GoogleAuthProvider {}
export function onAuthStateChanged(auth, cb) { listeners.push(cb); setTimeout(() => cb(current), 0); return () => {}; }
export async function signInWithPopup(auth) {
  const r = await fetch(API + '/signin', { method: 'POST' });
  const j = await r.json();
  if (j.error) { const e = new Error(j.error); e.code = j.error; throw e; }
  current = j.user; localStorage.setItem(KEY, JSON.stringify(current));
  listeners.forEach((cb) => cb(current));
  return { user: current };
}
export async function signInWithRedirect() { throw Object.assign(new Error('redirect'), { code: 'auth/redirect-unsupported-in-mock' }); }
export async function signOut() { current = null; localStorage.removeItem(KEY); listeners.forEach((cb) => cb(null)); }`,
  'firebase-firestore.js': `
const API = '${API}';
const uid = () => (JSON.parse(localStorage.getItem('__mockFirebaseUser') || 'null') || {}).uid || '';
async function call(op, body) {
  const r = await fetch(API + '/' + op, { method: 'POST', headers: { 'content-type': 'application/json', 'x-uid': uid() }, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) { const e = new Error(j.error); e.code = j.error; throw e; }
  return j;
}
export function getFirestore() { return {}; }
export function collection(db, ...p) { return { kind: 'col', path: p.join('/') }; }
export function doc(db, ...p) { return { kind: 'doc', path: p.join('/'), id: p[p.length - 1] }; }
export async function setDoc(ref, data) { await call('set', { writes: [{ path: ref.path, data }] }); }
export function writeBatch() { const writes = []; return { set(ref, data) { writes.push({ path: ref.path, data }); }, commit() { return call('set', { writes }); } }; }
export function onSnapshot(ref, next, error) {
  let stop = false, last = null;
  async function tick() {
    if (stop) return;
    try {
      const j = await call(ref.kind === 'col' ? 'list' : 'get', { path: ref.path });
      const sig = JSON.stringify(j);
      if (sig !== last && !stop) {
        last = sig;
        if (ref.kind === 'col') next({ docs: j.docs.map((d) => ({ id: d.id, data: () => d.data })) });
        else next({ exists: () => j.data != null, data: () => j.data });
      }
    } catch (e) { if (!stop && error) error(e); }
    if (!stop) setTimeout(tick, 120);
  }
  tick();
  return () => { stop = true; };
}`
};

export function createFirebaseBackend() {
  const docs = new Map(); // chemin -> données
  const st = { docs, nextUser: { uid: 'user-1', email: 'moi@example.test', displayName: 'Moi' }, signinError: null, writes: 0, denied: 0 };
  const allowed = (uid, p) => uid && p.startsWith('users/' + uid + '/');
  async function handle(route) {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname === 'www.gstatic.com') {
      const name = url.pathname.split('/').pop();
      if (!MODULES[name]) return route.fulfill({ status: 404, headers: CORS, body: '' });
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/javascript' }, body: MODULES[name] });
    }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    const reply = (obj) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(obj) });
    const op = url.pathname.slice(1);
    if (op === 'signin') return reply(st.signinError ? { error: st.signinError } : { user: st.nextUser });
    const uid = req.headers()['x-uid'] || '';
    const body = JSON.parse(req.postData() || '{}');
    if (op === 'set') {
      if (!body.writes.every((w) => allowed(uid, w.path))) { st.denied++; return reply({ error: 'permission-denied' }); }
      for (const w of body.writes) { docs.set(w.path, JSON.parse(JSON.stringify(w.data))); st.writes++; }
      return reply({ ok: true });
    }
    if (!allowed(uid, body.path + '/')) { st.denied++; return reply({ error: 'permission-denied' }); }
    if (op === 'get') return reply({ data: docs.has(body.path) ? docs.get(body.path) : null });
    if (op === 'list') {
      const prefix = body.path + '/';
      const list = [...docs].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/')).map(([p, data]) => ({ id: p.slice(prefix.length), data }));
      return reply({ docs: list });
    }
    return reply({ error: 'unknown-op' });
  }
  return { st, docs, handle };
}
