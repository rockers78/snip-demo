# Snip Design Tokens

A dark, minimal visual system with a warm top glow and rounded, calm surfaces.

## Color Tokens
- `--bg`: `#090a0d` (page background)
- `--bg-elevated`: `#11131a` (hero/input area)
- `--surface`: `#151926` (cards)
- `--surface-2`: `#1a1f2f` (table row hover)
- `--border`: `rgba(255, 255, 255, 0.14)`
- `--text`: `#f3f4f8`
- `--muted`: `#9ea4b8`
- `--success`: `#8df0b1`
- `--error`: `#ff9aa6`
- `--link`: `#ffd1a3`
- `--accent-gradient`: `radial-gradient(1200px 360px at 50% 0%, rgba(255, 136, 96, 0.34) 0%, rgba(255, 92, 122, 0.28) 42%, rgba(255, 154, 73, 0.18) 64%, rgba(9, 10, 13, 0) 100%)`

## Typography
- Font stack: `"Sora", "Manrope", "Avenir Next", sans-serif`
- Scale:
  - Hero title: `clamp(2rem, 4vw, 3.4rem)` / weight `700`
  - Subline: `1.05rem` / weight `400`
  - Body: `0.98rem`
  - Table text: `0.93rem`

## Spacing + Shape
- Page side padding: `max(1rem, 4vw)`
- Vertical rhythm: `1rem`, `1.5rem`, `2.5rem`, `4rem`
- Radii:
  - Chat input shell: `999px`
  - Cards: `22px`
  - Buttons: `999px`

## Borders + Depth
- Card border: `1px solid var(--border)`
- Card shadow: `0 12px 48px rgba(0, 0, 0, 0.35)`
- Glow band: fixed, full-width (`position: fixed; left: 0; right: 0; pointer-events: none`)

## Mapping to Snip UI
- Page header becomes hero: centered title + muted subline.
- URL form becomes chat-style centerpiece: pill input + attached primary action.
- Success/error remain lightweight notices beneath the input.
- Links table sits inside a rounded surface card with subtle separators.
