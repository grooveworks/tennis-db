// Header — アプリ全体共通のトップヘッダ (S13.5 で全面改訂、§10.8 共通 Header 復活、S15.5.7 で version 削除 + ⚙️ 設定追加)
// v2/v3 形式踏襲 + Apple-flavored Material 路線で再構築:
//   - 左端: 🎾 (Tabler tennis SVG) + Tennis (細字 grey) + DB (太字 Apple Blue)
//     ※ S15.5.7: バージョン表記を Header から削除 → SettingsModal 内に常設表示 (右側アイコン増加分のスペース確保)
//   - ロゴタップ → home タブに遷移
//   - 右側 (4 要素): ☁️同期状態 + 🌤天気 + ⚙️設定 + 👤user
//   - 背景: rgba(255,255,255,0.94) + backdrop-filter blur(12px) (Glass-header)
//   - サブ行: 現在タブ名 (小さい灰色テキスト、TabBar 見切れ時のフォールバック)
// import/export ボタンは S13.5 では除外、後 Stage で Claude 直接連携 + GoogleDrive 強制バックアップを別設計
//
// props:
//   tabTitle: 現在のタブ名 (例: "ホーム" / "Sessions")、サブ行に表示
//   onLogoClick: ロゴタップ時のコールバック (home に遷移)
//   user: firebase user オブジェクト (cloud アイコン表示判定用)
//   syncState: 4.7.33-S17 D 追加。{ status: "idle"|"syncing"|"offline"|"error", pendingCount, pendingKeys, lastSyncAt, lastError, online }
//     旧 syncing prop は廃止、status の semantics に統合 (loading は app.jsx で syncing にマージ)
//   onLogout: ログアウトコールバック
//   onWeatherClick: 天気タップコールバック (S14 で Open-Meteo 詳細 Modal を開く)、null 時は無反応
//   weather: { temp: number, code: number } | null (S14 で実装、S13.5 では null = "—°" placeholder)
//   onSettingsClick: ⚙️ 設定アイコンタップ (S15.5.7 で SettingsModal を開く)
function Header({ tabTitle, onLogoClick, user, syncState, onLogout, onWeatherClick, weather, onSettingsClick }) {
  const hasWeather = weather && typeof weather.temp === "number";
  const tempStr = hasWeather ? `${Math.round(weather.temp)}°` : "";
  // 4.7.33-S17 D: Popover open state (focus trap なし、ESC + 外側 click + tap で開閉)
  const [popoverOpen, setPopoverOpen] = useState(false);
  // 4.7.33-S17 D: syncState 4 値からアイコン/色/aria を派生 (優先順位 error > offline > syncing > idle)
  const _status = (syncState && syncState.status) || "idle";
  const _pendingCount = (syncState && syncState.pendingCount) || 0;
  const _syncIconName = _status === "error" ? "cloud-warning"
    : _status === "offline" ? "cloud-slash"
    : _status === "syncing" ? "cloud-arrow-up"
    : "cloud-check";
  const _syncIconColor = _status === "error" ? C.error
    : _status === "offline" ? C.textMuted
    : _status === "syncing" ? C.warning
    : C.success;
  const _syncAria = _status === "error" ? "同期エラー"
    : _status === "offline" ? (_pendingCount > 0 ? `オフライン、端末に保存済 ${_pendingCount} 件` : "オフライン")
    : _status === "syncing" ? (_pendingCount > 0 ? `同期中 ${_pendingCount} 件` : "同期中")
    : "クラウド同期済";

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
      // 4.7.33-S17 D: SyncStatusPopover を absolute で配置するため relative にする
      position: "relative",
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
          {/* S15.5.7: バージョン表記は SettingsModal に移動 (右側アイコン 4 個のスペース確保) */}
        </div>

        {/* 右側メタ (3 要素まで、§10.8) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
          {/* 同期状態 (user ログイン時のみ)
              4.7.33-S17 D: 4 値表示 + tap で Popover (focus trap なし) */}
          {user && (
            <button
              type="button"
              onClick={() => setPopoverOpen(o => !o)}
              aria-label={_syncAria}
              aria-expanded={popoverOpen}
              data-sync-status={_status}
              data-sync-pending={_pendingCount}
              style={{
                display: "flex", alignItems: "center",
                width: 28, height: 28,
                justifyContent: "center",
                background: "transparent", border: "none", padding: 0,
                cursor: "pointer", borderRadius: 6,
              }}
            >
              <Icon
                name={_syncIconName}
                size={18}
                color={_syncIconColor}
                weight="regular"
                ariaLabel={_syncAria}
              />
            </button>
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

          {/* S15.5.7: ⚙️ 設定 (天気とユーザーアイコンの間) */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              aria-label="設定"
              style={{
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.textSecondary, cursor: "pointer",
                border: "none", background: "transparent",
                borderRadius: 8,
                padding: 0,
              }}
            >
              <Icon name="settings" size={20} color={C.textSecondary} weight="regular" />
            </button>
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
      {/* 4.7.33-S17 D: 同期状態 Popover (focus trap なし、ESC + 外側 click + tap で開閉) */}
      {user && (
        <SyncStatusPopover
          open={popoverOpen}
          syncState={syncState}
          onClose={() => setPopoverOpen(false)}
        />
      )}
    </header>
  );
}
