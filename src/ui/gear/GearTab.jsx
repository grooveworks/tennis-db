// GearTab — 機材タブ (S16 新設)
// WIREFRAMES_v4.md §2.8 / DECISIONS_v4.md S16 Phase 1 / S16 Phase 4-A
//
// Decision Hub 方針: 「機材管理画面」ではなく「機材判断 Hub」。
// 5 セクション (上=判断、下=管理):
//   1. Current Setup (Phase 4-B 実装予定)
//   2. Racket Board (Phase 4-B 実装予定)
//   3. Recent Trials (Phase 4-C 実装予定)
//   4. Open Questions (Phase 4-C 実装予定)
//   5. Manage Masters — Phase 4-A は ストリング在庫のみ実装、setups/retired は Phase 4-B/D 予定
//
// Phase 4-A スコープ: GearTab 骨組み + StringsSection (追加/編集/削除/並び順) のみ
// 他 4 セクションは Placeholder で「Phase で実装予定」と表示

function _GearPlaceholderCard({ icon, title, stage }) {
  return (
    <div style={{
      background: C.panel,
      border: `1px dashed ${C.border}`,
      borderRadius: RADIUS.card,
      padding: "16px 18px",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 12,
      color: C.textMuted,
    }}>
      <Icon name={icon} size={20} color={C.textMuted} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary }}>{title}</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>{stage} で実装予定</div>
      </div>
    </div>
  );
}

function GearTab({
  rackets, strings, stringSetups, trials, tournaments, practices, next,
  onStringsUpdate, onStringEdit, onStringAdd,
  toast,
}) {
  return (
    <div style={{
      flex: 1,
      overflow: "auto",
      padding: 14,
      background: C.bg,
    }}>
      {/* 1. Current Setup (Phase 4-B) */}
      <_GearPlaceholderCard icon="crosshair" title="Current Setup" stage="Phase 4-B" />

      {/* 2. Racket Board (Phase 4-B) */}
      <_GearPlaceholderCard icon="list-bullets" title="Racket Board" stage="Phase 4-B" />

      {/* 3. Recent Trials (Phase 4-C) */}
      <_GearPlaceholderCard icon="tennis-ball" title="Recent Trials" stage="Phase 4-C" />

      {/* 4. Open Questions (Phase 4-C) */}
      <_GearPlaceholderCard icon="question" title="Open Questions" stage="Phase 4-C" />

      {/* 5. Manage Masters - Phase 4-A は Strings のみ実装 */}
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: C.textMuted,
        textTransform: "uppercase", letterSpacing: 0.04,
        margin: "8px 4px 8px 4px",
      }}>
        Manage Masters
      </div>

      <StringsSection
        strings={strings}
        onUpdate={onStringsUpdate}
        onEdit={onStringEdit}
        onAdd={onStringAdd}
        toast={toast}
      />

      {/* セッティング組合せ + 引退ラケット は Phase 4-B/D で実装 */}
      <_GearPlaceholderCard icon="stack" title="セッティング組合せ" stage="Phase 4-B" />
      <_GearPlaceholderCard icon="archive" title="引退ラケット" stage="Phase 4-D" />
    </div>
  );
}
