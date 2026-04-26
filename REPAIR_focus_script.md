# Firestore データ修復スクリプト (Step A1)

破損レコード: 練習 2 件 (focus が数値になっている)
- `moffr9mqtf7w4j` (2026-04-26 イトマンテニス スクール、focus: 0)
- `p1776069714875` (テニススクール イトマンテニス、focus: 2)

修復後: 両方の focus が空文字列 `""` になり、v3/v2 の SessionsTab/PracticesTab 描画エラーが解消されます。

---

## 使い方 (合計 30 秒)

### 1. v3 をブラウザで開く

`https://grooveworks.github.io/tennis-db/v3/` を開く (ログイン済の状態で)。

画面が「Sessionsでエラーが発生しました d.focus.slice is not a function」と出てもそのまま続けて OK。

### 2. ブラウザの開発者ツールを開く

`F12` キーを押す → 「Console」タブを選択。

### 3. 以下のスクリプトを **そっくりそのままコピー** して Console に貼り付ける

```javascript
(async () => {
  const u = firebase.auth().currentUser;
  if (!u) { console.error("ログインしていません"); return; }
  const ref = firebase.firestore().collection("users").doc(u.uid).collection("data").doc("practices");
  const snap = await ref.get();
  const items = (snap.data() || {}).items || [];
  const targetIds = ["moffr9mqtf7w4j", "p1776069714875"];
  let fixed = 0;
  const newItems = items.map(p => {
    if (targetIds.includes(p.id) && typeof p.focus === "number") {
      console.log(`修復: ${p.id} (focus=${p.focus} → "")`);
      fixed++;
      return { ...p, focus: "" };
    }
    return p;
  });
  if (fixed === 0) { console.log("対象レコード無し (既に修復済か、データが見つかりません)"); return; }
  await ref.set({ items: newItems, obj: null, updatedAt: new Date().toISOString() });
  console.log(`✅ ${fixed} 件修復しました。ページを再読み込み (F5) してください。`);
})();
```

### 4. Enter キーを押す

成功すると Console に以下が出ます:
```
修復: moffr9mqtf7w4j (focus=0 → "")
修復: p1776069714875 (focus=2 → "")
✅ 2 件修復しました。ページを再読み込み (F5) してください。
```

### 5. F5 で再読み込み

Sessions タブを開いて、エラーが消えていれば成功。

---

## このスクリプトが安全な理由

- **読み込み**: `practices` コレクションを 1 回 `.get()` で読むだけ
- **書き込み**: 対象 2 レコードの `focus` 数値を空文字に変えた**新しい配列全体**を `.set()` で書き戻す
- **副作用なし**: 他のフィールド (date / venue / racketName / Apple Watch 系 / etc.) は完全にそのまま
- **対象 ID 限定**: `targetIds` 配列の 2 件だけが対象。他の practice には触れません
- **冪等**: 既に修復済の場合は「対象レコード無し」と出て何もしない

---

## もし失敗したら

Console に赤いエラーが出た場合、エラーメッセージを起こした Claude に見せてください。データには影響していません (set() が走ってなければ何も変わらない)。

ログインしていない場合: ページを更新してログインしてからもう一度スクリプトを貼ってください。

---

## 修復後の状態

- v3 / v2 の Sessions タブ / Practices タブが正常表示される
- 該当 2 件の練習レコードは「フォーカス欄が空」になる (元の数値 0 や 2 は意味のないデータだったので問題なし)
- v4 のソースは既に修正済 (Step B) なので、今後新規作成・編集しても focus が数値で書かれることはない
