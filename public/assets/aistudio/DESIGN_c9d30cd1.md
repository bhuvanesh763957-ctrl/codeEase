---
name: CodeEase Precision Engine
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1e'
  surface-container: '#1f1f22'
  surface-container-high: '#2a2a2d'
  surface-container-highest: '#353438'
  on-surface: '#e4e1e6'
  on-surface-variant: '#ccc3d7'
  inverse-surface: '#e4e1e6'
  inverse-on-surface: '#303033'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d3bbff'
  primary: '#d3bbff'
  on-primary: '#3f008d'
  primary-container: '#6d28d9'
  on-primary-container: '#dac5ff'
  inverse-primary: '#7331df'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#62df7d'
  on-tertiary: '#003914'
  tertiary-container: '#00672a'
  on-tertiary-container: '#6be886'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ebddff'
  primary-fixed-dim: '#d3bbff'
  on-primary-fixed: '#250059'
  on-primary-fixed-variant: '#5b00c5'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#131316'
  on-background: '#e4e1e6'
  surface-variant: '#353438'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-code-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  caption:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system embodies a high-density, developer-first philosophy balancing technical rigor with refined elegance. Borrowing the deliberate micro-interactions of Linear, the sharp contrast and monospaced accents of Vercel, and the contextual clarity of Programiz PRO, this system prioritizes deep focus, information density, and low cognitive overhead.

The aesthetic combines technical minimalism with subtle layered surfaces. Interfaces remain restrained, foregrounding developer workflows, intelligent telemetry, and syntax visualization through disciplined layout grids and deliberate accent hits.

## Colors
The system defaults to a dark mode engineered for extended workstation sessions, paired with an equally balanced light mode for daylight legibility.

### Surface Tiers & Token Application
- **Dark Mode Canvas:** Base viewport sits on `#09090B`. Structural sidebars, panels, and tool rails employ `#111114`. Dynamic cards, code execution panes, and interactive overlays reside on `#18181B`.
- **Light Mode Canvas:** Base viewport sits on `#FAFAFC`. Structured sidebars, cards, and elevate surfaces occupy `#FFFFFF`.
- **Structural Borders:** Subtle 1px boundaries enforce structure without clutter (`#27272A` in dark, `#E4E4E7` in light).
- **Accents:** The primary purple (`#6D28D9` light mode / `#A78BFA` dark mode) communicates interactive authority, selected branch states, and AI generation hooks. The secondary purple (`#8B5CF6`) serves hover and gradient highlights, while `#F3E8FF` (or `#2E1065` at 20% opacity in dark mode) yields subtle selection washes.
- **Semantic Feedback:** Success and passing tests rely on `#16A34A`. Neutral typography uses high-contrast text (`#FAFAFA` dark / `#18181B` light) paired with mid-tone metadata secondary values (`#A1A1AA` dark / `#71717A` light).

## Typography
Typography is split strictly by function:
- **Geist** governs primary structural UI, interactive text, headers, and instructional documentation, offering geometric clarity and high legibility at micro scales.
- **JetBrains Mono** governs terminal output, code snippets, keyboard shortcuts, tab indicators, status badges, and inline variables.

Monospaced elements maintain tabular figures by default to prevent layout shifts during live metrics streaming or automated code generation.

## Layout & Spacing
The layout follows a strict 4px/8px incremental rhythm structured for data-heavy developer environments.

### Grid Architecture
- **Desktop (1280px+):** Fixed tool-dock/sidebar navigation (240px–280px), multi-panel adjustable code editor split (fluid), and contextual inspector panel (320px). Panels maintain a 1px border gap with zero outer viewport margin for an IDE-like edge-to-edge frame.
- **Dashboard / Documentation Pages:** A 12-column fluid grid system constrained to a maximum width of 1440px, utilizing a 16px (`1rem`) gutter and 24px (`1.5rem`) outer canvas margin.
- **Tablet / Split View (768px - 1279px):** Inspector panels collapse into slide-over drawers; 8-column layout with 16px margins.
- **Mobile (< 768px):** Navigation collapses to a bottom persistent tray or top app header; 4-column layout with 12px gutters and 16px margins. Primary code views convert to horizontally scrollable viewports.

## Elevation & Depth
The system eliminates blurry, diffuse drop shadows in favor of structured tonal layering and high-precision hair-line outlines.

### Depth Mechanics
- **Base Level (Canvas):** Flat surface with no shadow (`#09090B` / `#FAFAFC`).
- **Surface Elevation (Cards & Panels):** Achieved via a 1px solid border (`#27272A` / `#E4E4E7`) paired with a micro-inset outline (`inset 0 1px 0 0 rgba(255, 255, 255, 0.05)` in dark mode).
- **Floating Overlays & Menus:** Menus, tooltips, and command palettes rely on solid background containment (`#18181B` / `#FFFFFF`), a 1px stroke (`#3F3F46` / `#D4D4D8`), and a directional directional shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.45)`.
- **Active Focus & AI Thinking State:** Elements in an active generation cycle adopt a subtle outer halo using the accent purple: `0 0 0 1px #A78BFA, 0 0 16px -2px rgba(167, 139, 250, 0.25)`.

## Shapes
To preserve an engineered, tool-like precision, radii scale strictly according to component area:
- **Interactive Controls (Inputs, Buttons, Segmented Tabs):** 8px border radius (`0.5rem`).
- **Structural Containers (Cards, Code Blocks, Panels):** 12px to 16px border radius (`0.75rem` to `1rem`).
- **Badges, Inline Status Dots, Terminal Chips:** 4px to 6px subtle corner radius.
- Circles are reserved exclusively for avatars and round status indicators.

## Components

### Buttons
- **Primary:** Dark mode uses high-contrast `#FAFAFA` text on `#6D28D9` background (or `#A78BFA` in dark theme accents), 8px radius, 36px height for standard actions. Hover state transitions to `#8B5CF6`. Active state scales to `0.98`.
- **Secondary / Ghost:** Outlined with 1px `#27272A` (dark) or `#E4E4E7` (light), `#18181B` surface. On hover, background shifts to 8% white/black wash.
- **Kbd Action Shortcut:** Integrated right-aligned badge set in `JetBrains Mono` (`label-code-sm`), slightly dimmed with low-opacity borders.

### Input Fields & Search Bars
- Fixed height: 36px (compact) or 40px (default).
- Background: `#111114` in dark, `#FFFFFF` in light.
- Border: 1px `#27272A` (dark) / `#E4E4E7` (light). Focus state produces a crisp border transition to `#A78BFA` with no heavy outer ring blur.
- Monospaced indicator tag or icon affixed to the prefix slot.

### Cards & Code Execution Tiles
- Background: `#18181B` (dark) / `#FFFFFF` (light) with 12px-16px radius and 1px perimeter border.
- Header bars in cards (e.g., file names or tab bars) feature an integrated bottom border and mono-spaced breadcrumbs.

### Chips & Status Badges
- Pill-cut or 4px-box variations.
- Syntax tag: JetBrains Mono at 11px, height of 22px, padded with 8px horizontal space.
- Success state: Low-opacity green fill (`rgba(22, 163, 74, 0.1)`) with `#16A34A` solid text and dot indicator.

### Checkboxes & Radios
- Size: 16px x 16px with 4px radius for checkboxes, full circle for radios.
- Unchecked: 1px border `#3F3F46`, transparent background.
- Checked: `#6D28D9` fill with an optically centered white checkmark or dot.

### Code Editor & Terminal Panel (Domain-Specific)
- Background `#09090B` integrated directly within `#18181B` card containers.
- Line numbers rendered in `JetBrains Mono` with `#71717A` typography.
- AI inline suggestion overlay rendered in italicized mid-tone text with a secondary accent border indicator on active code lines.