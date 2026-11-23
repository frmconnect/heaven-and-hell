# Final Freedom — Character design kit

Everything you need to design the game's characters in Blender.
Open the pictures in `reference/` to see how each one looks in the game today.

---

## 0. Starting Blender (first time)

1. When Blender opens, a splash window asks for a **New File** type. Click **General**.
   (The other choices are for 2D drawing, sculpting, video editing and so on. "General" is normal 3D modelling.)
2. You'll see a grey cube, a camera and a light. Click the cube, press **X**, then **Delete**. You don't need the camera or the light either.
3. Save straight away: **File → Save As** → e.g. `runner-pilgrim.blend`. The `.blend` file is your work file; the game needs a `.glb` file, exported at the end (section 6).
4. Useful controls:
   - **Middle mouse drag**: turn the view · **Scroll**: zoom · **Shift + middle drag**: move the view
   - **Numpad 1 / 3 / 7**: front / side / top view · **Numpad .**: zoom to what's selected
   - **Tab**: switch between Object mode (move whole things) and Edit mode (change the shape)
   - **G** move · **R** rotate · **S** scale · **Ctrl+Z** undo
   - No numpad (laptop)? **Edit → Preferences → Input → Emulate Numpad**.
5. Units: Blender's default (1 unit = 1 metre) is exactly what the game uses. Don't change it.

To see a character as it is in the game today: **File → Import → glTF 2.0** and pick its file from `models/characters/`.

---

## 1. The characters

| File | Who | Look | Colours (in the game today) |
| --- | --- | --- | --- |
| `runner-pilgrim.glb` | **The runner** (the player) | Young human pilgrim, simple tunic with a belt, trousers, short hair. Athletic. **Make this one first.** | tunic `#efe6d2` cream · belt/trousers `#4a3226` brown · hair `#3a2216` |
| `runner-angel.glb` | Runner — Angel outfit (shop, 800 coins) | White flowing robes, gold trim and belt, light golden hair | `#ffffff` · gold `#e8c25a` · hair `#f4d27a` |
| `runner-fallen.glb` | Runner — Fallen outfit (1,500) | Black robes, dark red accents, ember glow on the trim | `#1e1418` · red `#7a0e0a` · `#120a0a` |
| `runner-golden.glb` | Runner — Golden One (4,000) | Polished gold armour with a warm glow | `#ffcc40` · `#b07a10` · `#fff0b0` |
| `runner-saint.glb` | Runner — Saint's Robe (reward, Mission Level 15) | Pale silver-blue robe, gold trim, soft holy glow | `#e8f0ff` · gold `#c8a040` · `#f4e2b0` |
| `devil.glb` | **The Devil** — chases you through Hell and up the Stairway | Huge, red, horned, muscular, bat-like wings, glowing yellow eyes, long clawed arms reaching forward. Scary but cartoon-friendly (the game is for everyone). | red, dark wings, yellow eyes |
| `shadow-of-sins.glb` | **The Shadow of your sins** — chases you in Heaven; bigger the more you sinned | Dark hooded ghost, purple-black robe, empty face with two violet eyes, smoky wisps instead of legs, clawed hands reaching forward | purple-black, violet eyes |

**Important:** all the runner outfits must be **the same body and shape**, only with different colours/details. Make the Pilgrim, then copy it (**File → Save As** under the new name) and recolour it.
You decide the runner's face, hair, age and look — the descriptions above are just today's version.

### Wings (worn on the runner's back)
Make the wings **on their own**, without the runner, attached at the shoulder blades.

| File | Look | Colour |
| --- | --- | --- |
| `angelwings` | Soft white feathers | `#ffffff` |
| `batwings` | Leathery, dark red-black | `#2a0a10` |
| `crystalwings` | Glowing blue crystal | `#9fd8ff`, glow `#3a8aff` |
| `firewings` | Blazing flame | `#ff8a1a`, glow `#ff4a00` |
| `seraphwings` | Six-winged seraph, warm golden-white (reward) | `#fff6d8`, glow `#ffcf5a` |
| `eternitywings` | Cosmic violet, starry (reward) | `#c8a8ff`, glow `#7a3aff` |

---

## 2. Sizes (must match — they are the game's hit boxes)

| | Width × height × depth |
| --- | --- |
| Runner | about **0.8 × 1.8 × 0.6 m** (when sliding it's 0.8 m tall) |
| Wings | about 2.5 m wide when spread is fine; keep them behind the body |
| Devil | about **2.5 m tall**, can be wide — it never touches anything |
| Shadow | about **2–3 m tall** (the game scales it up as your sins grow) |

Tip: add a reference box — **Add → Mesh → Cube**, then in the **N** panel set Dimensions to 0.8 × 0.6 × 1.8 — and build the runner inside it. Delete the box before exporting.

## 3. Position and facing

- The **orange dot** (the "origin") goes **on the ground, between the feet**.
- The runner faces **away from the camera** — the same way as the file in `models/characters/`. Import it once and copy its direction.

## 4. Keep it light for phones

- **Under 5,000 triangles** per character (today's are about 300). Low-poly, flat-shaded and colourful matches the game.
  To see the count: top right of the viewport, **Overlays (the two circles) → Statistics**.
- **At most 2 materials** per character. Images (textures) 1024 × 1024 or smaller.
- Glowing parts: in the material set **Emission** to the glow colour.

## 5. Animations

Name them **exactly** like this (in Blender's Action editor) so the game can find them:

| Character | Animations |
| --- | --- |
| Runner | `idle`, `run`, `jump`, `slide`, `stumble`, `fly` |
| Devil | `run`, `lunge` |
| Shadow | `float`, `lunge` |

Easiest way: **Mixamo** (free, mixamo.com). Upload the model and it adds a skeleton for you; then pick Running, Jump, Running Slide, Idle, Stumble (runner) or Running + Zombie Attack (Devil). Download as FBX "with skin", import into Blender, rename the animations as above.
No time for animations? Send the still model — the game can move simple models in code for now.

## 6. Export for the game

1. Select everything (**A**).
2. **File → Export → glTF 2.0 (.glb/.gltf)**.
3. **Format: glTF Binary (.glb)** · Include: **Selected Objects** · Transform: **+Y Up** · Data: **Apply Modifiers** · Animation: on.
4. Name it like the file it replaces, e.g. `runner-pilgrim.glb`.

## 7. Send it to Claude

Attach the `.glb` in the chat, or upload it on github.com → the project → `art/incoming/` → **Add file → Upload files**.
Claude fits it in, checks it on a phone-sized screen and sends you a link to try it.

**Order (most seen first):** runner-pilgrim → Devil → Shadow → wings → the other outfits.

If a friend or artist makes a model, get it in writing that you may use it in the game and the store listings.
Using Hyper3D inside Blender instead? Ready-made prompts are in `HYPER3D_PROMPTS.md`.
