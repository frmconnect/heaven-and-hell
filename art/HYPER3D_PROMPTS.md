# Final Freedom — Hyper3D prompts for every model

For each item: open its **reference picture** (`art/reference/...png`) and its **prompt** below.
In Hyper3D (website or the Blender add-on): upload the picture **and** paste the prompt, then generate.

## Settings to use every time
- **Mesh:** triangles, **low face count** (the lowest/"extra-low"/"low" option, about **2,000–5,000 faces**). Phones need light models.
- **Export:** **GLB**.
- **One object per file**, centred, standing on the ground, nothing else in the scene (no floor, no background).
- **Name the file** exactly like the original (e.g. `devil.glb`) so Claude knows what it replaces.

## Style — add this to the end of EVERY prompt
> stylized low-poly game asset, clean flat-shaded colours, simple readable shapes, mobile game, no text, no base or ground plane, single object, front view facing camera

(Keep it the same for every item so the whole game matches.)

## Don't worry about exact size
Claude scales each new model to fit the game automatically (the game's sizes are in `BLENDER_GUIDE.md`). Just keep the **proportions** like the reference picture — e.g. a jump barrier must stay low and wide, a wall tall and wide.

## Characters need movement
Hyper3D makes a still model. The runner, the Devil and the Shadow also need animation:
1. Export the Hyper3D model as **FBX** (or GLB → convert in Blender).
2. Upload to **Mixamo** (free, mixamo.com, Adobe account) → it adds a skeleton automatically.
3. Pick animations: runner **Running, Jump, Running Slide, Idle, Stumble**; Devil **Running, Zombie Attack (lunge)**.
4. Download (FBX, "with skin"), open in Blender, export **GLB** with animations. Name animations as in `BLENDER_GUIDE.md` (run, jump, slide…).
The Shadow floats, so it can skip Mixamo — Claude animates it in code.

---

## Characters (`characters/`)
| File | Prompt (then add the style line) |
| --- | --- |
| `runner-pilgrim.glb` | young human pilgrim runner, simple beige tunic with brown belt, dark trousers, short brown hair, athletic running pose, seen from behind and front |
| `runner-angel.glb` | same runner in flowing white robes with gold trim and gold belt, light golden hair |
| `runner-fallen.glb` | same runner in black robes with dark red accents, very dark hair, slight ember glow on the trim |
| `runner-golden.glb` | same runner in shining polished gold armour, warm gold glow |
| `devil.glb` | huge red horned devil, muscular, bat-like dark wings, glowing yellow eyes, long clawed arms reaching forward, menacing but cartoon-friendly |
| `shadow-of-sins.glb` | dark hooded ghostly spirit in a flowing purple-black robe, empty black face with two glowing violet eyes, smoky wisps instead of legs, clawed hands reaching forward |

Tip: make `runner-pilgrim` first, then use the same model for the other outfits by changing only its colours in Blender — the outfits must have the same shape.

## Wings (`wings/`) — make the wings alone, without the runner
| File | Prompt |
| --- | --- |
| `angelwings` | pair of soft white feathered angel wings, spread, symmetrical |
| `batwings` | pair of leathery dark red-black bat wings with pointed tips, spread, symmetrical |
| `crystalwings` | pair of glowing translucent light-blue crystal wings made of faceted shards, spread |
| `firewings` | pair of wings made of orange and yellow flames, spread, glowing |

## Obstacles (`obstacles/<world>/`) — four kinds in every world
Kinds: **jump-barrier** (low and wide: you jump over it) · **slide-beam** (a bar held high on two posts: you slide under it) · **wall** (tall block: you go around it) · **gap** (a hole in the floor, seen from above).

| World | jump-barrier | slide-beam | wall | gap |
| --- | --- | --- | --- | --- |
| hell | low dark stone barrier with a row of flames on top | burning wooden beam held up high by two black iron posts | jagged dark volcanic rock with glowing red cracks | rectangular pool of bubbling orange lava with a dark stone rim |
| stairway | broken white marble step block with gold trim | white marble beam on two golden posts, soft blue glow underneath | white marble pillar block with gold bands | broken gap in white marble stairs with red hellish glow far below |
| gardens | low trimmed green hedge with pink flowers | vine-covered wooden arch with pink blossoms | large round topiary tree on a short trunk | hole in a grassy path showing white clouds below |
| bridges | low royal-blue crystal fence with bright gold top | royal-blue crystal beam with gold edge on two gold posts | tall deep-blue crystal shard on a gold base | rectangular gap in a crystal bridge with a glowing cyan outline, dark blue void below |
| kingdom | low white marble barrier with gold trim and a small gem | white marble beam with gold edge on two gold posts | white marble pillar block with gold bands | gap in golden tiles showing golden clouds below |
| cosmic | low violet glowing barrier with cyan neon top edge | violet glowing beam with cyan neon edge on two posts | tall violet crystal shard with cyan glow | gap in a dark glass floor with cyan neon outline, starry void below |

## Scenery (`scenery/<world>/`)
| World | Files and prompts |
| --- | --- |
| hell | `rock-spire`, `rock-spire-far`: tall jagged dark volcanic rock spire · `fire-brazier`: black iron brazier on a pole with a flame |
| stairway | `gold-column`: white marble column with gold top and a glowing orb · `angel-statue`: white marble angel statue with wings and a gold halo on a square base · `cloud`: puffy white cloud |
| gate | `cloud`: puffy white cloud · `gold-column`: as stairway |
| gardens | `tree`, `tree-far`: heavenly tree with green and pink blossom leaves · `flower-bush`: round green bush with pink flowers · `fountain`: white marble two-tier fountain with light-blue water |
| bridges | `crystal-lamp`: thin gold lamp post with a glowing blue crystal on top · `floating-island`: small floating rock island with grass and a blossom tree on top · `cloud`: puffy white cloud |
| kingdom | `gold-column`: as stairway · `golden-tower`: tall white tower with a gold cone roof · `temple`: small white marble temple with columns and a gold roof |
| cosmic | `star-lamp`: thin cyan neon post with a glowing white orb · `crystal-spire`: cluster of tall violet glowing crystals · `planet`: small purple planet with a golden ring |
| god | `golden-cloud`: puffy warm golden cloud · `gold-column`: as stairway |

## The world
| File | Prompt |
| --- | --- |
| `world/heavens-gate.glb` | giant pearly gates of Heaven: two tall white marble pillars with gold capitals, a golden arch on top with a shining star, two tall pearl-white gate doors with gold bars, closed |
| `track/*-floor-10m.glb` | **Optional — keep the current ones.** Floors are simple flat pieces the game repeats; an AI model adds little. If you want to try: "a straight 10-metre section of a three-lane running path" + the world's look (dark volcanic stone with glowing cracks / white marble stairs with gold railings / mossy stone garden path / glowing crystal bridge / gold tiles / dark glass with neon grid) |

## Pickups (`pickups/`)
| File | Prompt |
| --- | --- |
| `coin.glb` | **Optional — keep the current one** (a plain gold coin). |
| `lost-soul.glb` | small glowing translucent pale-blue ghost of a person in a robe, arms raised asking for help |
| `temptation-cursed-gold.glb` | small pile of red-gold cursed coins with a floating glowing red gem above it |
| `miracle-shield.glb` | glowing golden halo ring |

---
**Order to work in (most visible first):** runner-pilgrim → devil → shadow → hell obstacles → heaven's gate → wings → the other worlds' obstacles → scenery → pickups.
Send each finished file to Claude (chat, or upload to `art/incoming/` on GitHub) — you don't need to finish them all first.
