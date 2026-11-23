# Final Freedom — 3D art: start here

What to make, in what order, and exactly how to do it in Blender on your computer.
Send me each finished model as you go. You don't need to finish them all first.

---

## Part 1 — What to make (in this order)

The game already works with simple built-in shapes, so **every model you make is an upgrade, never a blocker.**
Do them top to bottom. The most-seen things come first.

### Batch 1 — the stars (do these first)
| ✓ | # | File to make | What it is | Best way |
|---|---|---|---|---|
| ☐ | 1 | `runner-pilgrim.glb` | **The player.** On screen 100% of the time. | Hyper3D, then Mixamo for movement |
| ☐ | 2 | `devil.glb` | The Devil chasing you in Hell | Hyper3D, then Mixamo |
| ☐ | 3 | `shadow-of-sins.glb` | The ghost chasing you in Heaven | Hyper3D (no movement needed) |
| ☐ | 4 | `obstacles/hell/jump-barrier.glb` | Low stone barrier with flames (jump over) | **By hand: your practice model** (Part 4) |
| ☐ | 5 | `obstacles/hell/slide-beam.glb` | Burning beam on two posts (slide under) | By hand or Hyper3D |
| ☐ | 6 | `obstacles/hell/wall.glb` | Big volcanic rock (go around) | Hyper3D |
| ☐ | 7 | `obstacles/hell/gap.glb` | Lava pool in the floor (jump across) | By hand |
| ☐ | 8 | `world/heavens-gate.glb` | The pearly gates (the big moment) | Hyper3D |

### Batch 2 — things players buy or collect
| ✓ | File | What it is |
|---|---|---|
| ☐ | `runner-angel.glb`, `runner-fallen.glb`, `runner-golden.glb`, `runner-saint.glb` | **Copies of your Pilgrim, recoloured** (Part 5). Same body. |
| ☐ | `angelwings`, `batwings`, `crystalwings`, `firewings` | Wings, made **alone** (no runner) |
| ☐ | `seraphwings`, `eternitywings` | Reward wings (golden 6-winged / cosmic violet) |
| ☐ | `pickups/lost-soul.glb` | Little glowing ghost asking for help |
| ☐ | `pickups/temptation-cursed-gold.glb` | Pile of red-gold coins with a red gem |
| ☐ | `pickups/miracle-shield.glb` | Glowing golden halo |

### Batch 3 — the other worlds (lots of small, simple pieces)
- Obstacles: 4 per world (jump-barrier, slide-beam, wall, gap) for **stairway, gardens, bridges, kingdom, cosmic** = 20 models.
- Scenery: about 20 roadside pieces (trees, columns, statues, fountains, planets…).
- The exact look of each one is in **`HYPER3D_PROMPTS.md`**, with a picture of today's version in `reference/`.

**Skip:** the floors (`track/`) and the plain coin. The current ones are fine.

---

## Part 2 — Set up once (10 minutes)

1. **Get the files.** On your computer, download the whole art pack:
   https://github.com/frmconnect/heaven-and-hell/raw/main/art/final-freedom-art-pack.zip
   Right-click it → **Extract All** (Windows) or double-click it (Mac). Inside: `models/` (today's 3D files) and `reference/` (pictures).
2. **Open Blender** → in the splash window click **General**.
3. **Laptop without a number pad?** **Edit → Preferences → Input** → tick **Emulate Numpad**. Close the window (it saves itself).
4. **Show the triangle count:** at the top right of the 3D view, click the small arrow next to the **two overlapping circles** (Overlays) → tick **Statistics**. The top-left corner now shows "Triangles".
5. **Learn the 8 controls you need:**

| Do this | How |
|---|---|
| Turn the view | Hold the **middle mouse button** (press the wheel) and drag |
| Zoom | **Scroll** the wheel |
| Slide the view | **Shift** + middle mouse drag |
| Front / side / top view | **Numpad 1 / 3 / 7** |
| Select / select all | **Left click** / **A** |
| Move · Rotate · Scale | **G · R · S**, then move the mouse, **left click** to finish (**right click** cancels). Add **X / Y / Z** to lock one direction. |
| Undo | **Ctrl+Z** (Mac: Cmd+Z) |
| Side panel with exact sizes | **N** |

(Blender uses **Z for up**. X = left/right, Y = forward/back. Export turns it into what the game needs automatically.)

---

## Part 3 — Characters with Hyper3D (runner, Devil, Shadow)

Characters are very hard to build by hand as a beginner. Let Hyper3D make the shape, then add movement with Mixamo.

1. Open Hyper3D (in Blender's side panel, or on its website).
2. Upload the reference picture, e.g. `reference/characters/runner-pilgrim.png`.
3. Paste the prompt from `HYPER3D_PROMPTS.md` **plus the style line** that goes on the end of every prompt:
   > stylized low-poly game asset, clean flat-shaded colours, simple readable shapes, mobile game, no text, no base or ground plane, single object, front view facing camera
4. **For people, ask for a T-pose** (arms straight out to the sides): add "standing in a T-pose" to the prompt. Mixamo needs this to add a skeleton.
5. Settings: the **lowest face count** option (about 2,000–5,000) and **GLB** export.
6. Generate. If you don't like it, generate again. Pick the one you like best.
7. **Movement (runner and Devil):**
   1. Go to **mixamo.com** (free; you need an Adobe account) → **Upload Character** → choose your file (GLB or FBX).
   2. Put the circles on the chin, wrists, elbows, knees and groin → **Next**. Mixamo builds the skeleton.
   3. Search and download each animation. **Format: FBX**, **Skin: With Skin**.
      - **Runner:** Running, Jump, Running Slide, Idle, Stumble (or "Stumble Backwards")
      - **Devil:** Running, Zombie Attack
   4. Can't manage this step? **Send me the still model.** The game can move it for now, and we'll do Mixamo later.
8. Save as `runner-pilgrim.glb` (see Part 6) and send it to me.

---

## Part 4 — Your first model by hand: the Hell jump barrier (30–45 min)

A great practice model. It's just a box with flames on top.

**The box**
1. New file (**General**). Click the cube that's already there. It's our starting box.
2. Press **N**. In **Item → Dimensions** type **X 1.9**, **Y 0.6**, **Z 0.8** (metres: wide, thin, knee-high).
3. **Put it on the ground:** set **Location Z** to **0.4** (half its height).
4. **Put the orange dot (origin) on the ground:** press **Shift+C** (puts the 3D cursor at the centre of the world), then **Object menu → Set Origin → Origin to 3D Cursor**.
5. **Dark stone colour:** on the right, click the **red sphere tab** (Material) → **New** → **Base Color** → a very dark brown-grey. **Roughness** about 0.9.
6. **Rougher edges (optional):** **Tab** (Edit mode) → right-click → **Bevel Edges**, move the mouse a little, click. **Tab** back.

**The flames**
1. **Add → Mesh → Cone**. In the little box that appears at the bottom-left, set **Vertices 6** (low-poly look).
2. **N panel → Dimensions:** X 0.3, Y 0.3, Z 0.5. Move it on top of the box: **Location Z 1.05**, **X -0.7**.
3. **Glowing material:** Material tab → **New** → **Base Color** orange → scroll to **Emission** → **Color** orange-yellow, **Strength 3**.
4. **Make a row:** with the flame selected press **Shift+D**, then **X**, type **0.35**, Enter. Repeat until there are 5 flames across the top. Make a couple a bit taller (**S**, **Z**, move the mouse).
5. **Join into one object:** press **A** (select all) → **Ctrl+J**.
6. **Check:** "Triangles" (top-left) should be under 1,500. You'll be about 100. 👍

Then **export it** (Part 6) as `jump-barrier.glb` and send it to me. You've made your first game model!

**The same tricks build most obstacles:**
- slide-beam = 2 tall thin boxes (posts) + 1 long box across the top (bottom edge at 1.25 m)
- gap = a flat box 2.0 × 3.2 with an orange glowing material (lava) and a dark rim
- wall = 1.9 wide × 3.4 tall × 1.8 deep. Rough it up in Edit mode by selecting some corners and moving them with **G**

---

## Part 5 — The other outfits (recolour your Pilgrim)

1. Open your finished `runner-pilgrim` → **File → Save As** → `runner-angel.blend`.
2. Click the runner → Material tab → change each colour (the colour codes are in `CHARACTER_KIT.md`. Type them into the **Hex** box of the colour picker).
3. Export as `runner-angel.glb`. Repeat for Fallen, Golden One and Saint's Robe.

Add small extras if you like (a gold belt, armour plates), but **keep the same body and size**.

---

## Part 6 — Export and send

1. Press **A** to select everything you made. Delete anything extra (camera, light, helper boxes): click it → **X** → **Delete**.
2. **File → Export → glTF 2.0 (.glb/.gltf)**.
3. On the right: **Format: glTF Binary (.glb)** · **Include → Limit to: Selected Objects** · **Transform: +Y Up** (already on) · **Data → Mesh: Apply Modifiers** · **Animation** on (characters).
4. Name it exactly like the file it replaces (e.g. `jump-barrier.glb`) → **Export glTF 2.0**.
5. **Send it to me:** attach it here in the chat, or upload it on github.com → **frmconnect/heaven-and-hell** → `art` → `incoming` → **Add file → Upload files** → **Commit changes**. Tell me the world name for obstacles (e.g. "hell").

I'll put it in the game, check the size and speed on a phone screen, and send you a link to see it running.

---

## Size cheat sheet (metres)
| Thing | Width × height × depth |
|---|---|
| Runner | 0.8 × 1.8 × 0.6 |
| Jump barrier | 1.9 × 0.8 × 0.6 |
| Slide beam | 1.9 wide, bottom edge at 1.25, top at 3.2, 0.6 deep |
| Wall | 1.9 × 3.4 × 1.8 |
| Gap | 2.0 wide × 3.2 long (flat) |
| Lane | 2.2 wide (whole track 7.4) |

Close is fine: I scale and fit every model when I add it. Limits: characters under 5,000 triangles, everything else under 1,500, max 2 materials each.

**If anyone else makes a model** (a friend, an artist, a website), make sure you're allowed to use it in a game you sell. Tell me where it came from and I'll record it in `ASSETS.md`.
