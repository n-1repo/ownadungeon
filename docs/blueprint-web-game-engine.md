# Own a Dungeon — Full Web-Game Engine Blueprint

Research basis: deep-research pass on "Doraemon: Comic Traveler" (G123/CTW H5 game) plus
verified architecture patterns from PixiJS, Phaser, LayaAir, RPG-JS, and miu2d. Full raw
findings: see workflow run `wf_5cf0c167-625`.

## 0. Research honesty note

Comic Traveler's actual client engine could **not** be confirmed. Cocos Creator, LayaAir,
Phaser, PixiJS, and a custom-engine hypothesis were all either unconfirmed or explicitly
refuted by adversarial verification. A live browser inspection of the game (network
requests, `window` globals, canvas/WebGL context) was attempted from this environment to
close that gap, but blocked by a proxy/tunnel relay issue specific to headless-Chromium
traffic (plain `curl` to the same URL succeeded 3/3; Chromium's tunneled connections to
this and unrelated hosts all reset after ~6s) — a network limitation of this sandbox, not
a policy block, and not something to route around.

**Confirmed about Comic Traveler:**
- Pure HTML5 browser game via CTW Inc.'s G123.jp platform, no native app/download/plugin.
- Combat is round-based auto-battle: player configures team/skills/gear, battle resolves
  with reduced manual input (matches "idle RPG" framing).

**Everything below about *how* to build a browser game that feels like an engine** is
drawn from confirmed patterns in real production 2D web engines (labeled per system),
used as proven reference architecture — not as a description of Comic Traveler's actual
internals.

## 1. Where Own a Dungeon is today (baseline)

100% DOM+CSS rendering, no canvas/WebGL. Sprite "animation" = `backgroundPositionX`
stepped via `setInterval` on a fixed-size `<div>` (`src/animation/heroToken.ts`,
`monsterToken.ts`). Positions are CSS `%` `left`/`top`. No camera/viewport, no tile system
(5 fixed dungeon-slot DOM nodes), no scene graph. Combat is pure TS math, beat-paced via
`await` (`src/animation/beatTiming.ts`). Next.js static export, no backend (see
`docs/` Supabase blueprint from the prior session for persistence design).

Moving to "feels like a game engine in the browser" is a genuine **rendering-layer
rewrite** (DOM → Canvas/WebGL), not an incremental tweak. Combat/economy/data logic
(`src/combat/*`, `src/data/*`, `src/economy/*`) is already framework-agnostic (no React
import) — this boundary should survive the rewrite untouched.

## 2. Target Architecture Diagram

```
Next.js App Shell (routing, HUD/menus — React DOM, unchanged)
        │
        ▼
Game Engine Layer (framework-agnostic TS, zero React import — miu2d-confirmed pattern)
  ├─ Scene graph (PixiJS-pattern container tree: world → layers → entities)   [CONFIRMED pattern]
  ├─ Camera (viewport + culling)                                              [CONFIRMED, Phaser]
  ├─ Tile/plane layers (z-ordered Containers)                                 [CONFIRMED, PixiJS]
  ├─ Entities (hero, monster, projectiles)
  ├─ Animation (sprite-clip stepper)
  ├─ Game loop (single rAF loop)
  └─ Input/interaction
        │
        ▼
Renderer: PixiJS on WebGL (Canvas2D fallback), one <canvas>, React never re-renders inside it
        │
        ▼
Bridge (engine state ⇄ React state via event bus, not per-frame props)
        │
        ▼
Supabase Client → RPC (validated mutations) → Postgres   [see prior-session blueprint]
        │  (only if/when multiplayer is added)
        ▼
Supabase Realtime (Broadcast/Presence, GA'd distributed Elixir cluster)      [CONFIRMED viable, not required for MVP]
```

## 3. System-by-system

Format per system: what you'd see → likely implementation → status → Own a Dungeon build.

**Rendering** — Smooth layered sprites, no DOM jank. Likely impl: retained-mode scene
graph over WebGL. *CONFIRMED pattern* (PixiJS Container tree). Comic Traveler's actual
tech: UNKNOWN. Build: replace `.hero-token`/`.monster-token`/`.room-corridor` DOM nodes
with one `<canvas>` + `PIXI.Application`; each becomes a `Sprite`/`AnimatedSprite`.

**World/Scene** — A "room" you walk into, background scrolls, throne room has a special
background. Likely impl: one Container per room, scrolled/swapped as the raid advances —
this is what `worldScroll.ts`'s `backgroundPositionX` hack was faking in DOM. Build:
`RoomScene` owning `roomLayer: Container`; replace `resetWorldScroll`/`advanceWorldScroll`
with `roomLayer.x -= delta`.

**Camera** — Screen never shows more than the current room. *CONFIRMED strongest
evidence* (Phaser docs): a Camera = viewport rect + scroll offset, renderer culls
anything outside it. Build: `Camera { x, y, w, h }` + `worldToScreen`/`screenToWorld`
helpers; apply as `stage.position.set(-camera.x, -camera.y)`.

**Plane/Layer** — Background behind characters behind UI. *CONFIRMED*: PixiJS renders
children in insertion order = draw order. Build: 4 fixed Containers (`bgLayer`,
`entityLayer`, `fxLayer`, `uiLayer`) added to `app.stage` in that order; every sprite
goes into its layer, never directly onto `stage`.

**Tiles** — Rooms look grid-aligned (evenly spaced pillars/torches), but not necessarily
a literal tilemap. *CONFIRMED reference* (Phaser TilemapLayer): camera-rect culling,
only visible tiles drawn, orientation-specific bounds checks. Build: **defer (YAGNI)** —
the current one-room-at-a-time raid design doesn't need a tilemap. Revisit only if a
free-roam dungeon-crawl mode is added; then use a flat 2D array + camera-rect culling.

**Entities** — Hero/monster/king/projectiles move independently. No evidence of a heavy
ECS (a Cocos-Creator-ECS hypothesis was explicitly REFUTED as relevant here). Build:
plain `Entity { sprite, x, y, anim, hp }` per hero/monster — not a full ECS framework.

**Movement** — Hero walks room-to-room, monster steps toward hero. Likely impl:
per-frame tween (already what CSS `transition` timing fakes today). Build: replace CSS
transitions with an explicit `lerp(start, end, t)` driven by the shared game loop.

**Combat** — *CONFIRMED for Comic Traveler*: round-based auto-battle, player setup drives
outcome. Own a Dungeon's `resolveMonsterEncounter`/etc. already match this. Build: keep
combat math in the framework-agnostic engine-core layer (miu2d-confirmed pattern); only
animation *triggers* touch the renderer.

**Animation** — Idle/walk/attack/hurt/death sprite cycles. Sprite-sheet stepping (what
`heroToken.ts`'s `startClip` already does) vs. skeletal/bone animation (LayaAir pattern,
general 2D-engine feature, not confirmed for Comic Traveler). Build: keep sprite-sheet
stepping (cheap, matches existing assets), but move the stepper into the single game
loop's `update(dt)` instead of one `setInterval` per token — the single highest-value
change for feeling like an engine instead of DOM tricks.

**Interaction / UI/UX** — Tap to place trap/monster, tap Raid. This is legitimately fine
as React/DOM — do **not** port menus/HUD into canvas; only the battlefield needs canvas.
Mirrors the RPG-JS-confirmed "engine layer vs. game layer" split.

**State management** — Keep `GameState` (gold/souls/progression) in React/Supabase land
as-is. The engine only needs ephemeral per-raid state (hp, current room, anim state)
living inside the engine instance, pushed out to React only at raid-end — exactly the
existing `applyRaidOutcome` boundary; don't change it.

**Networking/Backend/Database/Persistence** — Already designed (prior-session Supabase
blueprint: `players`/`dungeon_rooms`/`player_catalog_progress`, RPC-gated writes,
Anonymous Auth, no Realtime for MVP). Confirmed still valid: Realtime Broadcast/Presence
on a GA'd distributed Elixir cluster, if multiplayer is ever added.

**Performance** — *CONFIRMED* lesson from Phaser's camera culling: never draw/update
what's off-camera. Apply even in a single-room game — pause `update()` for entities not
currently visible/active (e.g. an off-screen monster mid-transition).

## 4. Folder structure

```
src/
  engine/                    NEW — framework-agnostic, no 'react' import
    core/
      GameLoop.ts            rAF loop, fixed-timestep update(dt)
      Camera.ts
      SceneGraph.ts          thin wrapper — use PixiJS Container tree directly
    entities/
      Entity.ts
      HeroEntity.ts
      MonsterEntity.ts
    animation/
      SpriteClip.ts          generalized port of heroToken.ts's startClip
    world/
      RoomScene.ts
      WorldScroll.ts
  combat/                    UNCHANGED — already framework-agnostic
  data/                      UNCHANGED
  economy/                   UNCHANGED
  state/                     UNCHANGED (React/localStorage/Supabase side)
  ui/                        UNCHANGED (React DOM HUD/panels)
  bridge/
    EngineReactBridge.ts     NEW — the only file importing both engine/ and React state
app/
  GameCanvas.tsx             NEW — mounts PixiJS Application, owns the engine instance
  GameApp.tsx                UNCHANGED — renders <GameCanvas/> where room-stage div is today
```

## 5. Database schema

Unchanged from the prior-session Supabase blueprint (`players` / `dungeon_rooms` /
`player_catalog_progress`). Rendering is a pure client-presentation concern — nothing
here changes the DB design.

## 6. Game loop

```ts
function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  world.update(dt);   // move entities, advance animation clips, camera follow
  renderer.render(app.stage);
  requestAnimationFrame(tick);
}
```
Replaces N independent `setInterval` calls (one per sprite today) with one driver.

## 7. Rendering pipeline

`GameCanvas.tsx` mounts once → creates `PIXI.Application` bound to a canvas → creates the
4 layer Containers → `engine.start(app.stage)` → engine owns the rAF loop from then on.
React never touches these Containers again except via the bridge event bus (hp/score
changes flow **out** to HUD, never frame-by-frame back in).

## 8. Camera/tile system

Camera = `{x, y, w, h}` + `worldToScreen`/`screenToWorld`, applied as a single
`stage.position` transform. Tiles: deferred (YAGNI) — current room-based design needs
positioned props per room (porting existing DOM props to Sprites), not a tilemap.

## 9. Animation system

Reuse `HERO_SPRITE_MANIFEST`/`MONSTER_SPRITE_MANIFEST` (frameCount/fps/loop) unchanged —
only the stepper moves from CSS `backgroundPositionX` + `setInterval` to
`PIXI.AnimatedSprite` (or a manual frame-index driven by the shared game loop).

## 10. Backend/API

Unchanged — see prior-session Supabase blueprint (Anonymous Auth, RPC-gated writes, no
Realtime for MVP).

## 11. Implementation roadmap

```
0. Freeze src/combat/*, src/data/*, src/economy/* — already engine-agnostic, don't touch
1. Add PixiJS; GameCanvas.tsx mounts an empty canvas ALONGSIDE (not replacing) current DOM stage
2. Build GameLoop + Camera + 4-layer scene graph (empty, unconnected)
3. Port hero token first: HeroEntity + AnimatedSprite, verify idle/walk/attack/hurt/death
   still animate (reuse existing manifests); compare side-by-side with the DOM version
4. Port monster token the same way
5. Port room/background (worldScroll → Camera + Container.x)
6. Port dungeon-slot props/torches as static Sprites
7. Remove old DOM/CSS renderer once canvas version is verified equivalent (Playwright
   screenshot diff — the technique already used throughout this project's sessions)
8. Layer in the Supabase backend as an independent track — doesn't block or get blocked
   by the rendering migration
```

Step 0 matters most: the combat/economy/data layers already hardened this project should
not be touched by a rendering migration — only the presentation layer changes.

## Open questions (unresolved by this research)

- What rendering engine Comic Traveler's client actually runs on (never confirmed).
- Whether it has any server-authoritative/persistent multiplayer state, or is
  effectively single-player with cloud-save sync only.
- What animation/asset pipeline/sprite format it uses (Spine, DragonBones, custom sheets).
- No attempt in the surviving evidence describes real sourcemap/bundle extraction against
  this title's actual shipped JS — only that the tooling for it exists and is unreliable
  in general.
