import os

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        try:
            with open(filepath, 'r', encoding='windows-1252') as f:
                content = f.read()
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except:
            return False
            
    mojibake_chars = ['Ã£', 'Ã§', 'Ã©', 'Ã­', 'Ã¢', 'â€', 'Ã³', 'Ãª', 'Âº', 'ð', 'Ÿ', 'Ãº', 'Ã¡', 'Ãµ', 'Ã']
    if not any(x in content for x in mojibake_chars):
        return False

    content = content.replace('\ufeff', '')

    try:
        raw_bytes = content.encode('windows-1252')
        fixed_content = raw_bytes.decode('utf-8')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        return True
    except Exception as e:
        print(f"Error on {filepath}: {e}")
        # Try a more forgiving encode
        try:
            # Maybe there are actually some non-windows-1252 chars that were added as true utf-8.
            # In that case, we can manually replace the common mojibake patterns to be safe.
            return False
        except Exception as e2:
            pass
        return False

total_fixed = 0
for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith(('.html', '.js', '.css', '.json')):
            filepath = os.path.join(root, file)
            if fix_file(filepath):
                print(f"Fixed: {filepath}")
                total_fixed += 1

print(f"Total files fixed: {total_fixed}")
