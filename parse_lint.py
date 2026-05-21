import re
import sys

def parse_lint(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    files = {}
    current_file = None
    warning_count = 0
    error_count = 0
    
    # Path regex: starts with / or looks like a file path
    # Message regex: starts with whitespace, then line:col, then level, then message, then optional rule
    rel_path_base = "/Users/benlee/GitHub/f1_dashboard/"

    line_pattern = re.compile(r'^\s+(\d+):\d+\s+(warning|error)\s+(.*?)(?:\s\s+(\S+))?$')

    for line in lines:
        line = line.rstrip()
        if not line:
            continue
        
        # Check for summary line
        if 'problems (' in line or 'errors and' in line:
            continue
            
        # Match lint warning/error lines
        match = line_pattern.match(line)
        if match:
            line_num, level, message, rule = match.groups()
            if level == 'warning':
                warning_count += 1
                if current_file not in files:
                    files[current_file] = []
                files[current_file].append(f"{line_num}: {rule if rule else message}")
            else:
                error_count += 1
        else:
            # Likely a file path
            if line.startswith('/') or line.startswith('./') or line.endswith(('.js', '.ts', '.tsx', '.jsx')):
                current_file = line.replace(rel_path_base, '')

    for file, warnings in files.items():
        print(f"{file}:")
        for w in warnings:
            print(f"  {w}")
    
    print(f"\nTotal Warnings: {warning_count}")
    print(f"Total Errors: {error_count}")

if __name__ == "__main__":
    parse_lint('lint_output.txt')
