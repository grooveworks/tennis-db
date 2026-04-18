const {useState,useEffect}=React;

function TennisDB(){
  const[user,setUser]=useState(null);
  const[testData,setTestData]=useState("");
  const[saveErr,setSaveErr]=useState(null);

  useEffect(()=>{
    const unsubAuth=fbAuth.onAuthStateChanged(u=>setUser(u));
    const unsubErr=onSaveError(e=>setSaveErr(e));
    const loaded=lsLoad("test");
    if(loaded)setTestData(loaded.value||"");
    return()=>{unsubAuth&&unsubAuth();unsubErr&&unsubErr();};
  },[]);

  const handleLogin=async()=>{
    try{
      const provider=new firebase.auth.GoogleAuthProvider();
      await fbAuth.signInWithPopup(provider);
    }catch(e){
      if(e.code==="auth/popup-blocked"){
        try{await fbAuth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());}
        catch(e2){alert("ログイン失敗: "+e2.message);}
      }else{
        alert("ログイン失敗: "+e.message);
      }
    }
  };
  const handleLogout=()=>fbAuth.signOut();
  const handleSaveTest=()=>{
    const val="test-"+new Date().toISOString().slice(0,19).replace("T"," ");
    setTestData(val);
    save("test",{value:val});
  };

  const btn={padding:"8px 14px",borderRadius:6,border:`1px solid ${C.border}`,background:C.panel,color:C.text,fontSize:13,cursor:"pointer",fontWeight:600};
  const btnPrimary={...btn,background:C.accent,color:"#fff",border:"none"};
  const section={background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:14,marginBottom:10};

  return <div style={{padding:20,fontFamily:font,color:C.text,background:C.bg,minHeight:"100vh"}}>
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:4}}>🎾 Tennis DB v4</h1>
      <div style={{color:C.textSecondary,fontSize:13,marginBottom:2}}>Version: <b>{APP_VERSION}</b></div>
      <div style={{color:C.textMuted,fontSize:12,marginBottom:16}}>Stage S1 — Core 層 動作確認</div>

      {/* 認証セクション */}
      <div style={section}>
        <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>認証 (Firebase)</div>
        <div style={{fontSize:14,marginBottom:10}}>
          状態: <b style={{color:user?C.accent:C.textMuted}}>{user?user.email:"未ログイン"}</b>
        </div>
        {user
          ? <button onClick={handleLogout} style={btn}>ログアウト</button>
          : <button onClick={handleLogin} style={btnPrimary}>Google ログイン</button>}
      </div>

      {/* ストレージセクション */}
      <div style={section}>
        <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>ストレージ (localStorage + Firestore)</div>
        <div style={{fontSize:13,marginBottom:4}}>保存値:</div>
        <code style={{display:"block",background:C.panel2,padding:"6px 10px",borderRadius:4,fontSize:12,color:C.textSecondary,marginBottom:10,wordBreak:"break-all"}}>{testData||"(なし)"}</code>
        <button onClick={handleSaveTest} style={btn}>保存して再読み込みテスト</button>
        <div style={{fontSize:11,color:C.textMuted,marginTop:6}}>保存後にブラウザを再読み込みしても値が残れば localStorage OK。ログイン状態なら Firestore にも保存される。</div>
        {saveErr&&<div style={{marginTop:8,padding:"6px 10px",background:C.redBg,border:`1px solid ${C.red}`,borderRadius:4,fontSize:11,color:C.red}}>保存エラー ({saveErr.key}): {saveErr.message}</div>}
      </div>

      {/* SCHEMA 確認 */}
      <div style={section}>
        <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>SCHEMA 定義確認</div>
        <div style={{fontSize:13,marginBottom:6}}>各データタイプのフィールド数:</div>
        <pre style={{fontSize:12,background:C.panel2,padding:"8px 10px",borderRadius:4,color:C.textSecondary,margin:0,lineHeight:1.8}}>{Object.entries(SCHEMA).map(([t,f])=>`${t.padEnd(12)}: ${String(f.length).padStart(2)} fields`).join("\n")}</pre>
        <div style={{fontSize:11,color:C.textMuted,marginTop:6}}>
          自動生成派生: DISPLAY_FIELDS / COMBINABLE_FIELDS ({COMBINABLE_FIELDS.size} fields) / REQUIRED_FIELDS / FIELD_TYPES
        </div>
      </div>

      <div style={{fontSize:10,color:C.textMuted,textAlign:"center",marginTop:20}}>
        S1 DoD: ログイン成功・保存再読み込み成功・SCHEMA 表示OK → 「S1 OK」
      </div>
    </div>
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<TennisDB/>);
