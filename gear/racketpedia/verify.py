# -*- coding: utf-8 -*-
"""使い捨て検証: 個別ページHTMLから抽出できる値が、スクショ既知値と一致するか自分で裏取りする。
メモの正規表現を鵜呑みにせず、構造を実HTMLで確認するのが目的。"""
import re, html as htmllib, sys, io, json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = "racketpedia/cache/string/head-lynx-tour-grey-125.html"
t = open(path, encoding='utf-8').read()
plain = re.sub(r'\s+', ' ', htmllib.unescape(re.sub(r'<[^>]+>', ' ', t)))

print("=== 1. レーダー8軸 (name + data[8 ints]) ===")
radars = re.findall(r'name:"([^"]+)",data:\[(\d+(?:,\d+){7})\]', t)  # 厳密に整数8個
seen = {}
for name, arr in radars:
    vals = [int(x) for x in arr.split(',')]
    seen.setdefault(name, vals)
print(f"総マッチ(重複込み): {len(radars)} / ユニーク弦名: {len(seen)}")
print(f"主役 Head Lynx Tour Grey 125 -> {seen.get('Head Lynx Tour Grey 125')}")
print(f"  既知値(スクショ) = [80,70,55,95,95,100,85,65]  一致: {seen.get('Head Lynx Tour Grey 125')==[80,70,55,95,95,100,85,65]}")
print("  ユニーク弦名サンプル(先頭10):")
for nm in list(seen)[:10]:
    print(f"    - {nm}: {seen[nm]}")

print("\n=== 2. 帯別静的剛性カーブ (小数配列5要素) ===")
bands = re.findall(r'data:\[(\d+\.\d+(?:,[\d.]+){4})\]', t)
print(f"小数5要素配列マッチ: {bands}")

print("\n=== 2b. 帯別配列まわりの context (どの系列名に紐づくか) ===")
for m in re.finditer(r'data:\[(?:1\.45|1\.43)[\d.,]+\]', t):
    s = max(0, m.start()-120); e = min(len(t), m.end()+20)
    print("   ..." + re.sub(r'\s+',' ', t[s:e]) + "...")

def grab(label, unit):
    m = re.search(re.escape(label) + r'.{0,40}?([0-9][0-9\.\-– ]*?)\s*' + re.escape(unit), plain)
    return m.group(1).strip() if m else None

print("\n=== 3. 右カラム数値 ===")
print("Dynamic stiffness (g/mm):", grab('Dynamic stiffness', 'g/mm'), " 既知:235(実値)/240(丸め)")
print("simulator (lbs/inch):", grab('string selector test simulator', 'lbs/inch'), " 既知:230")
print("Average elongation (mm):", grab('Average elongation', 'mm'), " 既知:30.95")

print("\n=== 4. Technical data / General info ===")
for label, unit in [('Tension range','kg'), ('Resilience range','kg'), ('Playing life','hrs')]:
    print(f"{label}:", grab(label, unit))
for label in ['Typology','Shape','Composition','Available colors','Available gauges','Prestretch','Progressive plasticization','Test published on']:
    m = re.search(re.escape(label) + r'.{0,60}', plain)
    print(f"{label}:", (m.group(0)[:80] if m else None))

print("\n=== 5. 硬さバッジ ===")
for badge in ['Tough','Soft','Medium']:
    print(f"  '{badge}' 出現:", t.count('>'+badge+'<'), "(>X< 形式)")
