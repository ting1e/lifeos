# Bundled fonts

These fonts are served locally using `next/font/local`. No Google Fonts
requests are needed at build time or in the browser.

Source: the `ofl/doto`, `ofl/spacegrotesk` and `ofl/spacemono` directories of
[google/fonts](https://github.com/google/fonts), downloaded on 2026-10-03.
The corresponding SIL Open Font License files are included in this directory.

The upstream TTF files were converted to WOFF2 with fontTools 4.55.3 without
subsetting, retaining Latin extended characters (including Turkish). Doto's
`ROND` axis is fixed at its default value of 0; its weight axis is retained.
Space Grotesk retains its variable weight axis. Space Mono includes normal
400 and 700 weights. Chinese text continues to use system fallback fonts.
