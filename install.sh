#!/usr/bin/env sh

set -eu

repository="0xthierry/review-bundle"
version=""
bin_dir="${HOME}/.local/bin"
install_dir="${HOME}/.local/share/review-bundle"
asset_url_override="${REVIEW_BUNDLE_ASSET_URL:-}"

asset_name_for_version() {
  printf 'review-bundle-%s.tar.gz\n' "$1"
}

usage() {
  cat <<EOF
review-bundle installer

Usage:
  install.sh [options]

Options:
  --version <tag>         Install a specific GitHub release tag (for example v0.1.0).
                          Default: latest release.
  --repo <owner/name>     GitHub repository to download from.
                          Default: ${repository}
  --bin-dir <path>        Directory for the review-bundle launcher.
                          Default: ${bin_dir}
  --install-dir <path>    Directory for the unpacked bundle contents.
                          Default: ${install_dir}
  --help                  Show this help.

Environment:
  REVIEW_BUNDLE_ASSET_URL Override the release asset URL. Intended for CI smoke tests.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      [ "$#" -ge 2 ] || {
        echo "error: --version requires a value" >&2
        exit 1
      }
      version="$2"
      shift 2
      ;;
    --repo)
      [ "$#" -ge 2 ] || {
        echo "error: --repo requires a value" >&2
        exit 1
      }
      repository="$2"
      shift 2
      ;;
    --bin-dir)
      [ "$#" -ge 2 ] || {
        echo "error: --bin-dir requires a value" >&2
        exit 1
      }
      bin_dir="$2"
      shift 2
      ;;
    --install-dir)
      [ "$#" -ge 2 ] || {
        echo "error: --install-dir requires a value" >&2
        exit 1
      }
      install_dir="$2"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun is required but was not found in PATH" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required but was not found in PATH" >&2
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "error: tar is required but was not found in PATH" >&2
  exit 1
fi

tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/review-bundle-install.XXXXXX")"
cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT INT TERM

staging_dir="$tmpdir/unpack"
bundle_dir="$staging_dir/review-bundle"
target="$bin_dir/review-bundle"

if [ -n "$asset_url_override" ]; then
  asset_name="review-bundle-download.tar.gz"
  asset_url="$asset_url_override"
elif [ -n "$version" ]; then
  asset_name="$(asset_name_for_version "$version")"
  asset_url="https://github.com/$repository/releases/download/$version/$asset_name"
else
  asset_name="review-bundle-latest.tar.gz"
  asset_url="https://github.com/$repository/releases/latest/download/$asset_name"
fi

archive_path="$tmpdir/$asset_name"

echo "[review-bundle] downloading release bundle"
curl --fail --location --silent --show-error "$asset_url" --output "$archive_path"

mkdir -p "$staging_dir"
tar -xzf "$archive_path" -C "$staging_dir"

if [ ! -f "$bundle_dir/dist/review-bundle.js" ]; then
  echo "error: downloaded archive did not contain dist/review-bundle.js" >&2
  exit 1
fi

if [ ! -d "$bundle_dir/prompts" ]; then
  echo "error: downloaded archive did not contain prompts/" >&2
  exit 1
fi

mkdir -p "$bin_dir"
rm -rf "$install_dir"
mkdir -p "$(dirname "$install_dir")"
mv "$bundle_dir" "$install_dir"

cat >"$target" <<EOF
#!/usr/bin/env sh
set -eu
exec bun "$install_dir/dist/review-bundle.js" "\$@"
EOF

chmod +x "$target"

if ! bun "$install_dir/dist/review-bundle.js" --help >/dev/null; then
  echo "error: installed bundle failed its post-install smoke check" >&2
  exit 1
fi

echo "[review-bundle] installed to $target"

if [ -f "$install_dir/VERSION" ]; then
  echo "[review-bundle] installed version: $(cat "$install_dir/VERSION")"
fi

if ! command -v git >/dev/null 2>&1; then
  echo "[review-bundle] warning: git was not found in PATH; review runs will fail until it is installed" >&2
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "[review-bundle] warning: codex was not found in PATH; context building will fail until it is installed" >&2
fi

case ":$PATH:" in
  *":$bin_dir:"*)
    ;;
  *)
    echo "[review-bundle] warning: $bin_dir is not in PATH" >&2
    echo "[review-bundle] add this to your shell config:" >&2
    echo "export PATH=\"$bin_dir:\$PATH\"" >&2
    ;;
esac
