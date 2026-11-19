#!/usr/bin/env bash
# Regenerates docs/hello.png and docs/hello.txt. Needs dotnet, npx (playwright chromium) and ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
dotnet run --project tools/CardShot -- "$tmp/hello.html"
npx -y playwright screenshot --device "Desktop Chrome HiDPI" --full-page "file://$tmp/hello.html" "$tmp/hello.png" >/dev/null
magick "$tmp/hello.png" -trim +repage -bordercolor black -border 40 docs/hello.png
sed '1s/^\xEF\xBB\xBF//' "tests/Khalid.Abuhakmeh.Tests/Snapshots/CallingCardTests.Snapshot_width=100_color=False_unicode=True.verified.txt" > docs/hello.txt
