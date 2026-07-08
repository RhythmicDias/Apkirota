---
name: Azure Workspace
colors:
  surface: '#f9f9ff'
  surface-dim: '#ccdbf6'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d5e3ff'
  on-surface: '#0d1c30'
  on-surface-variant: '#42474f'
  inverse-surface: '#233146'
  inverse-on-surface: '#ebf1ff'
  outline: '#727780'
  outline-variant: '#c2c7d0'
  surface-tint: '#30618f'
  primary: '#2d5f8d'
  on-primary: '#ffffff'
  primary-container: '#4878a7'
  on-primary-container: '#fdfcff'
  inverse-primary: '#9ccafe'
  secondary: '#3d6187'
  on-secondary: '#ffffff'
  secondary-container: '#aed2fe'
  on-secondary-container: '#365a80'
  tertiary: '#3b6174'
  on-tertiary: '#ffffff'
  tertiary-container: '#54798e'
  on-tertiary-container: '#fbfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e4ff'
  primary-fixed-dim: '#9ccafe'
  on-primary-fixed: '#001d35'
  on-primary-fixed-variant: '#0f4976'
  secondary-fixed: '#d1e4ff'
  secondary-fixed-dim: '#a6c9f5'
  on-secondary-fixed: '#001d36'
  on-secondary-fixed-variant: '#23496e'
  tertiary-fixed: '#c1e8ff'
  tertiary-fixed-dim: '#a5cce2'
  on-tertiary-fixed: '#001e2b'
  on-tertiary-fixed-variant: '#244b5e'
  background: '#f9f9ff'
  on-background: '#0d1c30'
  surface-variant: '#d5e3ff'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 280px
  gutter: 1.5rem
  margin-page: 2rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

The design system is a **Corporate / Modern** workspace aesthetic that prioritizes clarity, focus, and a serene professional atmosphere. Inspired by high-productivity SaaS tools, it utilizes the expansive layout of a sidebar-driven interface to manage complex information flows without overwhelming the user.

The brand personality is **reliable, calm, and precise**. It avoids heavy shadows or aggressive gradients in favor of subtle tonal layering and refined typography. The emotional response is one of "organized intelligence"—a clean slate where the user's data and tasks take center stage, supported by a sophisticated palette of airy blues.

## Colors

This design system utilizes a monochromatic blue foundation to create a cohesive workspace. 

- **Primary (#5483B3):** Used for primary actions, active navigation states, and key iconography.
- **Secondary (#7DA0CA):** Used for secondary UI elements, borders, and hover states.
- **Tertiary (#C1E8FF):** Employed as the primary background for sidebars and large container surfaces to provide a distinct but soft organizational anchor.
- **Neutral (#021024):** Reserved for high-contrast text and deep structural elements to ensure maximum legibility against the light blue backgrounds.
- **Functional Backgrounds:** A very light tint (#F8FAFC) is used for the main content area to differentiate it from the more colorful sidebar.

## Typography

The typography strategy balances modern professionalism with technical precision. 

**Manrope** is used for headlines to provide a warm yet geometric feel that remains readable at large scales. **Inter** handles the bulk of the UI and body copy, chosen for its exceptional clarity in data-dense environments. **JetBrains Mono** is introduced for labels, metadata, and status indicators, providing a subtle "workspace" or "tooling" vibe that aids in information hierarchy.

For mobile devices, `headline-xl` should scale down to 32px and `headline-lg` to 24px to ensure content fits within portrait orientations.

## Layout & Spacing

This design system uses a **fixed sidebar with a fluid content area**. 

- **Sidebar:** A persistent 280px wide container on the left, utilizing the Tertiary blue background.
- **Content Area:** A fluid container that expands to fill the remaining viewport. On ultra-wide monitors, content should be capped at a max-width of 1200px and centered.
- **Grid:** A 12-column grid is used within the content area for dashboard layouts. 
- **Responsive:** On mobile (below 768px), the sidebar transitions into a bottom navigation bar or a hidden "hamburger" drawer. Content margins reduce from 2rem to 1rem.

## Elevation & Depth

Visual hierarchy is achieved through **tonal layers** rather than heavy drop shadows. 

The background uses a hierarchy of tint:
1. **Level 0 (Base):** The Main Content Area (#F8FAFC).
2. **Level 1 (Sidebar):** The Tertiary Blue (#C1E8FF).
3. **Level 2 (Cards/Inputs):** Pure White (#FFFFFF) with a thin 1px border in Secondary Blue (#7DA0CA) at 20% opacity.

Where depth is required for overlays (modals or dropdowns), use a **very soft ambient shadow**: `0px 4px 20px rgba(2, 16, 36, 0.08)`. This keeps the UI feeling light and airy while indicating stack order.

## Shapes

The shape language is **Rounded**, using a 0.5rem (8px) base radius. This softens the professional aesthetic, making the workspace feel approachable. 

- Large containers and cards use `rounded-xl` (24px) to create a "containerized" feel.
- Standard buttons and input fields use the base 8px radius.
- System-level pills (like tags or chips) use the maximum roundedness (pill-shaped) to distinguish them from actionable buttons.

## Components

### Buttons
Primary buttons use the Primary Blue (#5483B3) with White text. Secondary buttons use a Tertiary Blue background with Primary Blue text. All buttons have an 8px corner radius and height-balanced padding (e.g., 12px vertical, 24px horizontal).

### Sidebar Navigation
Active items should be indicated by a Primary Blue left-edge border (4px) and a subtle background tint of Secondary Blue at 10% opacity. Text for active items shifts to Primary Blue.

### Input Fields
Inputs are white with a 1px border (#7DA0CA). On focus, the border thickens to 2px and changes to Primary Blue (#5483B3), accompanied by a soft blue outer glow.

### Cards
Cards are the primary layout unit. They feature white backgrounds, `rounded-xl` corners, and no visible shadow unless hovered. A light border (#7DA0CA at 20%) defines their boundaries.

### Chips & Tags
Use the Tertiary Blue (#C1E8FF) background with the Label-sm font style. These are always fully rounded (pill-shaped) to contrast against the 8px corners of buttons.