import sys

path = r"c:\Users\Dell\OneDrive\Documents\cosmetic-distributor-system\frontend\src\app\admin\website-settings\tabs\SectionsTab.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if '<label className="text-[13px] font-bold text-[#111]">Layout Type</label>' in line:
        new_lines.append(line)
        new_lines.append('                                        <select value={form.content.layout_type || "grid"} onChange={e => updateContent("layout_type", e.target.value)} className={inputCls}>\n')
    else:
        new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
