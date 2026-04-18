const {useState,useEffect,useRef,useCallback,useMemo}=React;
const APP_VERSION="4.0.0-S0";

function TennisDB(){
  return <div style={{padding:24,fontFamily:"-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif",color:"#1a1a1a"}}>
    <h1 style={{fontSize:24,fontWeight:700,marginBottom:12}}>🎾 Tennis DB v4 起動</h1>
    <div style={{fontSize:14,color:"#3a3a3c",marginBottom:4}}>Version: <b>{APP_VERSION}</b></div>
    <div style={{fontSize:12,color:"#5a5a5f"}}>Stage S0 準備完了 — React 動作確認</div>
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<TennisDB/>);
