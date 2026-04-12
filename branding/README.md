# GlowLoox Brand Assets

## Concept
**"The Spark"** — A four-pointed star/sparkle on a deep violet-to-magenta gradient.
- Sparkle = Glow (beauty, radiance)
- Rounded square = modern app feel
- Purple → Pink gradient = premium, feminine, energetic

## Color Palette
| Role          | Hex       | Usage                              |
|---------------|-----------|------------------------------------|
| Deep Violet   | `#4C1D95` | Icon background start              |
| Brand Purple  | `#7C3AED` | Primary brand colour               |
| Violet        | `#9333EA` | Accents, taglines                  |
| Amber-Gold    | `#B45309` | Icon background end, "Loox" text   |
| Warm Gold     | `#D97706` | Highlights on dark                 |
| Bright Gold   | `#F59E0B` | Subtle highlights                  |
| Lilac         | `#C4B5FD` | Text on dark backgrounds           |
| Pale Gold     | `#FDE68A` | Sparkle accent dots                |
| Off-white     | `#FEF9C3` | Sparkle tip colour                 |

> **Why purple + gold?** Purple signals premium / tech. Gold signals grooming, confidence,
> and craftsmanship — equally masculine and feminine. Think Rolls-Royce, Dior Homme, Versace.

## Files
| File                        | Use for                                              |
|-----------------------------|------------------------------------------------------|
| `logo-icon.svg`             | App icon, Instagram avatar, LinkedIn avatar, GitHub  |
| `logo-wordmark-light.svg`   | Web header (white/light background)                  |
| `logo-wordmark-dark.svg`    | Web header (dark background), splash screen          |
| `favicon.svg`               | Browser tab favicon                                  |
| `youtube-banner.svg`        | YouTube channel art (2560×1440)                      |
| `linkedin-banner.svg`       | LinkedIn company page banner (1584×396)              |

## Platform Export Guide

### App Icon (Android / iOS)
- File: `logo-icon.svg`
- Export PNG at: 1024×1024 (source), then resize to required densities
- Android: place in `mipmap-xxxhdpi/` etc.

### Web Favicon
- File: `favicon.svg` — use directly in `<link rel="icon" href="/favicon.svg">`
- Also export `favicon.ico` (32×32) for legacy browsers

### Instagram
- Profile picture: export `logo-icon.svg` → PNG 320×320
- Stories / posts: use `logo-wordmark-dark.svg` on brand-colour background

### YouTube
- Channel art: `youtube-banner.svg` (2560×1440)
- Profile picture: export `logo-icon.svg` → PNG 800×800

### LinkedIn
- Company logo: export `logo-icon.svg` → PNG 400×400
- Banner: `linkedin-banner.svg` (1584×396)

### GitHub
- Organisation avatar: export `logo-icon.svg` → PNG 460×460

## Typography
- **Wordmark font**: Inter (Google Fonts)
  - "Glow" — Inter 800 (ExtraBold)
  - "Loox" — Inter 300 (Light)
- **Tagline**: Inter 400, wide letter-spacing, uppercase

## Export SVG → PNG (free tools)
1. Open SVG in browser → right-click → "Save image as" PNG, or
2. Use [Inkscape](https://inkscape.org) (free) → File → Export PNG
3. Use [Squoosh](https://squoosh.app) to resize/compress
