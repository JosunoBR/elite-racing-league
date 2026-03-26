import os
import re

def fix_emojis(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
    except Exception:
        return

    old_text = text
    
    # Let's match any contiguous chunk of characters with ord >= 128
    # Using latin-1 which is completely transparent for bytes
    def repl(m):
        subs = m.group(0)
        try:
            # We encode to latin-1 (which maps ord(c) -> byte directly! completely transparent)
            raw = subs.encode('latin-1')
            return raw.decode('utf-8')
        except:
            return subs
            
    # the pattern shouldn't be too greedy because it might consume valid utf-8 chars like "é"
    # if it gets "é", raw is b'\xe9', decode('utf-8') THROWS, so it returns "é". Which is SAFE!
    # Wait, what if it consumes "Josué ðŸ †"? It won't match space since space < 128.
    # What if it consumes "óðŸ †"? 
    # b'\xf3\xf0\x9f\x8f\x86'. decode('utf-8') THROWS because \xf3 is not valid utf-8 start here
    # Which prevents the emoji from being fixed!
    # Let's replace specifically the exact emoji mojibake patterns to be super safe.

    # Find ANY sequence of chars in latin-1 range (>=128 and < 256)
    pattern = re.compile('[\x80-\xFF]+')
    
    def repl2(m):
        subs = m.group(0)
        try:
            # Some characters were mapped by windows-1252, others by latin-1.
            # \xc3\xa7 (ç) -> Ã (195) § (167)
            # If we encode with 'latin-1', b'\xc3\xa7'.decode('utf-8') -> 'ç'. This is correct!
            # What about characters like Ÿ? `Ÿ` is ord 376 (0x0178). 
            # In Windows-1252, 0x9F is mapped to `Ÿ` (U+0178).
            # So if the author saved in windows-1252, the text has `Ÿ`. `Ÿ` is NOT in latin-1.
            # So we encode to windows-1252 first!
            # BUT if there is a `\x8f`, windows-1252 throws. We must fallback to latin-1 for that char!
            pass
        except:
            pass

    # Better yet, let's custom encode:
    def custom_encode(s):
        res = bytearray()
        for char in s:
            try:
                res.extend(char.encode('windows-1252'))
            except:
                if ord(char) < 256:
                    res.append(ord(char))
                else:
                    raise Exception("Not mappable")
        return bytes(res)

    def final_repl(m):
        subs = m.group(0)
        try:
            raw = custom_encode(subs)
            return raw.decode('utf-8')
        except:
            return subs

    # Pattern: any char >= 128 OR in the windows-1252 mapped set (like Ÿ, €, etc)
    # The windows-1252 mapped chars are:
    w1252_chars = [chr(i).encode('windows-1252', 'ignore').decode('windows-1252') for i in range(128, 256)]
    # Filter out empty and standard latin-1
    extra_chars = []
    for i in range(128, 256):
        try:
            c = bytes([i]).decode('windows-1252')
            if ord(c) >= 256:
                extra_chars.append(re.escape(c))
        except:
            pass
            
    # pattern includes \x80-\xFF AND extra_chars
    pat_str = '[\x80-\xFF' + ''.join(extra_chars) + ']+'
    pattern2 = re.compile(pat_str)
    
    fixed_text = pattern2.sub(final_repl, text)
    
    if fixed_text != text:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_text)
        print(f"Fixed emojis in {filepath}")

for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith(('.html', '.js', '.css')):
            fix_emojis(os.path.join(root, file))
