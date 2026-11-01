# Marketing a11y / mobile checklist

Run after `npm run report:marketing`. Check each item on `/`, `/plans`, `/about`, `/partners`, `/contact`, `/privacy`, `/terms`.

## Keyboard

- [ ] Skip-to-content link appears on first Tab and jumps to `#main-content`
- [ ] Header / footer links are reachable in a sensible order
- [ ] Focus is visible (`:focus-visible`) on links, buttons, and form controls
- [ ] Contact form and FAQ accordion operable without a pointer
- [ ] Modals / dialogs (if any) trap focus and restore it on close

## Contrast & text

- [ ] Body text meets WCAG AA on light and ink surfaces
- [ ] Buttons / links have sufficient contrast in default and hover states
- [ ] Error text on contact form is readable

## Media

- [ ] Hero / logo / event images have meaningful `alt` when present
- [ ] Decorative images use empty alt or are CSS backgrounds
- [ ] No invented stock faces; media comes from CMS / live events

## Motion

- [ ] With `prefers-reduced-motion: reduce`, decorative motion is minimized
- [ ] Essential UI still works without animation

## Mobile chrome

- [ ] First viewport is usable at ~390px width (no horizontal scroll)
- [ ] Tap targets ≥ ~44px for primary CTAs
- [ ] Sticky header does not obscure focus targets
- [ ] Forms usable with on-screen keyboard (contact)

## Notes

| Date | Tester | Result |
| --- | --- | --- |
| | | |
