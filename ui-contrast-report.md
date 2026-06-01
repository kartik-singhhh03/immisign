# UI Contrast & Design Audit Report (Phase 4A)

**Status:** Awaiting Manual Browser Verification
**Note:** As per instructions, no item has been marked PASS until verified manually in the browser. 

This report highlights potential visual accessibility and contrast issues discovered in the codebase.

## 1. Low Contrast Text Issues

The codebase relies heavily on the `text-slate-400` and `text-slate-500` utility classes, often combined with small text sizes (`text-[10px]`, `text-[11px]`, `text-xs`).

- **Small & Muted Text**: 
  Found instances of `text-[10px] text-slate-400 font-medium`. This combination often fails WCAG AA contrast guidelines, especially on grey backgrounds (`bg-slate-50`).
  - *Location*: Common in Table Headers, Send Document Flow "Upload Details", and Settings descriptions.
  - **Status**: [ ] UNVERIFIED (Needs manual contrast check)

- **White Text on Light Backgrounds**: 
  Found instances using `bg-emerald-50` or `bg-white/40` combined with white hover states.
  - **Status**: [ ] UNVERIFIED

## 2. Hover State Visibility

- **Invisible Hover Text**: 
  Searching for `hover:text-white` and `hover:bg-white` revealed potential issues where text might disappear on hover if the background is also light. 
  - *Example*: `text-slate-500 hover:bg-slate-50 hover:text-slate-800` vs `bg-[#0D9F8C] text-white`.
  - **Status**: [ ] UNVERIFIED

- **Missing Hover Cursors**:
  Some clickable elements (like table rows or custom cards) lack `cursor-pointer`, leading to poor UX.
  - **Status**: [ ] UNVERIFIED

## 3. Dark Mode Issues

The project uses hardcoded hex colors heavily (e.g., `bg-[#0D9F8C]`, `bg-[#081B2E]`, `border-slate-200`) instead of CSS variables (`bg-primary`, `bg-background`). 

- **Hardcoded Colors**: 
  If Dark Mode is toggled, these hardcoded colors will not invert, leading to unreadable screens (e.g., dark text on dark backgrounds).
  - *Search Results*: Over 100+ instances of `text-[#081B2E]` (Dark Navy) and `bg-white` hardcoded.
  - **Status**: [ ] UNVERIFIED (Check by toggling system theme to Dark)

## 4. Sidebar & Tab Selection Issues

- **Selected Tab Indicators**: 
  Some tabs use `border-b-2 border-[#0D9F8C]` but don't sufficiently change the text color (leaving it `text-slate-500`).
  - **Status**: [ ] UNVERIFIED

- **Sidebar Active State Contrast**: 
  Active sidebar items use `bg-white/10` or similar, which might not be distinct enough from inactive items depending on the user's monitor calibration.
  - **Status**: [ ] UNVERIFIED

## Action Items
1. Run a WCAG Contrast Checker extension on the Dashboard and Settings pages.
2. Replace hardcoded hex values (`#081B2E`, `#0D9F8C`) with Tailwind CSS variables (`text-primary`, `bg-background`) to fully support Dark Mode.
3. Increase font sizes for critical legal text from `text-[10px]` to at least `text-xs` (12px).
