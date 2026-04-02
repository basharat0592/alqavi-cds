import os
import re

# Mapping for contrast fixes after switching to #1D4ED8
mapping = {
    r'bg-\[#1D4ED8\] text-\[#131921\]': 'bg-[#1D4ED8] text-white',
    r'group-hover/btn:text-\[#131921\]': 'group-hover/btn:text-white',
    r'text-\[#111\]': 'text-white', # Amazon black text to white if it's on blue
}

# Specific to buttons that were yellow and now blue
# bg-[#1D4ED8] with text-[#111] is what the user had.

root_dir = r'c:\Users\Dell\OneDrive\Documents\cosmetic-distributor-system\frontend\src'

def replace_contrast(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, replacement in mapping.items():
        new_content = re.sub(pattern, replacement, new_content)
    
    # Specific fix for track order button text in dashboard/page.tsx
    # <Link href="/dashboard/track" className="... bg-[#1D4ED8] text-[#131921] ...">
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            replace_contrast(os.path.join(root, file))
