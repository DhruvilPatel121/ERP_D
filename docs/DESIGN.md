## Vibe

- Dieter Rams functionalism × Swiss precision typographic grid — restrained, high-information-density light mode desktop ERP with warm silver-white surfaces and a deep slate primary that echoes premium jewellery industry catalogues

## Color

- Primary: #1E3A5F
- On Primary: #FFFFFF
- Accent: #B8965A
- On Accent: #FFFFFF
- Background: #F4F6F8
- Foreground: #0F172A
- Muted: #E2E8F0
- Border: #CBD5E1
- Secondary: #2D5282

## Typography

- Heading: Inter (family: 'Inter', sans-serif, weight: 600, url: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap)
- Body: Inter (family: 'Inter', sans-serif, weight: 400, url: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap)

## Visual Language

- Core visual signature: precision ruled hairline borders (1px #CBD5E1) separating data zones within white cards — evoking technical reference catalogues and Swiss-grid precision instruments
- Material & depth: white cards (#FFFFFF) floating on cool-gray #F4F6F8 page; thin border rings instead of shadows; sidebar uses #1E3A5F deep slate with white icons; table headers use #F8FAFC with bottom border rule
- Containers & buttons: rectangular cards with 8px radius and 1px border; primary buttons deep slate fill; secondary muted fill; status badges as compact chips; table rows alternate with #FAFBFC; active sidebar item uses Accent #B8965A left bar + light tint background
- Layout rhythm: dense sidebar (240px) + spacious content area; KPI cards in 4-column grid; Accent gold only on active states, badges, CTAs; 24px section padding between dense data zones

## Animation

- Entrance: page content fades in at 150ms ease-out; cards slide up 8px on mount
- Interaction: button hover darkens background 8% at 100ms; row hover shows #F1F5F9 tint at 80ms
- Scroll / transition: sidebar collapse/expand at 200ms ease; modal overlay at 180ms fade

## Forbidden

- Dark backgrounds, dark mode surfaces, or dramatic light/shadow theatrics
- Gradients, glassmorphism, or frosted-glass overlays
- Decorative emoji or CSS-faked brand logos

## Additional Notes

- Light mode only — force light mode in index.css; no dark mode toggle
- Login page: split-screen — left panel deep slate #1E3A5F with business logo and subtle geometric pattern; right panel white form
- All icons from lucide-react; no emoji in UI
