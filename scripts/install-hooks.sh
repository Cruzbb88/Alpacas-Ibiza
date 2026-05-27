#!/usr/bin/env bash
# Install local git hooks. Run once after cloning.
set -e
ROOT=$(git rev-parse --show-toplevel)
HOOKS_DIR="$ROOT/.git/hooks"
mkdir -p "$HOOKS_DIR"
cat > "$HOOKS_DIR/pre-commit" <<'EOF'
#!/usr/bin/env bash
# Run preflight before allowing the commit. Skip with: git commit --no-verify
bash scripts/preflight.sh
EOF
chmod +x "$HOOKS_DIR/pre-commit"
echo "✅ pre-commit hook installed at $HOOKS_DIR/pre-commit"
