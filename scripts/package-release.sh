#!/usr/bin/env sh

set -eu

tag="${1:-}"
output_dir="${2:-release}"

if [ -z "$tag" ]; then
  echo "error: release tag is required, for example ./scripts/package-release.sh v0.1.0" >&2
  exit 1
fi

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
stage_dir="$(mktemp -d "${TMPDIR:-/tmp}/review-bundle-release.XXXXXX")"
bundle_root="$stage_dir/review-bundle"
archive_name="review-bundle-${tag}.tar.gz"
archive_path="$repo_root/$output_dir/$archive_name"
checksum_path="$archive_path.sha256"
latest_archive_path="$repo_root/$output_dir/review-bundle-latest.tar.gz"
latest_checksum_path="$latest_archive_path.sha256"

cleanup() {
  rm -rf "$stage_dir"
}
trap cleanup EXIT INT TERM

mkdir -p "$repo_root/$output_dir"

(
  cd "$repo_root"
  bun run build
)

mkdir -p "$bundle_root/dist" "$bundle_root/prompts"
cp "$repo_root/dist/review-bundle.js" "$bundle_root/dist/"
cp "$repo_root/prompts/"*.yaml "$bundle_root/prompts/"
cp "$repo_root/README.md" "$bundle_root/"

if [ -f "$repo_root/CHANGELOG.md" ]; then
  cp "$repo_root/CHANGELOG.md" "$bundle_root/"
fi

if [ -f "$repo_root/LICENSE" ]; then
  cp "$repo_root/LICENSE" "$bundle_root/"
fi

printf '%s\n' "$tag" >"$bundle_root/VERSION"

tar -czf "$archive_path" -C "$stage_dir" review-bundle
cp "$archive_path" "$latest_archive_path"

if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "$repo_root/$output_dir"
    sha256sum "$(basename "$archive_path")" >"$(basename "$checksum_path")"
    sha256sum "$(basename "$latest_archive_path")" >"$(basename "$latest_checksum_path")"
  )
elif command -v shasum >/dev/null 2>&1; then
  (
    cd "$repo_root/$output_dir"
    shasum -a 256 "$(basename "$archive_path")" >"$(basename "$checksum_path")"
    shasum -a 256 "$(basename "$latest_archive_path")" >"$(basename "$latest_checksum_path")"
  )
else
  echo "warning: could not generate checksum because neither sha256sum nor shasum is available" >&2
fi

echo "[review-bundle] wrote release archive: $archive_path"
if [ -f "$checksum_path" ]; then
  echo "[review-bundle] wrote checksum: $checksum_path"
fi
echo "[review-bundle] wrote latest archive alias: $latest_archive_path"
if [ -f "$latest_checksum_path" ]; then
  echo "[review-bundle] wrote checksum: $latest_checksum_path"
fi
