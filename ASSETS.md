# Assets and licences

Every picture, model, sound and song in the game, who made it, and the licence. (CLAUDE.md: record every third-party asset.)

| Asset | Made by | Licence / ownership | Notes |
| --- | --- | --- | --- |
| Animated human character, used for the runner (all outfits) and the Devil (`public/models/human.glb`) | **Quaternius** — "Animated Man" pack (quaternius.com/packs/animatedman.html) | **CC0 1.0** (public domain: free for commercial use, no credit required) | Converted from FBX with `tools/convert-character.mjs` (kept run, jump, punch→lunge; finger tracks removed). Colours repainted in code per outfit. Downloaded by the owner 2026-11-23. Credit given anyway in the game's Credits. |
| All other 3D models, textures and effects (Shadow, worlds, obstacles, pickups, Heaven's Gate; the Devil's horns and wings) | worlds, obstacles, pickups, Heaven's Gate) | Built in code for this game (Claude, for the owner) | Owned by the game's owner | Exported to `art/models/` as .glb for Blender / artists |
| Fonts | System fonts of the player's device | — | No font files are shipped |
| Music | Cody Webb (original songs) | Owned by Cody Webb | Coming in Phase 7 (Decisions log #33) |
| Sound effects and world ambience (37 effects: coins, jumps, Devil roar, souls, Heaven's Gate, judgment…) | Synthesized in code for this game (`src/audio/`, Claude for the owner) | Owned by the game's owner; no third-party audio | Listen: `art/sounds/*.wav` (made by `node scripts/render-sounds.cjs`) |

When an artist's or a free (CC0) model is added: one row each — what it is, who made it, licence (e.g. CC0, or "commissioned, ownership transferred to owner"), and a link or the agreement's date.
