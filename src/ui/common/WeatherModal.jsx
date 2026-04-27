// WeatherModal — 天気詳細 Glass モーダル (S14 P2)
//
// preview_s14_p2.html FINAL 準拠:
//   - Glass bottom sheet (TabBar 60px の上、画面下端から立ち上がる)
//   - グリップ + ヘッダ「今日の天気 M/D(曜)」+ × 閉じる
//   - メインブロック: 天気アイコン (42px fill) + 気温 (Display tier 32px) + 状態テキスト + 最高/最低
//   - テニス指標 3 列: 降水確率 / 風速 / 体感気温
//   - 時間別 16 セル横スクロール (06:00-21:00)、現在時刻ハイライト + 降水 30% 以上で青強調
//   - フッタ: 位置 + Open-Meteo 注釈
//
// props:
//   open: boolean
//   onClose: () => void
//   weather: {
//     temp, code: 現在気温・天気コード (WMO)
//     precipitation, wind, apparent: 降水確率% / 風速 m/s / 体感気温°
//     todayHigh, todayLow: 当日最高/最低
//     hourly: [{ temp, code, rain }] index = hour (0-23)
//   }

const _WM_DOW = ["日","月","火","水","木","金","土"];

// WMO weather code → アイコン名 (Phosphor) + 状態テキスト + 色種別
const _wmCodeToInfo = (code) => {
  if (code == null) return { icon: "sun", label: "—", kind: "clear" };
  if (code === 0)   return { icon: "sun", label: "快晴", kind: "clear" };
  if (code <= 3)    return { icon: "cloud-sun", label: "晴れ時々曇り", kind: "partly" };
  if (code <= 48)   return { icon: "cloud", label: "曇り", kind: "cloud" };
  if (code <= 67)   return { icon: "cloud-rain", label: "雨", kind: "rain" };
  if (code <= 77)   return { icon: "cloud-snow", label: "雪", kind: "snow" };
  if (code <= 82)   return { icon: "cloud-rain", label: "にわか雨", kind: "rain" };
  if (code <= 99)   return { icon: "cloud-lightning", label: "雷雨", kind: "rain" };
  return { icon: "cloud", label: "—", kind: "cloud" };
};

const _wmIconColor = (kind) => {
  if (kind === "clear" || kind === "partly") return C.applePeach; // #FF9500
  if (kind === "rain")  return C.primary;
  if (kind === "snow")  return C.appleGray4;
  return C.textMuted;
};

const _wmTodayLabel = () => {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()} (${_WM_DOW[d.getDay()]})`;
};

function WeatherModal({ open, onClose, weather }) {
  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !weather) return null;

  const info = _wmCodeToInfo(weather.code);
  const iconColor = _wmIconColor(info.kind);
  const curHour = new Date().getHours();

  // 時間別 06:00 - 21:00 (16 セル)
  const hourly = Array.isArray(weather.hourly) ? weather.hourly : [];
  const hours = [];
  for (let h = 6; h <= 21; h++) {
    const item = hourly[h];
    hours.push({
      hour: h,
      temp: item && typeof item.temp === "number" ? Math.round(item.temp) : null,
      code: item ? item.code : null,
      rain: item && typeof item.rain === "number" ? Math.round(item.rain) : null,
    });
  }

  return (
    <>
      {/* 背景 dim overlay (タップで閉じる) */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.18)",
          zIndex: 1099,
        }}
      />
      {/* Glass bottom sheet (TabBar 上に貼り付く) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="今日の天気詳細"
        style={{
          position: "fixed",
          left: 0, right: 0,
          bottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "saturate(180%) blur(28px)",
          WebkitBackdropFilter: "saturate(180%) blur(28px)",
          borderRadius: "22px 22px 0 0",
          padding: "12px 16px 14px",
          boxShadow: "0 -4px 20px rgba(0,0,0,.12)",
          border: "1px solid rgba(255,255,255,0.5)",
          borderBottom: "none",
          zIndex: 1100,
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {/* グリップ */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: "rgba(120,120,128,.32)",
          margin: "0 auto 10px",
        }} />

        {/* ヘッダ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>今日の天気</span>
            <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6, fontWeight: 500 }}>
              {_wmTodayLabel()}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            style={{
              width: 28, height: 28, borderRadius: 14,
              background: "rgba(120,120,128,.16)", color: C.text,
              border: "none", display: "flex",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0,
            }}
          >
            <Icon name="x" size={14} color={C.text} />
          </button>
        </div>

        {/* メインブロック */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "4px 4px 10px",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}>
          <Icon name={info.icon} size={42} color={iconColor} weight="fill" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 32, fontWeight: 800, color: C.text,
              lineHeight: 1, fontFeatureSettings: '"tnum"',
            }}>
              {Math.round(weather.temp)}
              <span style={{ fontSize: 20, fontWeight: 700, color: C.textMuted, marginLeft: 2 }}>°</span>
            </div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 600, marginTop: 4 }}>
              {info.label}
            </div>
            {(typeof weather.todayHigh === "number" && typeof weather.todayLow === "number") && (
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2, fontFeatureSettings: '"tnum"' }}>
                最高 {Math.round(weather.todayHigh)}° / 最低 {Math.round(weather.todayLow)}°
              </div>
            )}
          </div>
        </div>

        {/* テニス指標 3 列 */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: C.textMuted,
          textTransform: "uppercase", letterSpacing: 0.5,
          marginTop: 10, marginBottom: 6,
        }}>テニス指標</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          <_WMStatCell
            iconName="cloud-rain"
            iconColor={C.primary}
            iconWeight="fill"
            value={typeof weather.precipitation === "number" ? Math.round(weather.precipitation) : null}
            unit="%"
            label="降水"
          />
          <_WMStatCell
            iconName="wind"
            iconColor={C.textMuted}
            value={typeof weather.wind === "number" ? Math.round(weather.wind * 10) / 10 : null}
            unit="m/s"
            label="風速"
          />
          <_WMStatCell
            iconName="thermometer"
            iconColor={C.applePeach}
            value={typeof weather.apparent === "number" ? Math.round(weather.apparent) : null}
            unit="°"
            label="体感"
          />
        </div>

        {/* 時間別 */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: C.textMuted,
          textTransform: "uppercase", letterSpacing: 0.5,
          marginTop: 10, marginBottom: 6,
        }}>時間別</div>
        <div style={{
          display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4,
        }}>
          {hours.map((h) => {
            const hInfo = _wmCodeToInfo(h.code);
            const hIconColor = _wmIconColor(hInfo.kind);
            const isNow = h.hour === curHour;
            const isWet = h.rain != null && h.rain >= 30;
            const useFill = (hInfo.kind === "clear" || hInfo.kind === "rain");
            return (
              <div
                key={h.hour}
                style={{
                  flex: "0 0 52px",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 3,
                  padding: "6px 4px", borderRadius: 10,
                  background: isNow ? "rgba(0,122,255,0.12)" : "rgba(255,255,255,0.6)",
                  boxShadow: isNow ? "inset 0 0 0 1px rgba(0,122,255,0.4)" : undefined,
                  position: "relative",
                }}
              >
                <div style={{
                  fontSize: 9, fontWeight: isNow ? 700 : 600,
                  color: isNow ? C.primary : C.textMuted,
                  fontFeatureSettings: '"tnum"',
                }}>
                  {isNow ? `${h.hour} 今` : String(h.hour).padStart(2, "0")}
                </div>
                <Icon
                  name={hInfo.icon}
                  size={16}
                  color={hIconColor}
                  weight={useFill ? "fill" : "regular"}
                />
                <div style={{
                  fontSize: 12, fontWeight: 700, color: C.text,
                  fontFeatureSettings: '"tnum"',
                }}>
                  {h.temp != null ? `${h.temp}°` : "—"}
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 700,
                  color: isWet ? C.primary : "transparent",
                  fontFeatureSettings: '"tnum"', lineHeight: 1,
                }}>
                  {h.rain != null ? `${h.rain}%` : "0%"}
                </div>
              </div>
            );
          })}
        </div>

        {/* フッタ注釈 */}
        <div style={{
          fontSize: 10, color: C.textMuted, textAlign: "center",
          marginTop: 12, paddingTop: 10,
          borderTop: "1px solid rgba(0,0,0,0.08)",
        }}>
          位置: 埼玉県 (35.85, 139.65) · データ: Open-Meteo
        </div>
      </div>
    </>
  );
}

// テニス指標 1 セル (3 列カード共通)
function _WMStatCell({ iconName, iconColor, iconWeight, value, unit, label }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.6)", borderRadius: 10,
      padding: "7px 4px", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    }}>
      <Icon name={iconName} size={16} color={iconColor} weight={iconWeight || "regular"} />
      <div style={{
        fontSize: 16, fontWeight: 800, color: C.text,
        lineHeight: 1, fontFeatureSettings: '"tnum"',
      }}>
        {value != null ? value : "—"}
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, marginLeft: 1 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600, marginTop: 1 }}>{label}</div>
    </div>
  );
}
