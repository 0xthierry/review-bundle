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

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
install_dir="$HOME/.local/bin"
target="$install_dir/review-export"

echo "[review-export] installing dependencies"
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

echo "[review-export] building CLI"
(
  cd "$repo_root"
  bun run build
)

mkdir -p "$install_dir"

cat >"$target" <<EOF
#!/usr/bin/env sh
set -eu
exec bun "$repo_root/dist/review-export.js" "\$@"
EOF

chmod +x "$target"

echo "[review-export] installed to $target"

case ":$PATH:" in
  *":$install_dir:"*)
    ;;
  *)
    echo "[review-export] warning: $install_dir is not in PATH" >&2
    echo "[review-export] add this to your shell config:" >&2
    echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >&2
    ;;
esac
