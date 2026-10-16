"""Search ranking shared by the Trade windows: what you type first matches
names that START with it, then names with a WORD starting with it, then names
that only contain it somewhere ("bi" -> "Bio …" before "Al Arabia …")."""
import re


def match_rank(q, *fields):
    """0 exact, 1 starts with, 2 a word starts with, 3 contains; None = no match."""
    q = (q or '').strip().lower()
    if not q:
        return 0
    best = None
    word = re.compile(r'(^|[\s\-_/(.,&+])' + re.escape(q))
    for f in fields:
        s = str(f or '').lower()
        if not s:
            continue
        r = 0 if s == q else 1 if s.startswith(q) else 2 if word.search(s) else 3 if q in s else None
        if r is not None and (best is None or r < best):
            best = r
    return best


def rank_key(q, *fields):
    """Sort key: best matches first; anything not matching last."""
    r = match_rank(q, *fields)
    return 9 if r is None else r
