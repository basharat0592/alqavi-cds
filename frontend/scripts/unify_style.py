"""
Apply consistent rounded-2xl card style + rounded-xl for smaller elements
across ALL admin pages, sidebar, and layout.
"""
import os, re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# All files to process
FILES = [
    r'src\app\admin\products\page.tsx',
    r'src\app\admin\sales\page.tsx',
    r'src\app\admin\users\page.tsx',
    r'src\app\admin\inventory\page.tsx',
    r'src\app\admin\company\page.tsx',
    r'src\app\admin\roles\page.tsx',
    r'src\app\admin\settings\page.tsx',
    r'src\app\admin\products\add\page.tsx',
    r'src\app\admin\products\[id]\page.tsx',
    r'src\app\admin\users\add\page.tsx',
    r'src\app\admin\roles\add\page.tsx',
    r'src\app\admin\layout.tsx',
    r'src\components\layout\AdminSidebar.tsx',
    r'src\app\admin\page.tsx',
]

# Replacements: (pattern, replacement)
# Order matters - more specific patterns first
REPLACEMENTS = [
    # ═══ MAIN CARD CONTAINERS: add rounded-2xl ═══
    # Cards that have no rounded at all
    (
        'bg-white border border-gray-200 shadow-sm overflow-hidden"',
        'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"'
    ),
    (
        'bg-white border border-gray-200 shadow-md overflow-hidden"',
        'bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden"'
    ),
    (
        'bg-white border border-gray-200 shadow-md overflow-hidden relative"',
        'bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden relative"'
    ),
    (
        'bg-white border border-gray-200 shadow-sm overflow-hidden relative"',
        'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative"'
    ),
    # Cards used as panels (p-6, p-7)
    (
        'bg-white border border-gray-200 shadow-md p-7 relative overflow-hidden"',
        'bg-white rounded-2xl border border-gray-200 shadow-md p-7 relative overflow-hidden"'
    ),
    (
        'bg-white border border-gray-200 shadow-md p-6"',
        'bg-white rounded-2xl border border-gray-200 shadow-md p-6"'
    ),
    (
        'bg-white border border-gray-200 shadow-sm"',
        'bg-white rounded-2xl border border-gray-200 shadow-sm"'
    ),
    (
        'bg-white border border-gray-200 shadow-md"',
        'bg-white rounded-2xl border border-gray-200 shadow-md"'
    ),

    # ═══ ROUNDED-NONE → appropriate rounded ═══
    ('rounded-none', ''),  # remove all rounded-none

    # ═══ MODALS: add rounded-2xl ═══
    (
        'bg-white border border-gray-200 shadow-xl w-full max-w-2xl',
        'bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-2xl'
    ),
    (
        'bg-white border border-gray-200 shadow-2xl w-full max-w-2xl',
        'bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl'
    ),
    (
        'bg-white border border-gray-200 shadow-2xl w-full max-w-md',
        'bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md'
    ),
    (
        'bg-white border border-gray-200 shadow-xl overflow-hidden animate-in',
        'bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-in'
    ),
    (
        'bg-white shadow-2xl w-full max-w-2xl',
        'bg-white rounded-2xl shadow-2xl w-full max-w-2xl'
    ),
    (
        'bg-white shadow-2xl w-full max-w-sm',
        'bg-white rounded-2xl shadow-2xl w-full max-w-sm'
    ),

    # ═══ SEARCH BARS: ensure rounded-xl ═══
    # Already have rounded-xl in many places, skip those
    
    # ═══ BUTTONS: ensure rounded-xl ═══
    # Primary buttons without rounded
    (
        'bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest hover:bg-[#e68a00] transition-all duration-200"',
        'bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all duration-200"'
    ),
    (
        'bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest hover:bg-[#e68a00] transition-all duration-200 self-start',
        'bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all duration-200 self-start'
    ),

    # ═══ FILTER PILLS: add rounded-lg ═══
    (
        'border transition-all duration-300 ${showFilters',
        'rounded-xl border transition-all duration-300 ${showFilters'
    ),
    (
        'border transition-all duration-200 ${statusFilter',
        'rounded-xl border transition-all duration-200 ${statusFilter'
    ),
    (
        'border transition-all duration-200 ${activeRole',
        'rounded-xl border transition-all duration-200 ${activeRole'
    ),

    # ═══ TOAST/STATUS: add rounded-xl ═══
    (
        'bg-[#131921] text-white px-5 py-3 shadow-lg text-sm',
        'bg-[#131921] text-white px-5 py-3 rounded-xl shadow-lg text-sm'
    ),
    (
        'shadow-lg border backdrop-blur-xl animate-in',
        'rounded-xl shadow-lg border backdrop-blur-xl animate-in'
    ),

    # ═══ STAT ICON BOXES: ensure rounded-xl ═══
    (
        'bg-[#FF9900] flex items-center justify-center flex-shrink-0"',
        'bg-[#FF9900] rounded-xl flex items-center justify-center flex-shrink-0"'
    ),

    # ═══ NOTIFICATION/PROFILE DROPDOWNS: add rounded-2xl ═══
    (
        'bg-white border border-gray-300 shadow-[0_8px_24px_rgba(0,0,0,0.18)] overflow-hidden z-50 animate-in',
        'bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden z-50 animate-in'
    ),

    # ═══ SEARCH DROPDOWN: rounded-xl ═══
    (
        'bg-white border border-gray-200 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"',
        'bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"'
    ),

    # ═══ LAYOUT HEADER: DarkNav rounded for search ═══
    (
        'bg-[#232F3E] border border-[#3d4f5c] px-3 py-2 w-full',
        'bg-[#232F3E] rounded-lg border border-[#3d4f5c] px-3 py-2 w-full'
    ),

    # ═══ AVATAR/ICON BOXES ═══
    (
        'bg-[#FF9900] flex items-center justify-center text-[#131921]',
        'bg-[#FF9900] rounded-lg flex items-center justify-center text-[#131921]'
    ),

    # ═══ PROFILE DROPDOWN HEADER ITEMS ═══
    (
        'bg-white/20 p-2"',
        'bg-white/20 rounded-lg p-2"'
    ),

    # Double-rounded fix: remove duplicate rounded
    ('rounded-2xl rounded-2xl', 'rounded-2xl'),
    ('rounded-xl rounded-xl', 'rounded-xl'),
    ('rounded-lg rounded-lg', 'rounded-lg'),
]

total_changes = 0
for rel in FILES:
    path = os.path.join(BASE, rel)
    if not os.path.exists(path):
        print(f'  SKIP: {rel}')
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for pattern, replacement in REPLACEMENTS:
        content = content.replace(pattern, replacement)
    
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        changes = sum(1 for a, b in zip(original, content) if a != b)
        print(f'  UPDATED: {rel}')
        total_changes += 1
    else:
        print(f'  UNCHANGED: {rel}')

print(f'\nDone! Updated {total_changes} files.')
