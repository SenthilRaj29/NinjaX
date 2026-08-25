# NinjaX Rooftop Chase

NinjaX Rooftop Chase is a browser-based endless parkour game. The player controls a ninja running across a procedurally generated city skyline while a shadow beast pursues them.

The game is built from scratch with standard browser technologies. It does not need a game engine, build system, external images, external sound files, or a server-side backend.

## Play the Game

Play the published game here:

https://senthilraj29.github.io/NinjaX/

## How to Play

The ninja runs automatically from left to right. The player controls movement actions:

| Action | Keyboard | Touch |
| --- | --- | --- |
| Jump | Space, Up Arrow, or W | Tap the upper half |
| Double jump | Press jump again while airborne | Tap the upper half again |
| Slide | Down Arrow or S | Tap the lower half |
| Pause or resume | P or Escape | Pause button |
| Restart | Pause menu or game-over menu | Restart button |
| Exit to title | Pause menu | Exit to Title button |

The goal is to travel as far as possible, collect coins, use multiplier globes, avoid obstacles, and stay ahead of the pursuer.

## Main Features

- Endless rooftop world generated while the player runs.
- Smooth delta-time movement that works across different screen refresh rates.
- Manual jumping, double jumping, and sliding.
- Equal alternating ratio of jump obstacles and slide obstacles.
- A pursuer that automatically jumps near obstacles and across gaps.
- Rooftops with varied heights, including taller buildings.
- Optional neon slides and holographic ladder-style connectors between buildings.
- Buildings without connectors that require a normal jump.
- Coins positioned along the player's jump path.
- Multiplier globes with a larger pickup radius and obstacle clearance.
- Procedural city skyline with parallax movement.
- Smooth color transitions between night and brighter day themes every 5,000 points.
- Curved crescent moon in the night theme.
- Procedurally synthesized music and sound effects using the Web Audio API.
- Pause, resume, restart, and exit controls.
- Automatic pause and music stop when the browser tab or application loses focus.
- Local high-score storage using `localStorage`.
- No external runtime dependencies.

## Technology Stack

### Frontend

- HTML5 for the page structure and user-interface layers.
- CSS3 for layout, responsive behavior, buttons, overlays, neon effects, and animations.
- Vanilla JavaScript for all game logic.
- HTML5 Canvas 2D for the game world and character rendering.
- Web Audio API for music and sound effects.
- Browser `localStorage` for the saved high score.

### Development and Documentation

- Python scripts generate PDF versions of the technical guides.
- Git and GitHub store and publish the project.
- GitHub Pages hosts the playable game.

## Project Structure

```text
NinjaX/
|-- index.html          Main game page and UI markup
|-- style.css           Layout, responsive styles, overlays, and visual effects
|-- game.js             Game loop, world, physics, rendering, input, and state machine
|-- audio.js            Procedural music and sound-effect engine
|-- README.md           This project guide
|-- documentation.html  Detailed engineering and architecture guide
|-- simple_guide.html   Beginner-friendly explanation and interview guide
|-- build_pdf.py        PDF writer for the engineering documentation
|-- generate_pdf.py     Browser-based PDF generation helper
|-- .gitignore          Ignores generated local cache files
```

## How the Game Is Organized

### 1. HTML entry point

`index.html` creates the game container and canvas. It also defines the visible interface:

- Score and high-score displays.
- Pursuer proximity meter.
- Multiplier status bar.
- Start screen.
- Countdown overlay.
- Pause menu.
- Failure and game-over screens.
- Touch controls for smaller screens.

The page loads `audio.js` first and `game.js` second, so the game logic can use the sound engine.

### 2. CSS presentation layer

`style.css` controls everything outside the canvas. It defines the neon color variables, typography, responsive layout, HUD panels, buttons, countdown animation, pause menu, game-over screen, and touch zones.

The canvas itself is kept at a stable virtual resolution of 1280 by 720. CSS scales it to fit the available screen while the JavaScript continues to use predictable game coordinates.

### 3. Audio engine

`audio.js` contains the `SoundEngine` class. It creates sounds with oscillators, filters, gain nodes, and generated noise instead of downloading audio files.

It handles:

- Jump and double-jump sounds.
- Slide and landing sounds.
- Coin and multiplier sounds.
- Obstacle, fall, caught, and countdown sounds.
- A repeating synthesized bassline and hi-hat rhythm.
- Mute and unmute behavior.
- Starting and stopping background music.

Music is stopped when the game pauses, fails, ends, exits to the title screen, or loses browser focus. It resumes when the game resumes.

### 4. Game loop

`game.js` uses `requestAnimationFrame` for the main loop. Each frame performs two separate jobs:

1. `update(dt)` changes the game state and positions.
2. `render()` draws the current state to the canvas.

`dt` is delta time: the number of seconds since the previous frame. It is clamped to prevent a large movement jump when a tab has been inactive.

This makes movement based on elapsed time rather than frame count.

## Core Game Components

### Game state machine

The game uses explicit states:

- `START`: title screen and idle background.
- `COUNTDOWN`: three-second start countdown.
- `PLAYING`: normal movement, scoring, collision, and rendering.
- `PAUSED`: gameplay and world updates are frozen.
- `FAIL_SEQUENCE`: short impact or slow-motion period.
- `GAMEOVER`: final score and restart option.

Using named states prevents unrelated screens and systems from running at the same time.

### `ParallaxBackground`

This class draws the sky, moon or sun, atmospheric bands, distant buildings, mid-distance buildings, windows, antennas, and water tanks.

Each skyline layer moves at a different fraction of the world speed. This creates the depth effect known as parallax scrolling.

The background has a target theme level based on score:

```text
theme level = floor(score / 5000)
```

The renderer gradually moves toward that target and blends the palette colors, moon, and sun opacity. The result is a continuous day-night transition instead of a sudden color swap.

### `NinjaXManager`

This class owns the generated world:

- Rooftop platforms.
- Coins.
- Multiplier globes.
- Jump obstacles.
- Slide obstacles.
- Slides and ladder connectors.

Platforms are created ahead of the player. Objects that move far behind the camera are removed and new platforms are generated ahead. This recycling keeps memory usage stable during an endless run.

Platform heights vary, so the skyline contains both ordinary roofs and taller buildings. Some height changes receive a connector; others deliberately remain open and require jumping.

### Building connectors

Connectors are stored separately from buildings so their endpoints can match the exact roof coordinates:

- A downhill transition uses a neon slide rail.
- An uphill transition uses a holographic energy bridge with glowing footholds.
- A building can have no connector at all.

The player collision system checks connector slopes as temporary walkable ground. This allows smooth movement between roofs instead of treating the connector as decoration only.

### `NinjaPlayer`

This class manages the ninja's physical state and animation:

- Position and vertical velocity.
- Gravity and jump impulse.
- Variable jump height while the jump button is held.
- Ground detection.
- Coyote time after leaving a ledge.
- Jump buffering before landing.
- Double-jump availability.
- Slide height and slide duration.
- Landing squash animation.
- Scarf and running animation.

The player is never moved by the obstacle auto-jump system. Jumping remains a player action.

### `RivalPursuer`

The pursuer stays behind the ninja and follows the world. It uses gravity and platform collision checks like the player, then automatically jumps when an obstacle or gap is close enough.

This keeps the pursuer active without taking control away from the player.

### Obstacles

Obstacle generation alternates between two types:

- `JUMP`: rooftop equipment such as AC units.
- `SLIDE`: low neon beams that require the ninja to slide underneath.

The alternation keeps the generated obstacle count balanced. Each obstacle stores its position, size, type, visual subtype, and cleared status.

Obstacle collision uses axis-aligned bounding boxes. Only an obstacle's actual rectangle participates in collision checks, and slide obstacles are visibly rendered so there are no hidden hitboxes.

### Coins and multiplier globes

Coins on a gap are calculated from the same jump equation used by the ninja. Their positions are based on jump time, gravity, and initial jump velocity, so the coin trail follows the expected flight path.

Coins are not placed on slide or ladder connectors. Multiplier globes are spawned only after checking nearby obstacles with an extra clearance margin. Their visual radius and pickup radius are separate, allowing an early pickup without making the globe look oversized.

## Input and Browser Focus

Keyboard and touch input both call the same player actions. This keeps desktop and mobile behavior consistent.

The page listens for `visibilitychange`, `blur`, and `focus` events:

1. When the tab or application loses focus, a playing game enters `PAUSED` and music stops.
2. When focus returns, the game resumes if it was paused automatically.
3. A pause chosen by the user remains paused until the user resumes it.

## Scoring

Distance contributes continuously to the score. Coins add points, and an active multiplier doubles distance and coin points for a limited duration.

The high score is stored in the browser under:

```text
NinjaX_chase_highscore
```

Because this uses local storage, the high score is local to the browser and device.

## Running Locally

The project is a static website. The simplest options are:

1. Open `index.html` directly in a browser.
2. Use the VS Code Live Server or Five Server extension.
3. Serve the folder with any static HTTP server.

No package installation is required for the game.

## Publishing with GitHub Pages

The repository is hosted at:

https://github.com/SenthilRaj29/NinjaX

To publish changes:

```bash
git add -A
git commit -m "Describe the change"
git push origin main
```

GitHub Pages serves the root `index.html` file at:

https://senthilraj29.github.io/NinjaX/

## Design Principles

- Keep the game dependency-free and easy to run.
- Separate update logic from rendering logic.
- Use stable virtual coordinates for predictable physics.
- Recycle endless-world objects instead of accumulating them.
- Make every visible hazard match its collision area.
- Keep input responsive with coyote time and jump buffering.
- Use generated visuals and audio so the game works without downloaded assets.
- Keep state transitions explicit so pause, failure, restart, and focus behavior remain reliable.

## Documentation Files

For a deeper technical walkthrough, open `documentation.html` in a browser. For a shorter explanation suitable for beginners or interviews, open `simple_guide.html`.
Rooftop Chase is a fast-paced endless parkour runner where a ninja races across rooftops while escaping a relentless wolf-like rival. Built with HTML5 Canvas and Vanilla JavaScript, the game features smooth jumping, sliding, double jumps, obstacles, coins, parallax visuals, synthesized audio, and local high scores.
