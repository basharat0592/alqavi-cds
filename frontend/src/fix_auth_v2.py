import os
import re

# More robust mapping for auth page fixes
robust_mapping = {
    # Focus and hover colors
    (r'focus:border-\[#e77600\]', 'focus:border-[#1D4ED8]'),
    (r'focus:shadow-\[0_0_3px_2px_rgba\(228,121,17,0.5\)\]', 'focus:shadow-[0_0_3px_2px_rgba(29,78,216,0.3)]'),
    (r'accent-\[#e77600\]', 'accent-[#1D4ED8]'),
    (r'hover:border-\[#e77600\]', 'hover:border-[#1D4ED8]'),
    (r'group-hover:text-\[#e77600\]', 'group-hover:text-[#1D4ED8]'),
    (r'group-hover:border-\[#e77600\]', 'group-hover:border-[#1D4ED8]'),
    (r'hover:bg-\[#ebae1e\]', 'hover:bg-[#1E40AF]'),
    (r'border-\[#a88734\]', 'border-[#1E3A8A]'),
    (r'border-\[#adb1b8\]', 'border-slate-200'),
    
    # Text visibility on WHITE backgrounds
    # Match text-white when it's adjacent to brand names or headers in auth containers
    (r'text-white(?=.*AL-QAVI)', 'text-[#1D4ED8]'),
    (r'text-white(?=.*Join the Network)', 'text-slate-800'),
    (r'text-white(?=.*Sign in)', 'text-slate-800'),
    (r'text-white(?=.*Create Account)', 'text-slate-800'),
    (r'text-white(?=.*Customer registration)', 'text-slate-800'),
}

auth_dir = r'c:\Users\Dell\OneDrive\Documents\cosmetic-distributor-system\frontend\src\app\(auth)'

def fix_auth_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, replacement in robust_mapping:
        new_content = re.sub(pattern, replacement, new_content)
    
    # Specific fix for headers with flex/justify that might have text-white
    # <h2 className="text-lg font-bold text-white flex items-center justify-between">
    new_content = re.sub(r'text-lg font-bold text-white flex', r'text-lg font-bold text-slate-800 flex', new_content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

for root, dirs, files in os.walk(auth_dir):
    for file in files:
        if file.endswith('.tsx'):
            fix_auth_file(os.path.join(root, file))
