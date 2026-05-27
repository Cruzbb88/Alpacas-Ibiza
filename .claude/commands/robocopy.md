---
description: Efficiently copy files and directories using Windows robocopy
allowed-tools: Bash, Read, Glob
model: sonnet
argument-hint: "<source> <destination> [flags]"
---

# Robocopy - Efficient File Copy

Efficiently copy files and directories using Windows `robocopy` (Robust File Copy). This command automatically detects whether you're copying a single file or entire directory and adjusts the robocopy flags accordingly.

Use this instead of manually writing files when copying existing content between projects, creating templates, or migrating directory structures.

## Variables

SOURCE: $1
DESTINATION: $2
EXTRA_FLAGS: $3 $4 $5 $6 $7

## Instructions

- IMPORTANT: Use `cmd.exe /c` to run robocopy to avoid Git Bash POSIX path translation issues
- Detect if SOURCE is a file or directory and adjust flags
- For directories, use `/E` to copy subdirectories including empty ones
- DO NOT use `/COPYALL` (causes Git Bash path translation errors)
- Use `/R:1 /W:1` for faster retries (retry once, wait 1 second)
- Use `/MT:8` for multi-threaded copying on large operations (directories only)
- Show a summary of what was copied (files, size, duration)
- Verify the copy succeeded by checking robocopy exit code

## Robocopy Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No files copied (already in sync) |
| 1 | Files copied successfully |
| 2 | Extra files/directories detected |
| 4 | Mismatched files detected |
| 8 | Copy failed (errors occurred) |
| 16 | Fatal error (cannot proceed) |

Exit codes 0-7 are success (files may or may not have been copied).
Exit codes 8+ indicate errors.

## Common Use Cases

**Copy project template:**
```
/robocopy D:/templates/starter-app D:/projects/my-new-app
```

**Copy specific module files:**
```
/robocopy D:/modules/auth/src D:/current-project/src/auth
```

**Mirror directories (careful - deletes extra files in destination):**
```
/robocopy D:/source D:/backup /MIR
```

**Copy with exclusions:**
```
/robocopy D:/source D:/dest /E /XD node_modules .git /XF *.log
```

## Workflow

1. **Validate arguments**
   - Ensure SOURCE and DESTINATION are provided
   - If missing, show usage examples and exit

2. **Check if SOURCE exists**
   - Use Bash to verify path exists
   - If not found, show error with suggested corrections

3. **Detect copy type**
   - Use Bash to check if SOURCE is a file or directory
   - File: copy to destination filename
   - Directory: copy contents to destination directory

4. **Build robocopy command**
   - ALWAYS wrap in cmd.exe: `cmd.exe /c "robocopy ..."`
   - For directories: `cmd.exe /c "robocopy \"<SOURCE>\" \"<DESTINATION>\" /E /R:1 /W:1"`
   - For single file: `cmd.exe /c "robocopy \"<SOURCE_DIR>\" \"<DEST_DIR>\" \"<FILENAME>\" /R:1 /W:1"`
   - Add EXTRA_FLAGS if provided by user
   - For large operations (>1000 files), add `/MT:8` for multi-threading
   - CRITICAL: Use cmd.exe wrapper to avoid Git Bash translating `/FLAG` to Windows paths

5. **Execute robocopy**
   - Run the command with Bash
   - Capture output and exit code

6. **Interpret results**
   - Check exit code against table above
   - Parse output for: files copied, bytes copied, errors
   - Determine success/partial/failed status

7. **Show summary**
   - Report what was copied and where
   - Include file count, total size, duration
   - List any errors or warnings
   - Provide next steps

## Report

```
## Robocopy Results

**Status:** ✅ Success | ⚠️ Partial | ❌ Failed
**Exit Code:** [code] - [meaning]

### Summary
- **Source:** [source path]
- **Destination:** [destination path]
- **Files Copied:** [count]
- **Total Size:** [MB/GB]
- **Duration:** [seconds]

### Details
- Directories: [count] copied
- Files: [count] copied
- Skipped: [count] (already up-to-date)
- Errors: [count] (if any)

### Errors (if any)
- [Error 1 description]
- [Error 2 description]

### Next Steps
- ✅ Files are ready at: [destination]
- Review copied files: `ls -la "[destination]"`
- [Additional suggestions based on what was copied]
```

## Examples

**Basic directory copy:**
```
/robocopy "D:/modules/security/hooks" "D:/new-project/.claude/hooks"
```

**Copy with multi-threading:**
```
/robocopy "D:/large-dataset" "D:/backup" /MT:16
```

**Copy excluding specific patterns:**
```
/robocopy "D:/project" "D:/backup" /XD node_modules dist .git /XF *.log *.tmp
```

**Copy single file:**
```
/robocopy "D:/source/file.txt" "D:/destination/"
```

## Flag Reference

Common robocopy flags you can pass as EXTRA_FLAGS:

| Flag | Purpose |
|------|---------|
| `/E` | Copy subdirectories including empty (default for directories) |
| `/MIR` | Mirror - deletes files in destination not in source (use carefully) |
| `/MT:N` | Multi-threaded with N threads (default: 8, max: 128) |
| `/XD dir` | Exclude directories matching pattern |
| `/XF file` | Exclude files matching pattern |
| `/R:N` | Retry N times on failed copies (default: 1000000) |
| `/W:N` | Wait N seconds between retries (default: 30) |
| `/LOG:file` | Write log to file |
| `/NFL` | No file list in output (quieter) |
| `/NDL` | No directory list in output (quieter) |
| `/NP` | No progress indicator (faster for scripts) |

## Troubleshooting

### Exit Code 16: "Invalid Parameter"

**Symptom:** Robocopy fails with exit code 16 and error like:
```
ERROR : Invalid Parameter #4 : "C:/Program Files/Git/COPYALL"
```

**Cause:** Git Bash is translating robocopy flags (like `/COPYALL`) to Windows paths. This is a known Git Bash POSIX path translation issue.

**Solution:** Use `cmd.exe /c` wrapper to run robocopy:
```bash
cmd.exe /c "robocopy \"source\" \"dest\" /E /R:1 /W:1"
```

**Flags to avoid in Git Bash:**
- `/COPYALL` (gets translated to path)
- Any flag starting with `/` when not wrapped in cmd.exe

**Alternative:** For simple file copies, use `cp` instead:
```bash
cp "source/file.txt" "destination/"
```
