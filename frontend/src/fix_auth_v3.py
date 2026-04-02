import os
import re

# Comprehensive mapping for auth page fixes
robust_mapping = {
    # Replace orange #e77600 everywhere it appears in auth tsx files
    (r'#e77600', '#1D4ED8'),
    (r'rgba\(228,121,17,0.5\)', 'rgba(29,78,216,0.3)'),
    (r'hover:bg-\[#ebae1e\]', 'hover:bg-[#1E40AF]'),
    (r'border-\[#a88734\]', 'border-[#1E3A8A]'),
    (r'border-\[#adb1b8\]', 'border-slate-200'),
    
    # Text visibility on WHITE backgrounds
    (r'text-white(?=.*AL-QAVI)', 'text-[#1D4ED8]'),
    (r'text-white(?=.*Join the Network)', 'text-slate-800'),
    (r'text-white(?=.*Sign in)', 'text-slate-800'),
    (r'text-white(?=.*Create Account)', 'text-slate-800'),
    (r'text-white(?=.*Customer registration)', 'text-slate-800'),
    (r'text-white(?=.*Customer Registration)', 'text-slate-800'),
}

auth_dir = r'c:\Users\Dell\OneDrive\Documents\cosmetic-distributor-system\frontend\src\app\(auth)'

def fix_auth_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, replacement in robust_mapping:
        new_content = re.sub(pattern, replacement, new_content)
    
    # Header fixes
    new_content = re.sub(r'text-lg font-bold text-white flex', r'text-lg font-bold text-slate-800 flex', new_content)
    # Fix instances where Sign in was changed but other text-whites remain
    # Like in register choice page headings
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

for root, dirs, files in os.walk(auth_dir):
    for file in files:
        if file.endswith('.tsx'):
            fix_auth_file(os.path.join(root, file))
