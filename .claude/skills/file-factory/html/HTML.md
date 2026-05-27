# HTML Generation Guide

Generate self-contained HTML files with inline CSS/JS and CDN libraries. All output is a single `.html` file that opens in any browser -- no build tools, no server required.

## Complexity Levels

### Level 1: Static
**Philosophy:** Clean semantic HTML. No JavaScript. Text-focused, minimal styling.

- Single font, black text on white
- Semantic HTML5 tags (`<article>`, `<section>`, `<header>`, `<nav>`)
- Inline `<style>` block, no external dependencies
- Responsive via `max-width` + `margin: auto`
- Use case: documentation, printable reference sheets, formal write-ups

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Title</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.8; color: #1a1a1a; }
    h1 { font-size: 1.8rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }
    h2 { font-size: 1.3rem; margin-top: 2rem; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <!-- Clean semantic content -->
</body>
</html>
```

### Level 2: Styled
**Philosophy:** Polished single-page with color palette, typography, sections, responsive grid.

- Tailwind CSS via CDN (`<script src="https://cdn.tailwindcss.com"></script>`)
- 2-3 accent colors from theme palette
- Responsive grid layout, card components
- Subtle box-shadows, rounded corners, section dividers
- Use case: client-facing summaries, styled reports, landing pages

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwindcss.config = {
    theme: { extend: { colors: { primary: '#1F4E79', accent: '#059669' } } }
  }
</script>
```

**Key patterns:**
- Hero section with gradient background
- Feature grid (`grid grid-cols-1 md:grid-cols-3 gap-6`)
- Card components with shadow (`bg-white rounded-xl shadow-md p-6`)
- Footer with contact/links

### Level 3: Interactive
**Philosophy:** Adds JS interactivity without heavy frameworks. User can click, filter, toggle.

Everything from Level 2, plus:
- Tab panels, accordions, modals (vanilla JS)
- Dark/light theme toggle with `localStorage` persistence
- Chart.js via CDN for data visualizations
- Smooth scroll navigation
- Filterable/sortable tables
- Copy-to-clipboard buttons on code blocks

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

**Key patterns:**
```javascript
// Tab switching
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(btn.dataset.tab).classList.remove('hidden');
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Dark mode toggle
const toggle = document.getElementById('theme-toggle');
toggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
});
```

### Level 4: Animated (DEFAULT)
**Philosophy:** CSS animations, scroll-triggered reveals, micro-interactions. Client-presentation quality.

Everything from Level 3, plus:
- AOS (Animate On Scroll) via CDN
- CSS keyframe animations for hero elements
- Gradient animated backgrounds
- Hover effects on cards (scale, shadow lift, color shift)
- Progress bars with animation
- Counter animations (count up on scroll)
- Smooth page transitions between sections

```html
<link rel="stylesheet" href="https://unpkg.com/aos@2.3.4/dist/aos.css" />
<script src="https://unpkg.com/aos@2.3.4/dist/aos.js"></script>
<script>AOS.init({ duration: 800, once: true });</script>
```

**Key patterns:**
```html
<!-- Scroll reveal -->
<div data-aos="fade-up" data-aos-delay="100">Content appears on scroll</div>

<!-- Animated gradient background -->
<style>
  .gradient-bg {
    background: linear-gradient(-45deg, #1F4E79, #059669, #7C3AED, #DC2626);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
</style>

<!-- Counter animation -->
<script>
function animateCounter(el, target) {
  let current = 0;
  const step = target / 60;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current);
  }, 16);
}
// Trigger on intersection observer
</script>
```

**Micro-interactions:**
- Buttons: `transition: all 0.3s ease; &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }`
- Cards: scale(1.02) on hover with shadow elevation
- Navigation: underline slide-in on hover
- Icons: subtle rotation or bounce on hover

### Level 5: Immersive
**Philosophy:** Full-page transitions, particle effects, GSAP animations. Portfolio/showcase quality.

Everything from Level 4, plus:
- GSAP (GreenSock) for timeline-based animations
- Parallax scrolling sections
- Particle.js or custom canvas particle backgrounds
- Video background sections (with overlay)
- Glassmorphism cards (backdrop-filter: blur)
- Typed.js for typewriter text effects
- ScrollTrigger for scroll-linked animations
- Dynamic counters with easing

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
```

**Key patterns:**
```javascript
// GSAP scroll-triggered animation
gsap.from('.feature-card', {
  scrollTrigger: { trigger: '.features', start: 'top 80%' },
  y: 60, opacity: 0, stagger: 0.2, duration: 1, ease: 'power3.out'
});

// Parallax
gsap.to('.parallax-bg', {
  scrollTrigger: { trigger: '.parallax-section', scrub: true },
  y: -200
});
```

**Glassmorphism:**
```css
.glass-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

### Level 6: Ultra
**Philosophy:** Three.js/canvas, WebGL, complex SVG animations. Art-piece/demo quality.

Everything from Level 5, plus:
- Three.js for 3D backgrounds or interactive elements
- Custom SVG path animations
- WebGL shaders for visual effects
- Interactive 3D data visualizations
- Full-screen immersive scroll experiences
- Audio integration (optional, user-triggered)
- Custom cursor effects

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```

**Key patterns:**
```javascript
// Three.js animated background
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Particle field, geometric shapes, etc.
```

## Theme Integration

HTML files use the same color palettes from `themes/color-palettes.md`:

```javascript
// Default light theme (same as other formats)
const theme = {
  primary: '#1F4E79',
  accent: '#059669',
  text: '#1F2937',
  textSecondary: '#6B7280',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB'
};
```

Apply via CSS custom properties for easy theme switching:
```css
:root {
  --color-primary: #1F4E79;
  --color-accent: #059669;
  --color-text: #1F2937;
  --color-bg: #FFFFFF;
  --color-surface: #F9FAFB;
}
```

## Output Rules

1. **Single file** -- everything in one `.html` file (CSS inline, JS inline, libraries via CDN)
2. **Self-contained** -- must work by double-clicking to open in browser, no server needed
3. **Mobile responsive** -- all levels must work on mobile (test with viewport meta tag)
4. **Light theme default** -- dark themes only if explicitly requested
5. **Performance** -- lazy-load heavy libraries, use `loading="lazy"` on images
6. **Accessibility** -- semantic HTML, alt text, ARIA labels, keyboard navigable
7. **Print-friendly** -- Level 1-2 should include `@media print` styles

## CDN Reference

| Library | CDN | Used in |
|---------|-----|---------|
| Tailwind CSS | `https://cdn.tailwindcss.com` | L2+ |
| Chart.js | `https://cdn.jsdelivr.net/npm/chart.js` | L3+ |
| AOS | `https://unpkg.com/aos@2.3.4/dist/aos.js` | L4+ |
| GSAP | `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js` | L5+ |
| ScrollTrigger | `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js` | L5+ |
| Three.js | `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` | L6 |
| Typed.js | `https://cdn.jsdelivr.net/npm/typed.js@2.0.12` | L5+ |
| Particles.js | `https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js` | L5+ |
