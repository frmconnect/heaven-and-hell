# Heaven & Hell — 3D models and Blender guide

Every 3D model in the game, exported as **.glb** files (the standard 3D format; Blender opens it directly).
Use them to look at, improve or replace the game's art — or send them to an artist as the starting point.

> Blender runs on a computer (Windows, Mac or Linux), not on a phone. It's free: **blender.org**.

## 1. Open a model in Blender

1. Install Blender from **blender.org** and open it.
2. Delete the starting cube: click it, press **X**, then **Delete**.
3. **File → Import → glTF 2.0 (.glb/.gltf)** and pick a file from this folder.
4. Press **Numpad .** (or View → Frame Selected) to zoom to it.

## 2. What's in the pack (70 files)

| Folder | What it is |
| --- | --- |
| `characters/` | The runner in each outfit (Pilgrim, Angel, Fallen, Golden One), the Devil, the Shadow of your sins |
| `wings/` | The runner wearing each set of wings (angel, bat, crystal, fire) |
| `obstacles/<world>/` | For each world: `jump-barrier`, `slide-beam`, `wall`, `gap` |
| `scenery/<world>/` | Roadside decoration (rock spires, braziers, angel statues, trees, fountains, floating islands, golden towers, temples, planets…) |
| `track/` | One 10-metre piece of floor for each world (the Stairway one has its 10 steps) |
| `world/` | Heaven's Gate |
| `pickups/` | Coin, lost soul, temptation (cursed gold), Miracle Shield |

Worlds: `hell`, `stairway`, `gate`, `gardens` (Heavenly Gardens), `bridges` (Celestial Bridges), `kingdom` (Golden Kingdom), `god` (Light of God), `cosmic` (Cosmic Heavens).

## 3. Rules for new or improved models

So a new model drops straight into the game and plays exactly the same:

**Size — 1 Blender unit = 1 metre.** Keep these sizes (they are the game's collision boxes):

| Thing | Width × height × depth (metres) |
| --- | --- |
| Runner | about 0.8 × 1.8 × 0.6 (sliding: 0.8 tall) |
| One lane | 2.2 wide (3 lanes; whole track 7.4 wide) |
| Jump barrier | 1.9 × 0.8 × 0.6 |
| Slide beam | 1.9 wide, bottom edge at 1.25 high, top at 3.2, 0.6 deep |
| Wall | 1.9 × 3.4 × 1.8 |
| Gap | 2.0 wide × 3.2 long (bridge gaps can be longer — the game stretches them) |
| Track floor piece | 7.4 wide × 10 long |
| Coin | 0.76 across |

**Placement:** the model's origin (its orange dot) sits on the ground at its centre (between the runner's feet). Keep it facing the same way as the file in this pack — the runner faces away from the camera, into the screen.

**Keep it light for phones:**
- Runner and characters: under 5,000 triangles each (today's are about 250–320)
- Obstacles and scenery: under 1,500 triangles each
- At most 2 materials per model; textures 1024 × 1024 px or smaller
- Low-poly, flat-shaded and colourful matches the current style

**Animations (characters only),** named exactly like this so the game can find them:
- Runner: `idle`, `run`, `jump`, `slide`, `stumble`, `fly`
- Devil: `run`, `lunge`
- Shadow: `float`, `lunge`
(Today the game animates its own simple models in code; real animations replace that.)

## 4. Save it for the game

1. Select the model (click it; **A** selects everything).
2. **File → Export → glTF 2.0 (.glb/.gltf)**.
3. Settings: **Format: glTF Binary (.glb)** · Include: **Selected Objects** · Transform: **+Y Up** (on, the default) · Data: **Apply Modifiers** · Animation: on.
4. Name it the same as the file it replaces (e.g. `devil.glb`).

## 5. Get it into the game

Send the .glb file to Claude (attach it in the chat, or upload it to the GitHub project in the `art/incoming/` folder: on github.com open the project → `art` → **Add file → Upload files**). Claude fits it in, checks size and speed on a phone-sized screen, and records it in `ASSETS.md` (who made it, and the licence).

If an artist makes it: make sure your agreement says **you own it / may use it commercially** in the game and store listings.

---
*These files were exported from the game itself with `node scripts/export-models.cjs` — run it again after art changes to refresh the pack.*
