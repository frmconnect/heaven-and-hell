# Final Freedom — app icon brief

**Idea (owner):** a runner sprinting into Heaven's open gates, light pouring through.

`icon-1024.png` is a draft made from the game's own models. Use it as the reference picture,
or as the icon itself until a final version is made. Re-render it any time: `node scripts/render-icon.cjs`.

## Prompt (Hyper3D or an image generator)
> Mobile game app icon. Seen from behind and slightly below: a small human runner in a beige tunic sprinting along a white marble path with gold edges, into giant open pearly gates of Heaven — two tall white marble pillars with gold bands, a golden arch on top with a small shining star, gold-barred pearl doors swung open. Brilliant warm white-gold light bursts through the open gates with soft rays fanning out. Puffy white clouds around the base. Deep blue sky at the top fading to gold near the gates. Stylized low-poly, clean, bright, high contrast, readable at small size, centred, no text.

**With Hyper3D:** it makes one 3D object at a time, so make the **gate** and the **runner** as two models (prompts in `HYPER3D_PROMPTS.md`), place them in Blender like the draft (runner in front, a little below centre, gate behind), add a bright light behind the gates, and render a square picture. Or send Claude the two models and Claude renders the icon.

## What the stores need
- **Apple:** 1024 × 1024 PNG, square corners (iPhone rounds them itself), no transparency.
- **Google Play:** 512 × 512 PNG, square (Google rounds/masks it).
- **Android phone icon (adaptive):** the most important part (gate + runner) must sit in the middle two-thirds — some phones cut icons into circles. Claude makes these versions from the final picture.
- No words in the icon (the name shows under it on the phone).
