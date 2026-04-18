# Tennis DB ロードマップ

最終更新: 2026-04-18

## 現在の状態
- **バージョン**: v3.3.27
- **フェーズ**: Phase 3（詳細編集・データ管理）
- **本番URL**: https://grooveworks.github.io/tennis-db/v3/
- **リポジトリ**: https://github.com/grooveworks/tennis-db

---

## 完成機能

### Phase 1-2: 基盤・登録導線
- Firebase Firestore 同期
- Sessions 3段階UI（一覧→展開→編集）
- QuickTrial / QuickPractice 登録モーダル
- ホームタブ（Next Actions、MiniCalendar、好成績、近日予定）
- データエクスポート/インポート
- GoogleカレンダーJSONインポート

### Phase 3: 詳細編集・データ管理
- [x] 大会/練習/試打の詳細編集画面
- [x] CSVインポート試合スタッツ（データテニス）
- [x] 試打詳細再編集
- [x] Sessions 一括削除（編集モード + 重複検出）
- [x] ホーム試打カード削除、venue正規化
- [x] Sessions展開UI（v2準拠）
- [x] インポートプレビュー（新規/重複の可視化 + モード選択）
- [x] GCalインポートのインクリメンタル処理（per-item commit, チェックボックス一括処理）
- [x] 重複判定を date+startTime 主軸に刷新（3パス: id/strict/soft）
- [x] 手動マージ比較ビュー（per-fieldラジオ選択 + 結合オプション）
- [x] 🚨 GCalインポート取り消しボタン（緊急ロールバック）

---

## 進行中

- [ ] 試験運用フィードバック収集
- [ ] GCal 実データインポート（500件規模）

---

## バックログ（優先順）

### 優先度: 高
1. **Make.com Webhook 連携**（Tennis DB → GCal 片方向同期）
   - ユーザーがMake有料アカウント保有
   - OAuth不要・サーバー不要
2. **Gear タブ本実装**（ラケット/ストリング管理、実測値ログ、使用履歴）
3. **Plan タブ本実装**（Next Actions 詳細化、試合/練習計画）

### 優先度: 中
4. **Insights タブ本実装**（スタッツ集計、時系列分析）
5. **大会名正規化 (trnDup強化)**（表記揺れ吸収）
6. **Apple Watch データインポート強化**（心拍ゾーン自動取込）

### 優先度: 低
7. **双方向同期**（GCal ↔ Tennis DB）
8. **スポーツカウンセラー提供用レポート機能**
9. **戦績・成長ログの自動生成**

---

## 既知の問題

- DISPLAY_FIELDS に heartRate/visibility/matches が無く merge でデータロスの可能性
- Sessions 削除時の trial.linkedPracticeId/linkedMatchId 孤児化
- textMuted #8e8e93 / textDim #aaa が WCAG AA 違反
- 🔍 重複検出は title 単独キーで偽陽性可能性
- handleImportCommits が closure state を直接参照（rapid click 時のbug懸念）
- Dead code: executeImport/mergeData/mergeArr が誰からも呼ばれていない
- バックアップJSON復元時、rackets/strings/measurements 等が取り込まれない

---

## 設計判断ログ

### 2026-04-18: インポートを一括commit → インクリメンタルcommit へ変更
- **理由**: 478件一括プレビュー編集中に誤操作で全データ喪失リスク
- **採用**: 1件ずつ即commit、モーダル閉じても処理済みは保存済み
- **影響**: mode選択 (skip/merge/overwrite) 廃止、各アイテムにactionボタン

### 2026-04-18: 重複判定を venue → date+startTime 主軸へ
- **理由**: venue 表記揺れ + 空値で重複検出失敗
- **採用**: 3パス (id→strict date+startTime→soft same-date単一)
- **影響**: GCal と Apple Health の自動マッチ成立率向上

---

## 運用ルール

- **1タスク = 1push**（小刻みpatch禁止、CLAUDE.md 参照）
- **push前確認必須**
- **Edit/Write 前にチェックリスト5項目を応答に明示**
- **このファイルは push 時に同時更新**
