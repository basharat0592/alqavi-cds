import os
import re

# Mapping for auth page fixes
direct_mapping = {
    r'focus:border-\[#e77600\]': 'focus:border-[#1D4ED8]',
    r'focus:shadow-\[0_0_3px_2px_rgba\(228,121,17,0.5\)\]': 'focus:shadow-[0_0_3px_2px_rgba(29,78,216,0.3)]',
    r'accent-\[#e77600\]': 'accent-[#1D4ED8]',
    r'hover:border-\[#e77600\]': 'hover:border-[#1D4ED8]',
    r'group-hover:text-\[#e77600\]': 'group-hover:text-[#1D4ED8]',
    r'group-hover:border-\[#e77600\]': 'group-hover:border-[#1D4ED8]',
    r'hover:bg-\[#ebae1e\]': 'hover:bg-[#1E40AF]',
    r'border-\[#a88734\]': 'border-[#1E3A8A]',
    r'border-\[#adb1b8\]': 'border-slate-200',
    # Fix the white-on-white text issues
    r'text-white tracking-tighter">AL-QAVI': 'text-[#1D4ED8] tracking-tighter">AL-QAVI',
    r'text-xl font-bold text-white">Join the Network': 'text-xl font-bold text-slate-800">Join the Network',
    r'text-lg font-bold text-white flex items-center justify-between': 'text-lg font-bold text-slate-800 flex items-center justify-between',
    r'text-2xl font-bold text-white mb-5': 'text-2xl font-bold text-slate-800 mb-5',
}

auth_dir = r'c:\Users\Dell\OneDrive\Documents\cosmetic-distributor-system\frontend\src\app\(auth)'

def fix_auth_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, replacement in direct_mapping.items():
        new_content = re.sub(pattern, replacement, new_content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

for root, dirs, files in os.walk(auth_dir):
    for file in files:
        if file.endswith('.tsx'):
            fix_auth_file(os.path.join(root, file))
