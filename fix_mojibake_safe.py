import os
import re

def fix_mojibake_safe(filepath):
    # Some json files couldn't be decoded as utf-8 at all
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
    except UnicodeDecodeError:
        try:
            with open(filepath, 'r', encoding='windows-1252') as f:
                text = f.read()
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(text)
            return True
        except:
            return False

    old_text = text
    # Strip BOM
    text = text.replace('\ufeff', '')
    
    # We only care about characters that are part of windows-1252 but extended (>= 128)
    # Actually, Windows-1252 encodable characters >= 128
    
    def get_1252_extended():
        valid_chars = []
        for i in range(128, 256):
            try:
                char = bytes([i]).decode('windows-1252')
                valid_chars.append(char)
            except:
                pass
        return valid_chars

    ext_chars = get_1252_extended()
    
    # Create a regex to match one or more of these characters
    escaped = [re.escape(c) for c in ext_chars]
    pattern = re.compile('[' + ''.join(escaped) + ']+')
    
    def repl(m):
        subs = m.group(0)
        try:
            # Re-encode to the bytes that were written
            raw = subs.encode('windows-1252')
            # Attempt to decode as utf-8
            # If it works, it means it was mistakenly read as windows-1252 and saved as utf-8
            return raw.decode('utf-8')
        except UnicodeDecodeError:
            return subs
            
    fixed_text = pattern.sub(repl, text)
    
    if fixed_text != old_text:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_text)
        return True
        
    return False

total_fixed = 0
for root, dirs, files in os.walk('.'):
    # ignore node_modules and .git
    if 'node_modules' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith(('.html', '.js', '.css', '.json')):
            filepath = os.path.join(root, file)
            if fix_mojibake_safe(filepath):
                print(f"Fixed: {filepath}")
                total_fixed += 1

print(f"Total files fixed safety: {total_fixed}")
