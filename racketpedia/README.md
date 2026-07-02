# Racketpedia 個人リファレンス取り込み — 運用メモ（正本）

最終更新: 2026-06-24 / Claude Code 実装版。
これは旧 `D:\Downloads\Racketpedia抜き出し_ClaudeCode引き継ぎメモ.md`（チャット作成・スクショ/一括スクレイプ前提）を**実地調査で更新した正本**。旧メモの前提は誤りだったため下記で置換。

---

## 0. これは何 / 何でないか

- Racketpedia（https://www.racketpedia.com）の弦・ラケットの**計測データを、自分が閲覧した範囲だけ**ローカル記録する個人ツール。
- 弦選定・ラケット選定（フレームのパワー ↔ 弦の最適剛性の分析）・Tennis DB 連携の資産。
- **やらないこと**: bot による全件巡回（＝一括スクレイプ）。外部公開・再配布。アカウント代理ログイン・代理決済（不可）。

## 1. 重要な事実（旧メモの訂正・実地調査 2026-06-23〜24）

- 旧メモ「全データ HTML インライン・API 不要」は**無料サンプル弦1枚で検証された誤り**。
- 詳細ラボデータ（8軸レーダー・帯別剛性・動的剛性・伸び）は **Racketpedia 有料会員（Tennis Lab Tests €49.90/年）のゲートの裏**。非ログインでは弦は2件のみ全公開、ラケットは radar 等が比較的公開。
- **非ログインで全件取れる**: name / brand / typology / shape / composition / colors / gauges / test_published / **平均静的剛性（説明文prose・1104件全件）** / 属性タグ（83%）。弦の8軸 radar は 110件（無料2＋カルーセル同梱108を名前一致で充填）。
- 抽出の要点: 動的剛性は **240 g/mm が正**（旧メモ235は別ウィジェット）/ 値は popover 除去後に取得 / サイト綴りミス "el**en**gation" / 弦バッジは `str-stiff-lab-l` / 弦 radar 8軸・ラケット radar 6軸(Power,Spin,Control,Maneuverability,Stability,Comfort)。

## 2. 取り込みパイプライン（ブラウズするだけで自動）

```
購読(あなた) → ユーザースクリプト導入(1回) → 受け口起動(自動) → 普通に閲覧 → 自動記録
```

1. **受け口** `listener.py` を起動（`127.0.0.1:8765`・外部非公開）。Windows ログイン時自動起動に登録推奨。
2. **ユーザースクリプト** `racketpedia_capture.user.js` を Tampermonkey に1回登録。
3. あなたが弦/ラケットページを**開くと、描画後に自動で受け口へ送信** → 解析 → 保存。合図・保存・クリック不要。
4. 受け口が止まっていても、スクリプトがブラウザ内に最大80件キューし、次回復帰時に流す（取りこぼし防止）。

> 巡回はしない（スクリプトは「開いたページ」だけ発火）。個人の正規閲覧の範囲。

## 3. 重複・更新の扱い（slug がキー）

- 同じページを再度開く → **重複行は作らない**。
- データが同じ → `last_captured` だけ更新（静か）。
- データが変わった（サイト再計測）→ 最新で上書き＋`changed_at` を立てる。`first_captured`/`last_captured` 記録。
- 色・ゲージ違いは別 slug ＝別レコード（正しく分離）。

## 4. スキーマ

**弦**(`strings` テーブル): name / brand / lab_data(full|radar-carousel|specs-only) / typology / shape / composition / colors / gauges / static_stiffness_avg / ss_10_15..ss_30_35 / dynamic_stiffness_gmm / dynamic_stiffness_sim_lbsin / elongation_5_35_mm / radar_(power,resilience,elasticity,spin,control,tension_holding,stability,comfort) / tension_range / resilience_range / playing_life / prestretch / progressive_plasticization / stiffness_badge / test_published / tags / source_url / first_captured / last_captured / changed_at

**ラケット**(`rackets` テーブル): name / brand / year / lab_data / head_size / weight / balance / swingweight / spinweight / twistweight / beam / length / string_pattern / materials / flex_hz / dra / radar_(power,spin,control,maneuverability,stability,comfort) / test_published / source_url / first_captured / last_captured / changed_at

無い値は空欄（推測で埋めない）。

## 5. ファイル / コマンド

```
racketpedia/
  extract.py    parse_detail(弦) / parse_racket(ラケット) / detect_kind(og:url判定)
  store.py      upsert(slug重複処理・変化検知・日付) / rebuild(CSV+SQLite+JSON)
  listener.py   ローカル受け口 (ブラウザから自動取り込み)
  scrape.py     一括取得(公開データ baseline用): brands/lists/details/build/status
  racketpedia_capture.user.js   Tampermonkey 用
  cache/        取得済み生HTML   state/ 進捗   out/ racketpedia.db / *.csv / *.json / store_*.json
```

- 受け口起動: `python racketpedia/listener.py`
- フォルダ一括(代替): inbox に保存した HTML をまとめ取り込み（必要なら ingest を追加）
- 現データ確認: `python racketpedia/scrape.py status`

## 6. セットアップ手順（あなた）

1. Racketpedia 有料会員に登録（Tennis Lab Tests €49.90/年）。※代理ログイン不可。
2. Chrome に Tampermonkey を導入 → `racketpedia_capture.user.js` を新規スクリプトに貼って保存。
3. 受け口を起動（自動起動登録は Claude が設定）。
4. ログイン状態で弦/ラケットを普通に閲覧 → 自動で貯まる。

## 7. 状態 / 次

- 実装済み: 弦/ラケット解析・受け口・重複処理・公開データ baseline（弦1104件）・サンプルで通し検証 OK。
- **購読初日にやる検証**: ①ログイン後ページに数値が HTML テキストで入るか1件で確認（入らなければスクリプトに JS 抽出を追加）②あなたの試した7弦の動的剛性が「PTP(可) vs Hawk Touch(浮く)」を分離するか＝€49.90 の価値判定。
- 別フェーズ（価値検証 OK 後）: Firestore / v4 アプリへの取り込み（保護アプリに触れる・コレクション構造の決定が要る）。
- 要微調整: ラケット beam の抽出（実ログインページで確定）。
- 規約: 個人利用・外部配布しない（フッター `© smarThink.io`）。
```
