# 01 — Game design

## One-line pitch

You have seven colours of rainbow paint. Each colour is a different kind of physics.
Paint a path, press Play, and watch a very stupid unicorn walk it. Get it to the gem.

## Core loop

1. **Draw phase.** Level geometry is visible. The palette shows the colours unlocked
   for this level, each with an ink bar. The player draws freehand strokes with
   finger/mouse. Ink drains by stroke length. Undo removes the last stroke, Clear
   removes all. Paint can be drawn anywhere except inside solid geometry (strokes are
   clipped: segments whose midpoint lies inside a solid rect are discarded).
2. **Play phase.** Player presses Play. Drawing is disabled. Physics starts. The
   unicorn walks from the start marker in its start direction. The run ends when:
   - the unicorn's circle overlaps the gem → **WIN**
   - the unicorn touches spikes/water → **FAIL** (poof particle, sad ZzFX)
   - the unicorn leaves the world by more than 3 units on any side → **FAIL**
   - 25 seconds elapse → **FAIL** ("The unicorn got bored")
   - the player presses Rewind → back to Draw with paint intact
3. **FAIL** returns automatically to Draw after 0.8 s, paint intact.
4. **WIN** shows the win overlay: ink used vs budget, star if ≤ 60% of total budget
   used, "Next" button. Progress saved to `localStorage.prism26_progress`.
5. **Paint landing.** Unsupported strokes drop as soon as Play starts (see docs/02).

## The unicorn (see docs/04 for exact physics)

- A circle of radius 0.5 world units. Drawn as an outlined cartoon unicorn: body,
  arched neck, head with muzzle and ear, striped golden horn, rainbow-gradient mane
  and tail, four legs in a trot cycle (splayed in the air), eye with highlight and a
  blush. Facing flips with direction; a wing appears while gliding; 55 % alpha while
  phasing.
- It walks forward at 4 u/s. It turns around when it hits a wall. It falls off edges.
  That's the whole AI. Comedy comes from watching it commit to bad decisions.
- The start marker shows the facing direction (arrow) so the player can plan.

## Level geometry (things the player cannot change)

- **Solid** rects — floors, walls, ledges. Pastel cloud-block look.
- **Spikes** — kill on contact. Drawn as small grey triangles on the rect top.
- **Water** — kill on contact. Blue wavy rect.
- **Gate** — a solid rect that vanishes once the unicorn has touched *all seven
  colours* of paint during the current run. Used in levels 19–20. Drawn as a grey
  striped block with seven small dots that light up as colours are touched.
- **Gem** — the goal. A diamond with a slow pulse.
- **Start** — small pad with an arrow.

## The seven colours (details in docs/02)

| Colour | Name | Rule in one line |
|---|---|---|
| Red | Bounce | Landing on it launches the unicorn along the surface normal |
| Orange | Dash | Walk speed ×2.3 while on it; momentum carries after leaving |
| Yellow | Brittle | Lots of ink, but each stroke crumbles 0.6 s after first touch |
| Green | Vine | Unicorn sticks to it and walks along it in any orientation |
| Blue | Feather | Never brakes; after touching it the unicorn falls slowly (glides) |
| Indigo | Phase | Can be painted through blocks; the unicorn walks through them on it |
| Violet | Flip | Touching it flips gravity for the unicorn |

**Paint has weight.** When Play starts, any stroke that does not touch the world (or
a supported stroke) falls until it lands. Yellow crumbling drops whatever rested on
it. Unsupported strokes are drawn faded in the draw phase.

Unlock order across the 30 levels: Orange+Red (1), Yellow (7), Green (11), Blue (15),
Indigo (19), Violet (23), Gate mechanic (27).

## Screens

1. **Title** — "PRISM", a unicorn idling on a rainbow arc, tap to start, small
   "Online" and "Daily" buttons. Sound toggle icon.
2. **Level select** — 30 rainbow-coloured dots in a grid. Locked dots grey. Completed
   dots coloured, starred ones with a small star. A Daily button below the grid.
3. **Game** — canvas + HUD. HUD top: level name, hint text (short, disappears after
   first Play). HUD bottom (draw phase): palette buttons with ink bars, Undo, Clear,
   Play. HUD bottom (play phase): Rewind. HUD top-left: back button.
4. **Win overlay** — over the canvas.
5. **Online lobby** — "Create room" (shows a 4-letter code) / "Join room" (input) /
   status line. See docs/06.

Keep UI text tiny; the ink bars and colour swatches do the talking.

## Feel

- Strokes render as thick rounded lines (width 0.5 u) with a lighter core line for
  a crayon-ish look. Yellow strokes crack visually when crumbling.
- The whole palette is pastel-rainbow, sky gradient background, cloud-block solids.
- When the unicorn touches a colour, emit 4–6 small particles of that colour.
- Win: a burst of rainbow particles from the gem.
- Everything is procedural. No images, no font files. System font only
  (`font-family: system-ui, sans-serif`).

## Accessibility / input

- Pointer Events API only (covers mouse, touch, pen). `touch-action: none` on the
  canvas. `user-select: none`. Viewport meta with `user-scalable=no`.
- Keyboard: 1–7 select colour, Z undo, C clear, Space play/rewind, Esc back.
- Colour blindness: each palette button shows the colour's icon glyph (↑ ⇒ ✶ ⋮ ❋ ⇢ ⟳)
  in addition to the colour, and the level hint names colours by name.

## Music

The rainbow is a C-major scale: colour index = scale degree (red C … violet B).
Selecting a colour or finishing a stroke plays its note (octave +1); when the unicorn
touches a stroke, that colour's note plays (octave 0), so a run plays the painting
back. A scheduler (`audio.js`) plays a I–V–vi–IV backing at 120 BPM on oscillators:
bass on the bar, a chord-tone arpeggio on each beat, plus off-beat eighths while the
unicorn is running. Winning plays a run up the scale. Mute silences all of it.

## Hint system

Each level has a ≤ 40-char hint string. The hint for a colour's intro level explains
the colour once. Later levels' hints are optional and short. Hints show in draw phase
until the first Play, then hide.
