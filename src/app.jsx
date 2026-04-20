// v4 共通UIコンポーネント ショーケース (Stage S4)
// Lucide アイコン採用版

function TennisDB() {
  const [tab, setTab] = useState("home");
  const [inputVal, setInputVal] = useState("");
  const [selectVal, setSelectVal] = useState("option1");
  const [textVal, setTextVal] = useState("");
  const [timeVal, setTimeVal] = useState("09:00");
  const [numVal, setNumVal] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const cfm = useConfirm();
  const toast = useToast();

  const section = { marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.border}` };
  const sectionTitle = { fontSize: 13, fontWeight: 700, color: C.textSecondary, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" };
  const row = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <Header title="v4 UI ショーケース" onMenu={() => alert("メニュー")} />

      <div style={{ flex: 1, overflow: "auto", padding: 20, maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
          Stage S4 共通UIコンポーネント一覧。DESIGN_SYSTEM_v4.md 準拠。アイコンは Lucide。
        </div>

        {/* 1. Icon */}
        <div style={section}>
          <div style={sectionTitle}>1. Icon (Lucide)</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
            Lucide — 1,500+ 種類から任意で選択可。DESIGN_SYSTEM §5.4 に記載の主要30個:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 8 }}>
            {[
              ["trophy", "優勝"], ["medal", "2位"], ["award", "3位"],
              ["person-standing", "練習"], ["badge-check", "試打"],
              ["house", "ホーム"], ["list", "記録"], ["backpack", "機材"], ["notebook-pen", "計画"], ["bar-chart-3", "分析"],
              ["arrow-left", "戻る"], ["x", "閉じる"], ["more-vertical", "メニュー"],
              ["plus", "追加"], ["pencil", "編集"], ["trash-2", "削除"], ["save", "保存"],
              ["search", "検索"], ["settings", "設定"], ["log-in", "ログイン"], ["log-out", "ログアウト"],
              ["refresh-cw", "同期"], ["watch", "Watch"], ["calendar", "予定"],
              ["triangle-alert", "警告"], ["circle-alert", "エラー"], ["info", "情報"], ["circle-check", "完了"],
              ["clock", "時間"], ["map-pin", "場所"], ["sun", "天気"], ["flag", "フラグ"],
            ].map(([name, label]) => (
              <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
                <Icon name={name} size={22} color={C.primary} />
                <span style={{ fontSize: 9, color: C.textMuted, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            サイズ: 14 / 18 / 20 / 24px 標準。stroke-width は 2 がデフォルト。
          </div>
        </div>

        {/* 2. Badge */}
        <div style={section}>
          <div style={sectionTitle}>2. Badge</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>
            色 variant は 8 種類。全色ペア AA 以上（主要 AAA）。
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginTop: 8, marginBottom: 6 }}>基本 variants (8種)</div>
          <div style={row}>
            <Badge variant="tournament" icon="trophy">tournament</Badge>
            <Badge variant="practice" icon="person-standing">practice</Badge>
            <Badge variant="trial" icon="badge-check">trial</Badge>
            <Badge variant="success" icon="circle-check">success</Badge>
            <Badge variant="warning" icon="triangle-alert">warning</Badge>
            <Badge variant="error" icon="circle-alert">error</Badge>
            <Badge variant="info" icon="info">info</Badge>
            <Badge variant="default">default</Badge>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginTop: 12, marginBottom: 6 }}>
            大会の結果 (8種) — カテゴリ色 tournament を核に意味で差別化
          </div>
          <div style={row}>
            <Badge variant="tournament" icon="trophy">優勝</Badge>
            <Badge variant="info" icon="medal">準優勝</Badge>
            <Badge variant="trial" icon="award">3位</Badge>
            <Badge variant="warning">ベスト8</Badge>
            <Badge variant="warning">ベスト16</Badge>
            <Badge variant="success">予選突破</Badge>
            <Badge variant="error">敗退</Badge>
            <Badge variant="error">予選敗退</Badge>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginTop: 12, marginBottom: 6 }}>試合結果 (3種)</div>
          <div style={row}>
            <Badge variant="success" icon="circle-check">勝利</Badge>
            <Badge variant="error" icon="x">敗北</Badge>
            <Badge variant="default" icon="minus">棄権</Badge>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginTop: 12, marginBottom: 6 }}>試打の判定 (3種)</div>
          <div style={row}>
            <Badge variant="success" icon="badge-check">採用候補</Badge>
            <Badge variant="warning">保留</Badge>
            <Badge variant="error">却下</Badge>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginTop: 12, marginBottom: 6 }}>
            練習の種別 (v3 からの 7種、アイコン併用で差別化)
          </div>
          <div style={row}>
            <Badge variant="practice" icon="graduation-cap">スクール</Badge>
            <Badge variant="practice" icon="person-standing">自主練</Badge>
            <Badge variant="practice" icon="users">練習会</Badge>
            <Badge variant="practice" icon="swords">ゲーム練習</Badge>
            <Badge variant="practice" icon="target">球出し</Badge>
            <Badge variant="practice" icon="trophy">練習試合</Badge>
            <Badge variant="practice" icon="dumbbell">フィジカル</Badge>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginTop: 12, marginBottom: 6 }}>大会形式 (3種)</div>
          <div style={row}>
            <Badge variant="default">S シングルス</Badge>
            <Badge variant="default">D ダブルス</Badge>
            <Badge variant="default">Mix ミックス</Badge>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginTop: 12, marginBottom: 6 }}>ラウンド (8種、v3 ROUND_OPTS 準拠)</div>
          <div style={row}>
            <Badge variant="default">1回戦</Badge>
            <Badge variant="default">2回戦</Badge>
            <Badge variant="default">3回戦</Badge>
            <Badge variant="default">準々決勝</Badge>
            <Badge variant="default">準決勝</Badge>
            <Badge variant="default">決勝</Badge>
            <Badge variant="default">予選</Badge>
            <Badge variant="default">エキシビション</Badge>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginTop: 12, marginBottom: 6 }}>公開状態・システム (5種)</div>
          <div style={row}>
            <Badge variant="success" icon="globe">公開</Badge>
            <Badge variant="default" icon="lock">非公開</Badge>
            <Badge variant="info" icon="watch">Watch連携</Badge>
            <Badge variant="success" icon="cloud-check">同期済み</Badge>
            <Badge variant="warning" icon="cloud-off">未同期</Badge>
          </div>
        </div>

        {/* 3. Button */}
        <div style={section}>
          <div style={sectionTitle}>3. Button</div>
          <div style={row}>
            <Button variant="primary" icon="save">保存</Button>
            <Button variant="secondary">キャンセル</Button>
            <Button variant="ghost">詳細</Button>
          </div>
          <div style={row}>
            <Button variant="danger" icon="trash-2">削除</Button>
            <Button variant="disabled" disabled>無効</Button>
          </div>
          <div style={row}>
            <Button variant="primary" style={{ width: "100%" }}>フル幅ボタン</Button>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>最小 44×44px、hover でカラー変化</div>
        </div>

        {/* 4. Card */}
        <div style={section}>
          <div style={sectionTitle}>4. Card</div>
          <Card>
            <div style={{ fontSize: 14, color: C.text }}>通常のカード</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>静的な情報表示に使用</div>
          </Card>
          <Card onClick={() => toast.show("カードがクリックされました", "info")}>
            <div style={{ fontSize: 14, color: C.text }}>クリック可能なカード (hover で背景変化)</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>タップしてみてください</div>
          </Card>
        </div>

        {/* 5. SectionTitle */}
        <div style={section}>
          <div style={sectionTitle}>5. SectionTitle</div>
          <SectionTitle icon="flag" style={{ marginTop: 0 }}>次の行動</SectionTitle>
          <SectionTitle icon="calendar">近日予定</SectionTitle>
          <SectionTitle icon="trophy">最近の好成績</SectionTitle>
        </div>

        {/* 6. Input / Select / Textarea */}
        <div style={section}>
          <div style={sectionTitle}>6. 入力フィールド</div>
          <Input label="大会名 (text)" value={inputVal} onChange={setInputVal} placeholder="例: 所沢ベテラン大会" required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input label="日付 (date)" type="date" value="2026-04-21" onChange={() => {}} />
            <Input label="時刻 (time)" type="time" value={timeVal} onChange={setTimeVal} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input label="気温 (number)" type="number" value={numVal} onChange={setNumVal} placeholder="22" />
            <Input label="エラー例" value="" onChange={() => {}} error="必須項目です" />
          </div>
          <Select
            label="会場"
            value={selectVal}
            onChange={setSelectVal}
            options={[
              { value: "option1", label: "所沢市総合運動場" },
              { value: "option2", label: "イトマンテニス" },
              { value: "option3", label: "航空記念公園" },
            ]}
          />
          <Textarea label="メモ" value={textVal} onChange={setTextVal} placeholder="試合の振り返りを記入..." />
        </div>

        {/* 7. Modal / ConfirmDialog */}
        <div style={section}>
          <div style={sectionTitle}>7. Modal / ConfirmDialog</div>
          <div style={row}>
            <Button variant="primary" onClick={() => setModalOpen(true)}>モーダルを開く</Button>
            <Button
              variant="danger"
              onClick={() => cfm.ask("このデータを削除します。この操作は取り消せません。", () => toast.show("削除しました", "success"))}
            >
              削除確認ダイアログ
            </Button>
          </div>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="モーダルのサンプル">
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
              これは Modal コンポーネントのサンプルです。<br />
              閉じるボタン (左上)、オーバーレイクリック、Esc キーで閉じます。
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>キャンセル</Button>
              <Button variant="primary" style={{ flex: 1 }} onClick={() => { setModalOpen(false); toast.show("OK を押しました"); }}>OK</Button>
            </div>
          </Modal>
        </div>

        {/* 8. Toast */}
        <div style={section}>
          <div style={sectionTitle}>8. Toast</div>
          <div style={row}>
            <Button variant="primary" onClick={() => toast.show("保存しました", "success")}>成功</Button>
            <Button variant="secondary" onClick={() => toast.show("注意: 未保存の変更があります", "warning")}>警告</Button>
            <Button variant="danger" onClick={() => toast.show("エラー: 保存失敗", "error")}>エラー</Button>
            <Button variant="ghost" onClick={() => toast.show("ログインしました", "info")}>情報</Button>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>3秒で自動消失</div>
        </div>

        {/* 9. Header */}
        <div style={section}>
          <div style={sectionTitle}>9. Header (この画面上部)</div>
          <div style={{ fontSize: 12, color: C.textSecondary }}>
            画面上部に固定表示。左=戻る / 中央=タイトル / 右=メニュー。
            この画面ではメニューボタンのみ表示。
          </div>
        </div>

        {/* 10. TabBar (この画面下部) */}
        <div style={section}>
          <div style={sectionTitle}>10. TabBar (この画面下部)</div>
          <div style={{ fontSize: 12, color: C.textSecondary }}>
            画面最下部に固定表示。アクティブタブは背景色+文字色で強調。現在: <b>{tab}</b>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 11 }}>
          Tennis DB v4 — Stage S4 共通UIコンポーネント<br />
          src/ui/common/ : Icon / Badge / Button / Card / Input / Select / Textarea / Modal / ConfirmDialog / Toast / TabBar / Header / SectionTitle
        </div>
      </div>

      <TabBar tab={tab} onTabChange={setTab} />

      {cfm.el}
      {toast.el}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<TennisDB />);
