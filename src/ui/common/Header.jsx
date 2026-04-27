// Header — アプリ全体共通のトップヘッダ (S13.5 で全面改訂、§10.8 共通 Header 復活)
// v2/v3 形式踏襲 + Apple-flavored Material 路線で再構築:
//   - 左端: 🎾 (Tabler tennis SVG) + Tennis (細字 grey) + DB (太字 Apple Blue) + v{APP_VERSION}
//   - ロゴタップ → home タブに遷移
//   - 右側 (3 要素): ☁️同期状態 + 🌤天気 + 👤user
//   - 背景: rgba(255,255,255,0.94) + backdrop-filter blur(12px) (Glass-header)
//   - サブ行: 現在タブ名 (小さい灰色テキスト、TabBar 見切れ時のフォールバック)
// import/export ボタンは S13.5 では除外、後 Stage で Claude 直接連携 + GoogleDrive 強制バックアップを別設計
//
// props:
//   tabTitle: 現在のタブ名 (例: "ホーム" / "Sessions")、サブ行に表示
//   onLogoClick: ロゴタップ時のコールバック (home に遷移)
//   user: firebase user オブジェクト (cloud アイコン表示判定用)
//   syncing: 同期中フラグ (true なら☁️ をハイライト)
//   onLogout: ログアウトコールバック
//   onWeatherClick: 天気タップコールバック (S14 で Open-Meteo 詳細 Modal を開く)、null 時は無反応
//   weather: { temp: number, code: number } | null (S14 で実装、S13.5 では null = "—°" placeholder)
function Header({ tabTitle, onLogoClick, user, syncing, onLogout, onWeatherClick, weather }) {
  const hasWeather = weather && typeof weather.temp === "number";
  const tempStr = hasWeather ? `${Math.round(weather.temp)}°` : "";

  return (
    <header style={{
      display: "flex",
      flexDirection: "column",
      background: "rgba(255,255,255,0.94)",
      backdropFilter: "saturate(180%) blur(12px)",
      WebkitBackdropFilter: "saturate(180%) blur(12px)",
      borderBottom: "1px solid rgba(0,0,0,0.08)",
      flexShrink: 0,
      zIndex: 5,
      // iOS PWA standalone モード対応: ステータスバー (時刻 / 電池等) の裏に潜らないよう
      // safe-area-inset-top 分だけ上端に padding を確保。Safari ブラウザモードでは env() = 0
      paddingTop: "env(safe-area-inset-top, 0)",
      paddingLeft: "env(safe-area-inset-left, 0)",
      paddingRight: "env(safe-area-inset-right, 0)",
    }}>
      {/* メイン行 */}
      <div style={{
        height: 56, display: "flex", alignItems: "center", padding: "0 16px",
      }}>
        {/* ロゴ部 (タップで home に戻る、v3 line:3185 踏襲) */}
        <div
          onClick={onLogoClick}
          role="button"
          aria-label="ホームへ戻る"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onLogoClick && onLogoClick(); } }}
          style={{
            display: "flex", alignItems: "baseline", gap: 5,
            flex: 1, minWidth: 0,
            cursor: onLogoClick ? "pointer" : "default",
            userSelect: "none",
          }}
        >
          <Icon name="tennis" size={22} color={C.primary} ariaLabel="Tennis DB" style={{ alignSelf: "center" }} />
          <span style={{
            fontSize: 18, fontWeight: 400, color: C.text,
            letterSpacing: "-0.01em", alignSelf: "center",
          }}>Tennis</span>
          <span style={{
            fontSize: 18, fontWeight: 800, color: C.primary,
            letterSpacing: "-0.02em", marginLeft: 1, alignSelf: "center",
          }}>DB</span>
          <span style={{
            fontSize: 9, color: C.textMuted, marginLeft: 5,
            alignSelf: "flex-end", marginBottom: 2,
            fontFeatureSettings: '"tnum"',
          }}>v{APP_VERSION}</span>
        </div>

        {/* 右側メタ (3 要素まで、§10.8) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
          {/* 同期状態 (user ログイン時のみ) */}
          {user && (
            <span
              aria-label={syncing ? "同期中" : "同期済"}
              style={{
                display: "flex", alignItems: "center",
                width: 28, height: 28,
                justifyContent: "center",
              }}
            >
              <Icon
                name="cloud"
                size={18}
                color={syncing ? C.warning : C.success}
                weight="regular"
                ariaLabel={syncing ? "クラウド同期中" : "クラウド同期済"}
              />
            </span>
          )}

          {/* 天気スロット (S13.5: Open-Meteo 接続済、データ取得後のみ表示) */}
          {hasWeather && (
            <div
              onClick={onWeatherClick}
              role={onWeatherClick ? "button" : undefined}
              aria-label="今日の天気"
              tabIndex={onWeatherClick ? 0 : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 3,
                fontSize: 12, color: C.text, fontWeight: 500,
                padding: "4px 7px", borderRadius: 8,
                background: "rgba(255,149,0,0.10)",
                cursor: onWeatherClick ? "pointer" : "default",
              }}
            >
              <Icon name="sun" size={14} color={C.applePeach} weight="fill" />
              <span style={{ fontFeatureSettings: '"tnum"' }}>{tempStr}</span>
            </div>
          )}

          {/* ユーザー / ログアウト */}
          {user && (
            <button
              onClick={onLogout}
              aria-label="ログアウト"
              style={{
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.textSecondary, cursor: "pointer",
                border: "none", background: "transparent",
                borderRadius: 8,
                padding: 0,
              }}
            >
              <Icon name="user-circle" size={22} color={C.textSecondary} weight="regular" />
            </button>
          )}
        </div>
      </div>

      {/* タブ名サブ行 (TabBar 見切れ時のフォールバック、§10.8) */}
      {tabTitle && (
        <div style={{
          padding: "0 16px 6px",
          fontSize: 11, color: C.textMuted, fontWeight: 600,
          letterSpacing: "0.3px",
          marginTop: -2,
        }}>
          {tabTitle}
        </div>
      )}
    </header>
  );
}
