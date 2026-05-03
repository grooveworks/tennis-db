// PlanTab — 計画タブ (S17 初実装)
//
// 役割 (REQUIREMENTS_v4 F3):
//   F3.1 Next Actions: 短期 TODO + 優先度 + 期限。完了トグル / 編集 / 削除
//   F3.2 対戦相手管理: 名前 + 特徴 + 戦績 (戦績は tournaments[] から自動集計)
//   F3.3 試合・練習計画: 将来 (現 Stage では実装しない)
//
// データ:
//   - next   = [{ id, label, detail, category, priority, dueDate, done }]
//             (Home NextActions / GearTab Open Questions と共通 state)
//   - opponents = [{ id, name, hand?, style?, note? }]
//             (Master 候補としても tournaments の対戦相手 Select で参照)
//
// UX 方針 (CLAUDE.md R4):
//   - スマホ片手親指で完結 (新規追加 → モーダル → 一行ずつ快適入力)
//   - 進行中フィルタを default、完了/全件はチップ切替
//   - 優先度 dot は Home と同じ色ルール (赤=7日以内、橙=継続、灰=低/参考)

const _PLAN_PRIORITY_OPTIONS = [
  { v: "最高", color: "#FF3B30" },
  { v: "高",   color: "#FF9500" },
  { v: "中",   color: "#FFCC00" },
  { v: "低",   color: "#C7C7CC" },
  { v: "参考", color: "#8E8E93" },
];
const _PLAN_PRIORITY_ORDER = { "最高": 1, "高": 2, "中": 3, "低": 4, "参考": 5 };
const _PLAN_CATEGORY_OPTIONS = ["練習", "試合", "機材", "コンディション", "その他"];

// 優先度 dot 色 (NextActions.jsx と同ルール)
const _planDotColor = (n, todayIso) => {
  if (n.priority === "低" || n.category === "参考") return "#C7C7CC";
  if (n.dueDate) {
    const due = normDate(n.dueDate);
    if (due) {
      const a = new Date(due).getTime();
      const b = new Date(todayIso).getTime();
      const days = Math.round((a - b) / (1000 * 60 * 60 * 24));
      if (days < 0) return "#FF3B30"; // 期限切れ
      if (days <= 7) return "#FF3B30";
    }
  }
  if (n.priority === "最高") return "#FF3B30";
  return "#FF9500";
};

// 期限ラベル
const _planDueLabel = (dueDate, todayIso) => {
  if (!dueDate) return null;
  const due = normDate(dueDate);
  if (!due) return null;
  const a = new Date(due).getTime();
  const b = new Date(todayIso).getTime();
  const days = Math.round((a - b) / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)} 日超過`;
  if (days === 0) return "今日まで";
  if (days <= 7) return `${days} 日後まで`;
  return `${due} まで`;
};

function _PlanCheckCircle({ checked, onClick }) {
  if (checked) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="完了済 (タップで未完了に戻す)"
        style={{
          width: 26, height: 26, borderRadius: 13,
          background: C.primary, border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, cursor: "pointer", padding: 0,
        }}
      >
        <Icon name="check" size={14} color="#fff" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="未完了 (タップで完了)"
      style={{
        width: 26, height: 26, borderRadius: 13,
        background: C.panel, border: `1.5px solid ${C.appleGray4}`,
        flexShrink: 0, cursor: "pointer", padding: 0,
      }}
    />
  );
}

// ── 個別アクション行
function _PlanActionRow({ item, todayIso, onToggle, onEdit, onDelete }) {
  const dot = _planDotColor(item, todayIso);
  const dueLabel = _planDueLabel(item.dueDate, todayIso);
  const meta = dueLabel || item.category || "継続課題";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "12px 14px",
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.row,
      marginBottom: 8,
      opacity: item.done ? 0.55 : 1,
    }}>
      {/* check circle (左) */}
      <div style={{ paddingTop: 1 }}>
        <_PlanCheckCircle checked={!!item.done} onClick={() => onToggle(item.id)} />
      </div>
      {/* body (タップで編集) */}
      <button
        type="button"
        onClick={() => onEdit(item)}
        style={{
          flex: 1, minWidth: 0, padding: 0, background: "none", border: "none",
          textAlign: "left", cursor: "pointer", fontFamily: font,
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 3,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
          <div style={{
            fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.3,
            textDecoration: item.done ? "line-through" : "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {item.label || "(無題)"}
          </div>
        </div>
        {(item.detail || meta) && (
          <div style={{ fontSize: 11, color: C.textMuted, marginLeft: 13, lineHeight: 1.4 }}>
            {item.detail ? item.detail : meta}
            {item.detail && meta && <span style={{ color: C.textMuted, marginLeft: 8 }}>· {meta}</span>}
          </div>
        )}
      </button>
      {/* 削除ボタン (右) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
        aria-label="削除"
        style={{
          width: 32, height: 32, padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", borderRadius: 6,
          cursor: "pointer", flexShrink: 0,
        }}
      >
        <Icon name="trash-2" size={16} color={C.textMuted} />
      </button>
    </div>
  );
}

// ── アクション編集 Modal (新規/編集共用)
function _PlanActionEditModal({ open, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {});
  useEffect(() => { setForm(initial || {}); }, [initial?.id, open]);
  if (!open) return null;
  const isNew = !initial?.id;
  const valid = (form.label || "").trim().length > 0;
  return (
    <Modal open={open} onClose={onClose} title={isNew ? "アクションを追加" : "アクションを編集"}>
      <Input
        label="タイトル"
        value={form.label || ""}
        onChange={(v) => setForm({ ...form, label: v })}
        required
        placeholder="例: 火曜練習で Boom Pro を試す"
      />
      <Textarea
        label="詳細 (任意)"
        value={form.detail || ""}
        onChange={(v) => setForm({ ...form, detail: v })}
        placeholder="背景や具体的な確認事項"
        rows={3}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Select
          label="優先度"
          value={form.priority || "中"}
          onChange={(v) => setForm({ ...form, priority: v })}
          options={_PLAN_PRIORITY_OPTIONS.map(p => p.v)}
        />
        <Select
          label="カテゴリ"
          value={form.category || ""}
          onChange={(v) => setForm({ ...form, category: v })}
          options={["", ..._PLAN_CATEGORY_OPTIONS]}
        />
      </div>
      <Input
        label="期限 (任意)"
        type="date"
        value={form.dueDate || ""}
        onChange={(v) => setForm({ ...form, dueDate: v })}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          onClick={onClose}
          style={{
            flex: "0 0 100px", minHeight: 44, padding: "0 14px",
            background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font,
          }}
        >キャンセル</button>
        <button
          onClick={() => valid && onSave({ ...form, label: form.label.trim() }, isNew)}
          disabled={!valid}
          style={{
            flex: 1, minHeight: 44, padding: "0 14px",
            background: valid ? C.primary : C.panel2,
            border: `1px solid ${valid ? C.primary : C.border}`, borderRadius: 8,
            color: valid ? "#fff" : C.textMuted,
            fontSize: 15, fontWeight: 700,
            cursor: valid ? "pointer" : "not-allowed", fontFamily: font,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Icon name="check" size={16} color={valid ? "#fff" : C.textMuted} />
          保存
        </button>
      </div>
    </Modal>
  );
}

// ── 対戦相手 編集 Modal
function _PlanOpponentEditModal({ open, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {});
  useEffect(() => { setForm(initial || {}); }, [initial?.id, open]);
  if (!open) return null;
  const isNew = !initial?.id;
  const valid = (form.name || "").trim().length > 0;
  return (
    <Modal open={open} onClose={onClose} title={isNew ? "対戦相手を追加" : "対戦相手を編集"}>
      <Input
        label="名前"
        value={form.name || ""}
        onChange={(v) => setForm({ ...form, name: v })}
        required
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Select
          label="利き手"
          value={form.hand || ""}
          onChange={(v) => setForm({ ...form, hand: v })}
          options={["", "右", "左"]}
        />
        <Select
          label="バック"
          value={form.style || ""}
          onChange={(v) => setForm({ ...form, style: v })}
          options={["", "片手", "両手"]}
        />
      </div>
      <Textarea
        label="特徴 / メモ"
        value={form.note || ""}
        onChange={(v) => setForm({ ...form, note: v })}
        placeholder="得意ショット、苦手パターン、過去の対戦印象 等"
        rows={4}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          onClick={onClose}
          style={{
            flex: "0 0 100px", minHeight: 44, padding: "0 14px",
            background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font,
          }}
        >キャンセル</button>
        <button
          onClick={() => valid && onSave({ ...form, name: form.name.trim() }, isNew)}
          disabled={!valid}
          style={{
            flex: 1, minHeight: 44, padding: "0 14px",
            background: valid ? C.primary : C.panel2,
            border: `1px solid ${valid ? C.primary : C.border}`, borderRadius: 8,
            color: valid ? "#fff" : C.textMuted,
            fontSize: 15, fontWeight: 700,
            cursor: valid ? "pointer" : "not-allowed", fontFamily: font,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Icon name="check" size={16} color={valid ? "#fff" : C.textMuted} />
          保存
        </button>
      </div>
    </Modal>
  );
}

// ── 対戦相手 1 行
function _PlanOpponentRow({ opponent, stats, onEdit, onDelete }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "12px 14px",
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.row,
      marginBottom: 8,
    }}>
      <button
        type="button"
        onClick={() => onEdit(opponent)}
        style={{
          flex: 1, minWidth: 0, padding: 0, background: "none", border: "none",
          textAlign: "left", cursor: "pointer", fontFamily: font,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>
          {opponent.name}
          {(opponent.hand || opponent.style) && (
            <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8, fontWeight: 400 }}>
              {[opponent.hand && `${opponent.hand}利き`, opponent.style && `バック${opponent.style}`].filter(Boolean).join(" / ")}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
          {stats.total > 0 ? (
            <span>
              戦績 {stats.win}勝 {stats.loss}敗
              {stats.lastDate && <span style={{ marginLeft: 8 }}>· 最終 {stats.lastDate}</span>}
            </span>
          ) : (
            <span>対戦履歴なし</span>
          )}
        </div>
        {opponent.note && (
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 4, lineHeight: 1.4,
            overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {opponent.note}
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(opponent); }}
        aria-label="削除"
        style={{
          width: 32, height: 32, padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", borderRadius: 6,
          cursor: "pointer", flexShrink: 0,
        }}
      >
        <Icon name="trash-2" size={16} color={C.textMuted} />
      </button>
    </div>
  );
}

// ── 対戦相手の戦績集計 (tournaments[].matches[].opponent と name で部分一致)
function _computeOpponentStats(name, tournaments) {
  const _name = (name || "").trim();
  if (!_name) return { win: 0, loss: 0, total: 0, lastDate: null };
  let win = 0, loss = 0, lastDate = null;
  for (const t of (tournaments || [])) {
    if (!t || !Array.isArray(t.matches)) continue;
    for (const m of t.matches) {
      if (!m) continue;
      const opp1 = (m.opponent || "").trim();
      const opp2 = (m.opponent2 || "").trim();
      if (opp1 !== _name && opp2 !== _name) continue;
      // H-9 (Phase A 監査): _normalizeMatchResult で表記揺れ吸収
      const _r = _normalizeMatchResult(m.result);
      if (_r === "win") win++;
      else if (_r === "loss") loss++;
      else continue;
      if (t.date && (!lastDate || t.date > lastDate)) lastDate = t.date;
    }
  }
  return { win, loss, total: win + loss, lastDate };
}

function PlanTab({
  next, opponents, tournaments,
  onNextUpdate, onOpponentsUpdate,
  toast, confirm,
}) {
  const todayIso = today();
  const [filter, setFilter] = useState("active"); // "active" | "done" | "all"
  const [editTarget, setEditTarget] = useState(null); // null=閉、{}=新規、{id,...}=編集
  const [oppEditTarget, setOppEditTarget] = useState(null);

  const allActions = next || [];
  const totalCount = allActions.length;
  const activeCount = allActions.filter(n => n && !n.done).length;
  const doneCount = totalCount - activeCount;

  const visibleActions = useMemo(() => {
    let list = allActions.slice();
    if (filter === "active") list = list.filter(n => n && !n.done);
    else if (filter === "done") list = list.filter(n => n && n.done);
    // 並び: done は末尾、active 内は priority → dueDate
    list.sort((a, b) => {
      const ad = a.done ? 1 : 0, bd = b.done ? 1 : 0;
      if (ad !== bd) return ad - bd;
      const ap = _PLAN_PRIORITY_ORDER[a.priority] || 99;
      const bp = _PLAN_PRIORITY_ORDER[b.priority] || 99;
      if (ap !== bp) return ap - bp;
      const adue = a.dueDate || "9999-99-99";
      const bdue = b.dueDate || "9999-99-99";
      if (adue !== bdue) return adue < bdue ? -1 : 1;
      return 0;
    });
    return list;
  }, [allActions, filter]);

  // 並び替え済 opponents (戦績件数で降順、未対戦は名前順)
  const sortedOpponents = useMemo(() => {
    return (opponents || []).slice().sort((a, b) => {
      const sa = _computeOpponentStats(a.name, tournaments);
      const sb = _computeOpponentStats(b.name, tournaments);
      if (sa.total !== sb.total) return sb.total - sa.total;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [opponents, tournaments]);

  const handleToggle = (id) => {
    const updated = allActions.map(n => n && n.id === id ? { ...n, done: !n.done } : n);
    onNextUpdate(updated);
  };
  const handleAddNew = () => setEditTarget({});
  const handleEdit = (item) => setEditTarget(item);
  const handleSave = (item, isNew) => {
    if (isNew) {
      const created = { id: genId(), priority: "中", done: false, ...item };
      onNextUpdate([...allActions, created]);
      toast.show("アクションを追加しました", "success");
    } else {
      const updated = allActions.map(n => n && n.id === item.id ? { ...n, ...item } : n);
      onNextUpdate(updated);
      toast.show("アクションを更新しました", "success");
    }
    setEditTarget(null);
  };
  const handleDelete = (item) => {
    confirm.ask(
      `「${item.label || "(無題)"}」を削除しますか？`,
      () => {
        onNextUpdate(allActions.filter(n => n && n.id !== item.id));
        toast.show("削除しました", "info");
      },
      { title: "アクションを削除", yesLabel: "削除", noLabel: "キャンセル", yesVariant: "danger" }
    );
  };

  const handleOppAdd = () => setOppEditTarget({});
  const handleOppEdit = (opp) => setOppEditTarget(opp);
  const handleOppSave = (item, isNew) => {
    if (isNew) {
      const created = { id: genId(), ...item };
      onOpponentsUpdate([...(opponents || []), created]);
      toast.show("対戦相手を追加しました", "success");
    } else {
      const updated = (opponents || []).map(o => o && o.id === item.id ? { ...o, ...item } : o);
      onOpponentsUpdate(updated);
      toast.show("対戦相手を更新しました", "success");
    }
    setOppEditTarget(null);
  };
  const handleOppDelete = (opp) => {
    confirm.ask(
      `「${opp.name}」を削除しますか？\n(過去の試合記録は残ります)`,
      () => {
        onOpponentsUpdate((opponents || []).filter(o => o && o.id !== opp.id));
        toast.show("削除しました", "info");
      },
      { title: "対戦相手を削除", yesLabel: "削除", noLabel: "キャンセル", yesVariant: "danger" }
    );
  };

  return (
    <div style={{ padding: "12px 14px 24px", overflow: "auto", flex: 1 }}>
      {/* === Section 1: Next Actions === */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="flag" size={18} color={C.textSecondary} />
          次のアクション
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400, marginLeft: 4 }}>
            {activeCount} / {totalCount}
          </span>
        </div>
        <button
          onClick={handleAddNew}
          aria-label="アクションを追加"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            minHeight: 36, padding: "0 12px",
            background: C.primary, border: "none", borderRadius: 8,
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
          }}
        >
          <Icon name="plus" size={14} color="#fff" />
          追加
        </button>
      </div>

      {/* フィルタチップ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { v: "active", label: `進行中 ${activeCount}` },
          { v: "done",   label: `完了 ${doneCount}` },
          { v: "all",    label: `全件 ${totalCount}` },
        ].map(opt => {
          const active = filter === opt.v;
          return (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              style={{
                minHeight: 32, padding: "0 12px",
                background: active ? C.primary : C.panel,
                border: `1px solid ${active ? C.primary : C.border}`, borderRadius: 16,
                color: active ? "#fff" : C.textSecondary,
                fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: font,
              }}
            >{opt.label}</button>
          );
        })}
      </div>

      {/* アクション一覧 */}
      {visibleActions.length === 0 ? (
        <div style={{
          background: C.panel, border: `1px dashed ${C.border}`, borderRadius: RADIUS.card,
          padding: "32px 14px", textAlign: "center", color: C.textMuted, fontSize: 13,
          marginBottom: 24,
        }}>
          {filter === "active" ? "進行中のアクションはありません" :
           filter === "done"   ? "完了したアクションはありません" :
                                 "アクションがまだありません。「追加」から始めましょう"}
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {visibleActions.map(item => (
            <_PlanActionRow
              key={item.id}
              item={item}
              todayIso={todayIso}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* === Section 2: 対戦相手 === */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10, marginTop: 8,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="users" size={18} color={C.textSecondary} />
          対戦相手
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400, marginLeft: 4 }}>
            {(opponents || []).length}
          </span>
        </div>
        <button
          onClick={handleOppAdd}
          aria-label="対戦相手を追加"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            minHeight: 36, padding: "0 12px",
            background: C.primary, border: "none", borderRadius: 8,
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
          }}
        >
          <Icon name="plus" size={14} color="#fff" />
          追加
        </button>
      </div>

      {sortedOpponents.length === 0 ? (
        <div style={{
          background: C.panel, border: `1px dashed ${C.border}`, borderRadius: RADIUS.card,
          padding: "24px 14px", textAlign: "center", color: C.textMuted, fontSize: 13,
        }}>
          対戦相手がまだ登録されていません
        </div>
      ) : (
        sortedOpponents.map(opp => (
          <_PlanOpponentRow
            key={opp.id}
            opponent={opp}
            stats={_computeOpponentStats(opp.name, tournaments)}
            onEdit={handleOppEdit}
            onDelete={handleOppDelete}
          />
        ))
      )}

      <_PlanActionEditModal
        open={!!editTarget}
        initial={editTarget}
        onSave={handleSave}
        onClose={() => setEditTarget(null)}
      />
      <_PlanOpponentEditModal
        open={!!oppEditTarget}
        initial={oppEditTarget}
        onSave={handleOppSave}
        onClose={() => setOppEditTarget(null)}
      />
    </div>
  );
}
