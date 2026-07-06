# -*- coding: utf-8 -*-
"""②掃除をバックアップ上で適用(プレビュー)。ライブ無傷。
- 二重登録 st01/02/03/04 を片付け、詳しい方 s1..s4 を残す
- st01/02 を ID参照している plan/previousPlan の gearChoice を s1/s2 へ付け替え(壊さない)
- s3/s4 のメモに古い方の独自情報を合流(捨てない)
- ① 確認済みの「Yonex製ストリング全般」を除外
出力: racketpedia/out/step2_preview.json + 差分表示"""
import json, copy, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

d = json.load(open('.claude/data-latest.json', encoding='utf-8'))
out = copy.deepcopy(d)

REMAP = {'st01': 's1', 'st02': 's2'}            # plan 参照の付け替え
DROP_IDS = {'st01', 'st02', 'st03', 'st04'}     # 古い二重登録を片付け
DROP_NAMES = {'Yonex製ストリング全般'}           # ①確認済みの除外
NOTE_FOLD = {                                    # 古い方の独自情報を残す方へ合流
    's3': 'TOUR 100で最も相性が良い。Pw4/In3を出した唯一のST。Boom Proでの検証が焦点。在庫少（1張り）。6角形＋シリコン。ロール購入検討中',
    's4': 'Boom Pro横糸として検証中。Blast縦との組み合わせで打感改善の仮説。在庫あり',
}

# 1) plan / previousPlan の gearChoice.sub の ID参照を付け替え
repoint_log = []
for base in ('gearChoice',):
    for planpath in (out.get('plan', {}), out.get('plan', {}).get('previousPlan', {})):
        sub = (planpath or {}).get(base, {}).get('sub', {})
        for fld in ('stringMainId', 'stringCrossId'):
            if sub.get(fld) in REMAP:
                old = sub[fld]; sub[fld] = REMAP[old]
                repoint_log.append((fld, old, sub[fld]))

# 2) strings: 古い二重登録 + Yonex全般 を除外
before = out.get('strings', [])
kept = [s for s in before if s.get('id') not in DROP_IDS and s.get('name') not in DROP_NAMES]
dropped = [s for s in before if s.get('id') in DROP_IDS or s.get('name') in DROP_NAMES]

# 3) メモ合流
for s in kept:
    if s.get('id') in NOTE_FOLD:
        s['note'] = NOTE_FOLD[s['id']]
out['strings'] = kept

json.dump(out, open('gear/racketpedia/out/step2_preview.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)

print('=== ② 掃除の差分（バックアップ上・ライブ未反映） ===')
print()
print('● プラン参照の付け替え（あなたの画面の表示は Blast＋PTP のまま不変）')
for fld, old, new in repoint_log:
    print('   %-14s : %s → %s' % (fld, old, new))
print()
print('● 片付ける登録（%d件）' % len(dropped))
for s in dropped:
    print('   - id=%-6s %-26s [%s]' % (s.get('id'), s.get('name'), s.get('status')))
print()
print('● メモ合流（残す方に古い方の独自情報を追記・捨てない）')
print('   s3 Phantom Spin →', NOTE_FOLD['s3'])
print('   s4 Hawk Touch   →', NOTE_FOLD['s4'])
print()
print('● 件数: ストリング %d → %d 件' % (len(before), len(kept)))
print('● 練習/試合 878件・stringSetups・ラケットは一切触っていません')
print()
print('出力: racketpedia/out/step2_preview.json')
