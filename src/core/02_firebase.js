// ── Firebase 初期化 ──────────────────────────────
// v3 の firebaseConfig をそのまま継承（データ互換のため変更禁止）
const firebaseConfig={
  apiKey:"AIzaSyAXWAtHjBOi31FoNXZiAwW-A7ywZcDY2mM",
  authDomain:"tennis-db-ca9ae.firebaseapp.com",
  projectId:"tennis-db-ca9ae",
  storageBucket:"tennis-db-ca9ae.firebasestorage.app",
  messagingSenderId:"1031131288345",
  appId:"1:1031131288345:web:2adcb9f2eeafa5801ceb88"
};
const fbApp=firebase.initializeApp(firebaseConfig);
const fbAuth=fbApp.auth();
const fbDb=fbApp.firestore();
// S16 Phase 4-C-3: Cloud Functions (asia-northeast1 にデプロイ済の summarizeMemo を呼ぶため)
const fbFunctions=fbApp.functions("asia-northeast1");
// オフライン永続化（タブ間同期対応）— v2/v3 と同じ挙動
try{fbDb.enablePersistence({synchronizeTabs:true}).catch(()=>{});}catch(_){}
