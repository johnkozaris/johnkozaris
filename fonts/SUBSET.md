The fonts here are subsets of Inter and JetBrains Mono (SIL OFL 1.1, licenses alongside), made with:

    uvx --from fonttools --with brotli pyftsubset <font>.woff2 \
      --unicodes="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2039-203A,U+2191,U+2193,U+2212" \
      --layout-features=kern --flavor=woff2 --no-hinting --desubroutinize

JetBrains Mono uses `--layout-features=''` (no ligatures). After changing them, run `bun run fonts` and `bun scripts/metrics.ts`.
