// validation — SCHEMA REQUIRED_FIELDS 駆動の必須バリデーション (純関数)
//
// 目的:
//   - tournament/practice/trial の必須項目チェックを 1 箇所に集約
//   - 編集画面で「未入力で保存ボタン disabled + フィールド赤枠」を実現
//
// 使い方:
//   const errors = getRequiredErrors("tournament", form);
//   const valid  = isValid("tournament", form);
//   <Input error={errors.name} ... />
//
// 罠:
//   - REQUIRED_FIELDS は SCHEMA から自動生成 (src/core/05_schema.js)
//   - SCHEMA に required:true を追加するだけで自動的にチェック対象になる
//   - 文字列の空白だけは「未入力」扱い (trim 後に空)

// 値が「未入力」か判定 (空文字 / null / undefined / 空白のみ / 空配列)
const _isEmpty = (v) => {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
};

// 必須項目のうち未入力のキーを {key: "必須項目です"} で返す。空ならバリデーション OK
const getRequiredErrors = (type, form) => {
  const required = REQUIRED_FIELDS[type] || [];
  const errors = {};
  required.forEach((key) => {
    if (_isEmpty(form?.[key])) errors[key] = "必須項目です";
  });
  return errors;
};

// 必須項目すべて入力済みか
const isValid = (type, form) => Object.keys(getRequiredErrors(type, form)).length === 0;
