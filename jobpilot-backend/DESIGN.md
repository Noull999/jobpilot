# JobPilot - Design System

## Color Palette

Dark mode with blacks, grays, and red accent. High contrast for modern app aesthetic.

### Blacks & Grays
- **Black:** `#0a0a0a` — Primary background, deepest shadows
- **Black-2:** `#141414` — Sidebar background, secondary backgrounds
- **Black-3:** `#1c1c1c` — Cards, elevated surfaces
- **Gray-1:** `#2a2a2a` — Borders, dividers (subtle)
- **Gray-2:** `#3d3d3d` — Secondary backgrounds, hover states
- **Gray-3:** `#6b6b6b` — Secondary text, labels
- **Gray-4:** `#a8a8a8` — Tertiary text, muted content
- **White:** `#fafafa` — Primary text, foreground

### Accent (Red)
- **Red (primary):** `#ff2d2d` — CTAs, highlights, active states
- **Red glow:** `#ff4545` — Hover states, glows, emphasis
- **Red dark:** `#cc0000` — Active/pressed states, darker variant

### Semantic
- **Success (Green):** `#4ade80` — Successful actions, confirmations
- **Warning (Amber):** `#facc15` — Warnings, attention needed
- **Error (Red):** `#ff2d2d` — Errors, destructive actions
- **Info (Blue):** `#3b82f6` — Information, help text

## Typography

### Fonts
- **Sans-serif (UI/Body):** Geist, Helvetica Neue, system-ui fallback
- **Mono (Code, inline examples):** Geist Mono, JetBrains Mono, Courier New

### Scales
**Restrained, clear hierarchy.**

| Use | Size | Weight | Line Height |
|-----|------|--------|-------------|
| **H1** (hero, page title) | 48px | 700 | 1.1 |
| **H2** (section heading) | 32px | 600 | 1.2 |
| **H3** (subsection) | 24px | 600 | 1.3 |
| **Body** (main text) | 16px | 400 | 1.6 |
| **Small** (captions, labels) | 14px | 400 | 1.5 |
| **Tiny** (micro UI) | 12px | 500 | 1.4 |
| **Chat (message text)** | 15px | 400 | 1.5 |

**Minimum line length:** 65ch on desktop, full width on mobile (single column).

## Spacing System

Modular scale (1.25x):
- `4px` (xs)
- `8px` (sm)
- `12px` (base)
- `16px` (md)
- `20px` (lg)
- `24px` (xl)
- `32px` (2xl)
- `48px` (3xl)
- `64px` (4xl)

**Rhythm:** Vary between steps. Never use uniform padding everywhere.

## Components

### Chat Message Bubble
- User bubble: Accent background, cream text, rounded (12px)
- Coach bubble: Cream background, charcoal text, subtle shadow, rounded (12px)
- Spacing between: 12px (vertical), 16px (horizontal padding)
- Max width on desktop: 70ch; on mobile: full width with 16px margins

### Button
- Padding: 12px 20px (base size)
- Rounded: 8px
- Weight: 600
- CTA (primary): Accent background, cream text
- Secondary: Mist background, ink text, Charcoal border
- Disabled: Ash background, disabled:opacity 0.5

### Input
- Padding: 10px 12px
- Border: 1px solid Charcoal
- Rounded: 6px
- Focus: 2px solid Accent, no outline
- Placeholder: Ash text

### Card
- Background: Cream
- Padding: 24px
- Border: 1px solid Mist
- Rounded: 12px
- Shadow: 0 2px 8px rgba(ink, 0.08)

## Layout

### Desktop (>1024px)
- Max width: 1200px, centered
- Sidebar (left): 280px for navigation / user profile
- Main (center): Chat area, full width minus sidebar
- Right rail: Empty or pricing/stats (future)

### Tablet (768-1023px)
- Single column, sidebar collapses to hamburger
- Chat area: full width with 16px margins

### Mobile (<768px)
- Single column, full width
- Header: Hamburger + logo
- Chat: Full screen, 16px safe areas
- Input: Sticky to bottom, 16px margins

## Motion

**Fast, purposeful. No bounce or elastic.**

- **Fade in:** 150ms ease-out-quad (new messages)
- **Slide up:** 200ms ease-out-expo (send button → loading spinner)
- **Scale down:** 100ms ease-out-quad (button press)
- **No animated layouts:** Position, size changes are instant

## Dark Mode

**Not included in MVP.** Light mode only. If added later:
- Inverse neutrals (Cream → Ink, Ink → Cream)
- Same accent colors (no bleached-out alternates)
- No glassmorphism

## Accessibility

- **Contrast:** All text meets WCAG AA (4.5:1 minimum for body, 3:1 for large text)
- **Focus:** Visible 2px outline on interactive elements
- **Touch targets:** 44px minimum on mobile
- **Semantic HTML:** Real buttons, inputs, labels (no divs faking buttons)
- **Keyboard:** Full navigation via Tab/Enter/Esc

## Component Variants

### Badge
- Background: Accent light (oklch(0.85 0.08 45))
- Text: Accent dark (oklch(0.40 0.20 38))
- Padding: 4px 8px
- Rounded: 4px
- Font weight: 500

### Tooltip
- Background: Ink (oklch(0.1 0.01 30))
- Text: Cream
- Padding: 8px 12px
- Rounded: 6px
- Max width: 200px
- Font size: 12px

### Divider
- Color: Mist (oklch(0.8 0.003 50))
- Height: 1px
- Margin: 20px 0 (varies by context)

### Loading State
- Spinner: 24px circle, Accent color, smooth rotation
- Animation: 1s linear infinite
- Label: "Loading..." in small Ash text (optional)

## Imagery & Icons

- **Icons:** Feather Icons or custom SVGs, 24px default, consistent stroke (2px)
- **Images:** Illustrations minimal. Photography: high quality, real people, diverse
- **Avatars:** User initials in circle, Accent background, cream text (24-40px)

## Dark Mode (Future)

When added, maintain the same structure but invert light/dark:
- Ink ↔ Cream
- Charcoal ↔ Mist
- All other colors stay the same (high chroma accents work dark mode too)

---

**Generated by `/impeccable teach`** — Adjust as you iterate.
