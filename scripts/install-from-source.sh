#!/usr/bin/env sh

set -eu

platform="$(uname -s)"
case "$platform" in
  Linux|Darwin)
    ;;
  *)
    echo "error: unsupported platform: $platform" >&2
    exit 1
    ;;
esac

if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun is required but was not found in PATH" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "error: git is required but was not found in PATH" >&2
  exit 1
fi

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
bin_dir="$HOME/.local/bin"
target="$bin_dir/review-bundle"

echo "[review-bundle] installing dependencies from source checkout"
if [ -f "$repo_root/bun.lock" ]; then
  (
    cd "$repo_root"
    bun install --frozen-lockfile
  )
else
  (
    cd "$repo_root"
    bun install
  )
fi

echo "[review-bundle] building CLI from source checkout"
(
  cd "$repo_root"
  bun run build
)

mkdir -p "$bin_dir"

cat >"$target" <<EOF
#!/usr/bin/env sh
set -eu
exec bun "$repo_root/dist/review-bundle.js" "\$@"
EOF

chmod +x "$target"

echo "[review-bundle] installed source checkout to $target"
