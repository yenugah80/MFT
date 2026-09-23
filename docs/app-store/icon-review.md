# App Icon Review — Health & Fitness Category

Source: `mobile/assets/styles/images/icon.png` (1024×1024 master).

## What it is

A circular badge combining four separate symbols in one mark: a leaf
(top, nutrition), a heart with a gauge/needle inside it (center, health
metric), a flame (bottom-left, calories/activity), and a water droplet
(bottom-right, hydration), wrapped in a green→orange→blue gradient.

## Finding: fails legibility at real display sizes

Icons are judged at home-screen/Spotlight/Settings size, not at the
1024px App Store master. Downscaled the actual file with `sips` to check:

- **120×120** (@2x home screen tile): the four symbols are still
  each barely identifiable, but already visually crowded — no
  single element reads as "the icon" at a glance.
- **60×60**: individual symbols (heart, gauge needle, flame, droplet)
  are no longer legible as separate shapes — it reads as a colorful
  circular blob with vague green/blue/orange regions.
- **40×40** (Spotlight search / Settings size): fully illegible detail;
  only the overall color blend and a hint of the leaf survive.

This isn't subjective — Apple's own HIG guidance for icons is explicit
that a design has to hold up at the smallest size it's shown at, and
this one was built for the 1024px canvas (four distinct rendered
symbols, gradients, drop shadows) without that constraint in mind.

## Finding: distinctiveness is diluted, not enhanced, by cramming in every feature

Trying to represent all four tracked categories (nutrition, vitals,
activity, hydration) in one mark means none of them can be rendered
large enough to be a recognizable silhouette on its own. The strongest
app icons in this category work as a single silhouette recognizable in
grayscale at 29px (e.g., a single leaf, a single heartbeat line, a
single drop) — this icon has no equivalent single silhouette; it only
reads as "colorful circle" until you're close enough to see detail that,
per the sizes above, never actually renders on a real device.

## Not fixed here

This is a review, not a redesign — per your own scoping of the ASO pass
("review app icon's distinctiveness," not "replace it"), no changes to
`icon.png` were made. A redesign is a real creative/product decision
(pick one motif, not four) that's worth a deliberate pass, not a
quick swap — flag if you want that done as a follow-up.
