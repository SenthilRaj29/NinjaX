/**
 * NinjaX Chase - Core Game Engine
 * HTML5 Canvas 2D Endless Runner with procedural generation,
 * Vector-style parkour kinematics, multi-layered parallax cityscape,
 * and dynamic pursuer mechanics.
 */

// --- Canvas & Rendering Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 720;

// High-DPI handling
function setupCanvasResolution() {
  canvas.width = VIRTUAL_WIDTH;
  canvas.height = VIRTUAL_HEIGHT;
}
setupCanvasResolution();

// --- DOM Elements ---
const hudElement = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');
const pauseScreen = document.getElementById('pause-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const failToast = document.getElementById('fail-toast');
const failReasonTitle = document.getElementById('fail-reason-title');
const failReasonDesc = document.getElementById('fail-reason-desc');
const failBadge = document.getElementById('fail-badge');

const scoreDisplay = document.getElementById('score-display');
const highscoreDisplay = document.getElementById('highscore-display');
const finalScoreDisplay = document.getElementById('final-score');
const finalDistanceDisplay = document.getElementById('final-distance');
const finalCoinsDisplay = document.getElementById('final-coins');
const newHighscoreBanner = document.getElementById('new-highscore-banner');

const multiplierBadge = document.getElementById('multiplier-badge');
const multiplierBar = document.getElementById('multiplier-bar');
const chaseMeterFill = document.getElementById('chase-meter-fill');
const chaseMarker = document.getElementById('chase-marker');
const chaseStatus = document.getElementById('chase-status');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const exitBtn = document.getElementById('exit-btn');
const muteBtn = document.getElementById('mute-btn');
const touchControls = document.getElementById('touch-controls');
const touchJump = document.getElementById('touch-jump');
const touchSlide = document.getElementById('touch-slide');

// --- Game States ---
const STATE = {
  START: 'START',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  FAIL_SEQUENCE: 'FAIL_SEQUENCE',
  GAMEOVER: 'GAMEOVER'
};

let gameState = STATE.START;
let lastTimestamp = 0;
let screenShake = 0;
let autoPausedByVisibility = false;

// High score persistence
  let highScore = parseInt(localStorage.getItem('NinjaX_chase_highscore') || '0', 10);
highscoreDisplay.textContent = highScore.toLocaleString();

// --- Input Controller ---
const input = {
  jump: false,
  slide: false
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (gameState === STATE.PLAYING || gameState === STATE.PAUSED) togglePause();
    e.preventDefault();
  } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (!input.jump) {
      input.jump = true;
      if (gameState === STATE.START) {
        startGameCountdown();
      } else if (gameState === STATE.GAMEOVER) {
        restartGame();
      } else if (gameState === STATE.PLAYING) {
        player.onJumpPress();
      }
    }
    e.preventDefault();
  } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    if (!input.slide) {
      input.slide = true;
      if (gameState === STATE.PLAYING) {
        player.triggerSlide();
      }
    }
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    input.jump = false;
    e.preventDefault();
  } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    input.slide = false;
    e.preventDefault();
  }
});

function pauseForVisibility() {
  if (gameState === STATE.PLAYING) {
    autoPausedByVisibility = true;
    togglePause();
  }
}

function resumeFromVisibility() {
  if (autoPausedByVisibility && gameState === STATE.PAUSED) {
    autoPausedByVisibility = false;
    togglePause();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseForVisibility();
  else resumeFromVisibility();
});
window.addEventListener('blur', pauseForVisibility);
window.addEventListener('focus', resumeFromVisibility);

// Touch & Click Event Listeners
startBtn.addEventListener('click', () => {
  if (gameState === STATE.START) startGameCountdown();
});
restartBtn.addEventListener('click', () => {
  if (gameState === STATE.GAMEOVER) restartGame();
});
muteBtn.addEventListener('click', () => {
  const isMuted = sounds.toggleMute();
  muteBtn.textContent = isMuted ? '🔇' : '🔊';
});
pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);
pauseRestartBtn.addEventListener('click', restartGame);
exitBtn.addEventListener('click', exitToTitle);

// Mobile Touch zones
touchJump.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!input.jump) {
    input.jump = true;
    if (gameState === STATE.START) {
      startGameCountdown();
    } else if (gameState === STATE.GAMEOVER) {
      restartGame();
    } else if (gameState === STATE.PLAYING) {
      player.onJumpPress();
    }
  }
});
touchJump.addEventListener('touchend', (e) => {
  e.preventDefault();
  input.jump = false;
});

touchSlide.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!input.slide) {
    input.slide = true;
    if (gameState === STATE.PLAYING) {
      player.triggerSlide();
    }
  }
});
touchSlide.addEventListener('touchend', (e) => {
  e.preventDefault();
  input.slide = false;
});



// --- Particle System ---
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  addDust(x, y, count = 5, color = 'rgba(255, 255, 255, 0.6)') {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 4,
        vx: -(Math.random() * 80 + 40),
        vy: -(Math.random() * 50 + 10),
        radius: Math.random() * 3 + 2,
        color: color,
        alpha: 1,
        decay: Math.random() * 2 + 2
      });
    }
  }

  addSparkle(x, y, count = 10, color = '#ffcc00') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 60;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 2,
        color: color,
        alpha: 1,
        decay: Math.random() * 2 + 2.5
      });
    }
  }

  addFloatingText(x, y, text, color = '#ffcc00') {
    this.floatingTexts.push({
      x: x,
      y: y,
      text: text,
      color: color,
      alpha: 1,
      vy: -60,
      decay: 1.2
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= ft.decay * dt;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = 'bold 20px Orbitron, sans-serif';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  reset() {
    this.particles = [];
    this.floatingTexts = [];
  }
}

const particles = new ParticleSystem();

// --- Parallax Background Renderer ---
class ParallaxBackground {
  constructor() {
    this.distantOffset = 0;
    this.midOffset = 0;
    this.nearOffset = 0;
    this.distantBuildings = [];
    this.midBuildings = [];
    this.themeLevel = 0;
    this.targetThemeLevel = 0;
    this.initStaticElements();
  }

  setThemeLevel(level) {
    this.targetThemeLevel = level;
  }

  initStaticElements() {
    // Generate distant skyline buildings
    let x = 0;
    while (x < VIRTUAL_WIDTH * 2.5) {
      const width = Math.floor(Math.random() * 90 + 70);
      const height = Math.floor(Math.random() * 200 + 160);
      const spire = Math.random() < 0.35;
      this.distantBuildings.push({ x, width, height, spire });
      x += width + Math.floor(Math.random() * 20);
    }

    // Generate mid skyline buildings with window grids
    x = 0;
    while (x < VIRTUAL_WIDTH * 2.5) {
      const width = Math.floor(Math.random() * 110 + 90);
      const height = Math.floor(Math.random() * 260 + 200);
      const windows = [];
      const cols = Math.floor(width / 18);
      const rows = Math.floor(height / 24);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.6) {
            windows.push({
              relX: c * 18 + 6,
              relY: r * 24 + 10,
              lit: Math.random() < 0.7,
              color: Math.random() < 0.5 ? '#ffea75' : '#00f0ff'
            });
          }
        }
      }
      this.midBuildings.push({ x, width, height, windows, waterTank: Math.random() < 0.3 });
      x += width + Math.floor(Math.random() * 30 + 10);
    }
  }

  update(scrollSpeed, dt) {
    this.distantOffset = (this.distantOffset + scrollSpeed * 0.08 * dt) % VIRTUAL_WIDTH;
    this.midOffset = (this.midOffset + scrollSpeed * 0.28 * dt) % (VIRTUAL_WIDTH * 1.5);
    this.nearOffset = (this.nearOffset + scrollSpeed * 0.6 * dt) % VIRTUAL_WIDTH;
    this.themeLevel += (this.targetThemeLevel - this.themeLevel) * Math.min(1, dt * 2.5);
  }

  draw(ctx) {
    const themeLevel = this.themeLevel;
    const themes = [
      ['#09081a', '#221133', '#64194c', '#b83b38', '#ffaa33'],
      ['#18285b', '#315fa3', '#e16c68', '#ffb347', '#ffe08a'],
      ['#0c6b91', '#22a6a8', '#69d5aa', '#ffd166', '#fff0a8'],
      ['#087f8c', '#20b486', '#7ed957', '#ffd166', '#fff7bd'],
      ['#101b3d', '#233b69', '#70558f', '#d45d70', '#f4a261']
    ];
    const paletteIndex = Math.floor(themeLevel) % themes.length;
    const paletteBlend = themeLevel - Math.floor(themeLevel);
    const nextPalette = themes[(paletteIndex + 1) % themes.length];
    const colors = themes[paletteIndex].map((color, index) => {
      const from = color.slice(1);
      const to = nextPalette[index].slice(1);
      const fromValue = [parseInt(from.slice(0, 2), 16), parseInt(from.slice(2, 4), 16), parseInt(from.slice(4, 6), 16)];
      const toValue = [parseInt(to.slice(0, 2), 16), parseInt(to.slice(2, 4), 16), parseInt(to.slice(4, 6), 16)];
      return `rgb(${fromValue.map((value, channel) => Math.round(value + (toValue[channel] - value) * paletteBlend)).join(',')})`;
    });
    const currentIsNight = paletteIndex === 0 || paletteIndex === 4;
    const nextIndex = (paletteIndex + 1) % themes.length;
    const nextIsNight = nextIndex === 0 || nextIndex === 4;
    const nightOpacity = currentIsNight ? (nextIsNight ? 1 : 1 - paletteBlend) : (nextIsNight ? paletteBlend : 0);

    // Each 5,000 points advances the sky toward a brighter daytime palette.
    const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    skyGrad.addColorStop(0, colors[0]);
    skyGrad.addColorStop(0.35, colors[1]);
    skyGrad.addColorStop(0.6, colors[2]);
    skyGrad.addColorStop(0.82, colors[3]);
    skyGrad.addColorStop(1, colors[4]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    if (nightOpacity > 0) {
      ctx.save();
      ctx.globalAlpha = nightOpacity;
      const moonGlow = ctx.createRadialGradient(880, 240, 15, 880, 240, 150);
      moonGlow.addColorStop(0, 'rgba(190, 230, 255, 0.3)');
      moonGlow.addColorStop(1, 'rgba(80, 140, 220, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(880, 240, 150, 0, Math.PI * 2);
      ctx.fill();

      // Two arcs create a clean curved half-moon rather than a circle with a mask.
      ctx.fillStyle = '#f5f0c8';
      ctx.beginPath();
      ctx.arc(880, 240, 58, Math.PI / 2, Math.PI * 1.5);
      ctx.arc(900, 240, 58, Math.PI * 1.5, Math.PI / 2, true);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 1 - nightOpacity;
    const sunGrad = ctx.createRadialGradient(880, 240, 20, 880, 240, 150);
    sunGrad.addColorStop(0, 'rgba(255, 255, 220, 0.98)');
    sunGrad.addColorStop(0.3, 'rgba(255, 214, 90, 0.7)');
    sunGrad.addColorStop(0.7, 'rgba(255, 120, 60, 0.25)');
    sunGrad.addColorStop(1, 'rgba(255, 80, 50, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(880, 240, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sunset Clouds (soft atmospheric bands)
    ctx.fillStyle = nightOpacity > 0 ? 'rgba(255, 140, 100, 0.12)' : 'rgba(255, 255, 220, 0.16)';
    ctx.fillRect(0, 180, VIRTUAL_WIDTH, 40);
    ctx.fillStyle = nightOpacity > 0 ? 'rgba(100, 30, 80, 0.25)' : 'rgba(20, 110, 120, 0.14)';
    ctx.fillRect(0, 260, VIRTUAL_WIDTH, 50);

    // 2. Layer 1: Distant City Skyline Silhouettes
    ctx.save();
    ctx.fillStyle = '#20102c';
    for (const b of this.distantBuildings) {
      let drawX = b.x - (this.distantOffset % (VIRTUAL_WIDTH * 1.5));
      if (drawX < -b.width) drawX += VIRTUAL_WIDTH * 1.5;
      const topY = VIRTUAL_HEIGHT - b.height - 120;
      ctx.fillRect(drawX, topY, b.width, b.height + 120);

      // Antenna / Spire
      if (b.spire) {
        ctx.strokeStyle = '#20102c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(drawX + b.width / 2, topY);
        ctx.lineTo(drawX + b.width / 2, topY - 35);
        ctx.stroke();

        // Spire Red Warning Beacon
        ctx.fillStyle = '#ff2244';
        ctx.beginPath();
        ctx.arc(drawX + b.width / 2, topY - 35, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#20102c';
      }
    }
    ctx.restore();

    // 3. Layer 2: Mid-distance Buildings with Windows & Water Towers
    ctx.save();
    for (const b of this.midBuildings) {
      let drawX = b.x - (this.midOffset % (VIRTUAL_WIDTH * 1.5));
      if (drawX < -b.width) drawX += VIRTUAL_WIDTH * 1.5;
      const topY = VIRTUAL_HEIGHT - b.height - 40;

      // Building Body
      ctx.fillStyle = '#170c24';
      ctx.fillRect(drawX, topY, b.width, b.height + 40);

      // NinjaX cornice/trim
      ctx.fillStyle = '#26163b';
      ctx.fillRect(drawX - 4, topY, b.width + 8, 6);

      // Windows
      for (const w of b.windows) {
        if (w.lit) {
          ctx.fillStyle = w.color;
          ctx.globalAlpha = 0.55;
          ctx.fillRect(drawX + w.relX, topY + w.relY, 8, 12);
        }
      }
      ctx.globalAlpha = 1.0;

      // Water Tank on NinjaX
      if (b.waterTank) {
        ctx.fillStyle = '#2a1a38';
        ctx.fillRect(drawX + 15, topY - 24, 28, 24);
        ctx.fillStyle = '#402856';
        ctx.beginPath();
        ctx.moveTo(drawX + 10, topY - 24);
        ctx.lineTo(drawX + 29, topY - 34);
        ctx.lineTo(drawX + 48, topY - 24);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

const background = new ParallaxBackground();

// --- NinjaX & Obstacle Generation ---
class NinjaXManager {
  constructor() {
    this.NinjaXs = [];
    this.coins = [];
    this.powerups = [];
    this.obstacles = [];
    this.connectors = [];
    this.nextObstacleType = 'JUMP';
    this.lastNinjaXX = 0;
    this.lastHeight = 460;
  }

  init() {
    this.NinjaXs = [];
    this.coins = [];
    this.powerups = [];
    this.obstacles = [];
    this.connectors = [];
    this.nextObstacleType = 'JUMP';

    // Starting platform under ninja and pursuer
    const initialWidth = 1400;
    const initialNinjaX = {
      x: -200,
      y: 480,
      width: initialWidth,
      height: VIRTUAL_HEIGHT - 480 + 100,
      style: 'concrete',
      edgeAccent: '#00f0ff'
    };
    this.NinjaXs.push(initialNinjaX);
    this.lastNinjaXX = initialNinjaX.x + initialNinjaX.width;
    this.lastHeight = initialNinjaX.y;

    // Pre-populate several NinjaX platforms ahead
    while (this.lastNinjaXX < VIRTUAL_WIDTH * 2.5) {
      this.generateNextNinjaX(360);
    }
  }

  generateNextNinjaX(currentSpeed) {
    // Gap calculation based on the player's horizontal jump radius.
    const jumpRadius = currentSpeed * 0.72;
    const minGap = Math.floor(jumpRadius * 0.55);
    const maxGap = Math.floor(jumpRadius * 0.85);
    const gap = Math.floor(Math.random() * (maxGap - minGap) + minGap);

    const x = this.lastNinjaXX + gap;
    const width = Math.floor(Math.random() * 500 + 480);

    // Mix ordinary roofs with occasional taller towers.
    const heightDelta = (Math.random() - 0.5) * 120 + (Math.random() < 0.22 ? -100 : 0);
    const previousHeight = this.lastHeight;
    let y = Math.max(400, Math.min(580, previousHeight + heightDelta));

    const styles = ['concrete', 'tiles', 'tarpaper'];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const accents = ['#00f0ff', '#ff0077', '#ff7700', '#00ff99'];
    const edgeAccent = accents[Math.floor(Math.random() * accents.length)];

    const connectorType = Math.abs(y - previousHeight) > 24 && Math.random() < 0.7
      ? (y > previousHeight ? 'SLIDE' : 'LADDER')
      : null;
    const NinjaX = {
      x,
      y,
      width,
      height: VIRTUAL_HEIGHT - y + 200,
      style,
      edgeAccent,
      hasAC: Math.random() < 0.4,
      hasVent: Math.random() < 0.5,
      transition: connectorType
    };

    this.NinjaXs.push(NinjaX);
    if (connectorType) {
      this.connectors.push({
        type: connectorType,
        startX: this.lastNinjaXX,
        startY: previousHeight,
        endX: x,
        endY: y
      });
    }
    this.lastNinjaXX = x + width;
    this.lastHeight = y;

    // --- Spawn Obstacles ---
    // Alternate obstacle types to keep the jump/slide ratio exactly balanced.
    if (width > 420) {
      const obstacleType = this.nextObstacleType === 'JUMP' ? 'JUMP_AC' : 'SLIDE_BEAM';
      this.nextObstacleType = this.nextObstacleType === 'JUMP' ? 'SLIDE' : 'JUMP';
      const obsX = x + Math.floor(Math.random() * (width - 240) + 120);

      if (obstacleType === 'JUMP_AC') {
        this.obstacles.push({
          type: 'JUMP',
          subType: 'AC',
          x: obsX,
          y: y - 42,
          width: 44,
          height: 42,
          cleared: false
        });
      } else if (obstacleType === 'SLIDE_BEAM') {
        this.obstacles.push({
          type: 'SLIDE',
          subType: 'BEAM',
          x: obsX,
          y: y - 72,
          width: 90,
          height: 36,
          groundY: y,
          cleared: false
        });
      }
    }

    // --- Spawn Collectibles (Coins & Multiplier Orbs) ---
    // Lower coins follow the exact single-jump flight path from the gap edge.
    if (!connectorType && gap > 130 && Math.random() < 0.8) {
      const coinMargin = 18;
      const coinWavelength = 30;
      const coinCount = Math.max(4, Math.ceil((gap - coinMargin * 2) / coinWavelength));
      const jumpOriginX = x - gap + coinMargin;
      for (let i = 0; i < coinCount; i++) {
        const t = (i + 1) / (coinCount + 1);
        const coinX = jumpOriginX + (gap - coinMargin * 2) * t;
        const groundY = previousHeight + (y - previousHeight) * t;
        const jumpTime = (coinX - jumpOriginX) / currentSpeed;
        const jumpOffset = (-580 * jumpTime) + (0.5 * 1550 * jumpTime * jumpTime);
        const arcY = groundY - 28 + jumpOffset;
        this.coins.push({
          x: coinX,
          y: arcY,
          radius: 13,
          collected: false,
          rotation: Math.random() * Math.PI
        });

      }
    } else if (Math.random() < 0.7) {
      // Row of 3 coins on flat NinjaX
      const startCoinX = x + 80;
      for (let i = 0; i < 3; i++) {
        this.coins.push({
          x: startCoinX + i * 36,
          y: y - 28,
          radius: 11,
          collected: false,
          rotation: 0
        });
      }
    }

    // Score Multiplier Orb (Random rare spawn)
    if (Math.random() < 0.18) {
      const orbRadius = 16;
      const clearance = 28;
      let orbX = x + width / 2;
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidateX = x + Math.floor(Math.random() * (width - 160) + 80);
        const blocked = this.obstacles.some(obstacle => (
          candidateX + orbRadius + clearance > obstacle.x &&
          candidateX - orbRadius - clearance < obstacle.x + obstacle.width &&
          y - 48 + orbRadius + clearance > obstacle.y &&
          y - 48 - orbRadius - clearance < obstacle.y + obstacle.height
        ));
        if (!blocked) {
          orbX = candidateX;
          this.powerups.push({
            type: 'MULTIPLIER',
            x: orbX,
            y: y - 48,
            radius: orbRadius,
            pickupRadius: 72,
            collected: false,
            pulseTimer: 0
          });
          break;
        }
      }
    }
  }

  update(scrollSpeed, dt) {
    // Scroll NinjaX platforms leftwards
    for (const r of this.NinjaXs) r.x -= scrollSpeed * dt;
    for (const c of this.coins) c.x -= scrollSpeed * dt;
    for (const p of this.powerups) p.x -= scrollSpeed * dt;
    for (const o of this.obstacles) o.x -= scrollSpeed * dt;
    for (const c of this.connectors) {
      c.startX -= scrollSpeed * dt;
      c.endX -= scrollSpeed * dt;
    }

    this.lastNinjaXX -= scrollSpeed * dt;

    // Animate coin rotation
    for (const c of this.coins) {
      c.rotation += dt * 5;
    }

    // Animate powerup pulse
    for (const p of this.powerups) {
      p.pulseTimer += dt * 4;
    }

    // Recycle off-screen elements (left of screen < -400)
    this.NinjaXs = this.NinjaXs.filter(r => r.x + r.width > -400);
    this.coins = this.coins.filter(c => c.x > -100 && !c.collected);
    this.powerups = this.powerups.filter(p => p.x > -100 && !p.collected);
    this.obstacles = this.obstacles.filter(o => o.x + o.width > -200);
    this.connectors = this.connectors.filter(c => c.endX > -400);

    // Spawn new NinjaX platforms continuously
    while (this.lastNinjaXX < VIRTUAL_WIDTH * 2.2) {
      this.generateNextNinjaX(scrollSpeed);
    }
  }

  draw(ctx) {
    // 1. Draw NinjaX platforms
    for (const r of this.NinjaXs) {
      // Building main body
      const bodyGrad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.height);
      bodyGrad.addColorStop(0, '#100b1a');
      bodyGrad.addColorStop(0.3, '#0c0714');
      bodyGrad.addColorStop(1, '#050308');
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(r.x, r.y, r.width, r.height);

      // NinjaX top surface bar (tar/concrete/tiles)
      ctx.fillStyle = r.style === 'tiles' ? '#2c1e38' : (r.style === 'concrete' ? '#221a2e' : '#1a1424');
      ctx.fillRect(r.x, r.y, r.width, 18);

      // Glowing Neon Ledge Accent
      ctx.fillStyle = r.edgeAccent;
      ctx.shadowColor = r.edgeAccent;
      ctx.shadowBlur = 12;
      ctx.fillRect(r.x, r.y, r.width, 4);

      // Corner Ledge Trim
      ctx.fillRect(r.x, r.y, 8, 16);
      ctx.fillRect(r.x + r.width - 8, r.y, 8, 16);
      ctx.shadowBlur = 0;

    }

    // Connectors bridge the actual gap between consecutive building roofs.
    for (const connector of this.connectors) {
      ctx.save();
      ctx.lineCap = 'round';
      if (connector.type === 'SLIDE') {
        ctx.strokeStyle = '#ff0077';
        ctx.shadowColor = '#ff0077';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(connector.startX, connector.startY - 8);
        ctx.lineTo(connector.endX, connector.endY - 8);
        ctx.stroke();
        ctx.strokeStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 7;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(connector.startX, connector.startY - 8);
        ctx.lineTo(connector.endX, connector.endY - 8);
        ctx.stroke();
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(connector.startX, connector.startY - 8, 7, 0, Math.PI * 2);
        ctx.arc(connector.endX, connector.endY - 8, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Holographic climbing bridge: a spine and offset chevron steps.
        const dx = connector.endX - connector.startX;
        const dy = connector.endY - connector.startY;
        const bridgeAngle = Math.atan2(dy, dx);
        const normalX = -Math.sin(bridgeAngle);
        const normalY = Math.cos(bridgeAngle);
        const bridgeLength = Math.hypot(dx, dy);

        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(connector.startX, connector.startY - 10);
        ctx.lineTo(connector.endX, connector.endY - 10);
        ctx.stroke();

        const stepCount = Math.max(4, Math.floor(bridgeLength / 34));
        for (let step = 0; step <= stepCount; step++) {
          const t = step / stepCount;
          const centerX = connector.startX + dx * t;
          const centerY = connector.startY + dy * t;
          const offset = step % 2 === 0 ? 14 : -14;
          const stepX = centerX + normalX * offset;
          const stepY = centerY + normalY * offset;

          ctx.fillStyle = step % 2 === 0 ? '#ff0077' : '#00f0ff';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(stepX, stepY - 9);
          ctx.lineTo(stepX + 11, stepY);
          ctx.lineTo(stepX, stepY + 9);
          ctx.lineTo(stepX - 11, stepY);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 5;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(connector.startX, connector.startY - 10, 8, 0, Math.PI * 2);
        ctx.arc(connector.endX, connector.endY - 10, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const r of this.NinjaXs) {
      // NinjaX clutter (Vents & details)
      if (r.hasVent) {
        ctx.fillStyle = '#3a254c';
        ctx.fillRect(r.x + 40, r.y - 12, 24, 12);
        ctx.fillStyle = '#ff0077';
        ctx.fillRect(r.x + 44, r.y - 10, 4, 8);
      }
    }

    // 2. Draw Obstacles
    for (const o of this.obstacles) {
      if (o.type === 'JUMP') {
        if (o.subType === 'AC') {
          // AC Unit
          ctx.fillStyle = '#303048';
          ctx.fillRect(o.x, o.y, o.width, o.height);
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(o.x, o.y, o.width, o.height);

          // Fan grill
          ctx.strokeStyle = '#556688';
          ctx.beginPath();
          ctx.arc(o.x + o.width / 2, o.y + o.height / 2, 14, 0, Math.PI * 2);
          ctx.stroke();

          // Hazard LED
          ctx.fillStyle = '#ff2244';
          ctx.fillRect(o.x + 6, o.y + 6, 6, 6);
        } else if (o.subType === 'PIPE') {
          // Steel NinjaX pipes
          ctx.fillStyle = '#503848';
          ctx.fillRect(o.x, o.y + 10, o.width, 16);
          ctx.fillRect(o.x + 8, o.y, 14, o.height);
          ctx.fillRect(o.x + 30, o.y, 14, o.height);

          ctx.fillStyle = '#ffaa00';
          ctx.fillRect(o.x + 6, o.y + 4, 18, 4);
        } else if (o.subType === 'BEAM') {
          ctx.fillStyle = '#221133';
          ctx.fillRect(o.x, o.y, o.width, o.height);
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 2;
          ctx.strokeRect(o.x, o.y, o.width, o.height);
          ctx.fillStyle = '#ffcc00';
          ctx.font = 'bold 13px Orbitron, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('JUMP', o.x + o.width / 2, o.y + 27);
        }
      } else if (o.type === 'SLIDE') {
        ctx.strokeStyle = '#443355';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(o.x + 8, o.y);
        ctx.lineTo(o.x + 8, 0);
        ctx.moveTo(o.x + o.width - 8, o.y);
        ctx.lineTo(o.x + o.width - 8, 0);
        ctx.stroke();

        ctx.fillStyle = '#221133';
        ctx.fillRect(o.x, o.y, o.width, o.height);
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 8;
        ctx.strokeRect(o.x, o.y, o.width, o.height);
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 13px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SLIDE', o.x + o.width / 2, o.y + 23);
        ctx.shadowBlur = 0;
      }
    }

    // 3. Draw Coins
    for (const c of this.coins) {
      if (c.collected) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      const scaleX = Math.cos(c.rotation);
      ctx.scale(scaleX, 1);

      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner Coin Rim
      ctx.strokeStyle = '#fff5a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius - 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // 4. Draw Multiplier Power-up Orbs
    for (const p of this.powerups) {
      if (p.collected) continue;
      ctx.save();
      ctx.translate(p.x, p.y);

      const pulse = Math.sin(p.pulseTimer) * 3;
      const currentRadius = p.radius + pulse;

      // Outer Glow Aura
      const orbGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, currentRadius + 12);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.4, '#ff00aa');
      orbGrad.addColorStop(0.8, '#00f0ff');
      orbGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');

      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(0, 0, currentRadius + 12, 0, Math.PI * 2);
      ctx.fill();

      // Inner Solid Core
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting Energy Sparkles
      for (let i = 0; i < 3; i++) {
        const orbAngle = p.pulseTimer * 1.5 + (i * Math.PI * 2) / 3;
        const ox = Math.cos(orbAngle) * (currentRadius + 8);
        const oy = Math.sin(orbAngle) * (currentRadius + 8);
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(ox, oy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

const world = new NinjaXManager();

// --- Player (Ninja) Character ---
class NinjaPlayer {
  constructor() {
    this.x = 360; // 1/3 from left
    this.y = 480;
    this.vy = 0;
    this.width = 34;
    this.standHeight = 56;
    this.slideHeight = 28;
    this.height = this.standHeight;

    this.grounded = false;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.maxSlideDuration = 0.65; // seconds

    // Double Jump & Acrobatic Vault
    this.canDoubleJump = true;
    this.isDoubleJumping = false;
    this.doubleJumpRotation = 0;

    // Fluid Input & Physics Assist
    this.coyoteTimer = 0;
    this.maxCoyoteTime = 0.12; // 120ms coyote time
    this.jumpBufferTimer = 0;
    this.maxJumpBufferTime = 0.16; // 160ms jump buffer
    this.landSquash = 1.0; // Dynamic landing squash/bounce

    // Jump physics
    this.jumpBoostTimer = 0;
    this.maxJumpBoostTime = 0.16; // variable jump hold
    this.jumpImpulse = -580;
    this.jumpBoostAcc = -1100;
    this.gravity = 1550;

    // Animation frames
    this.animTime = 0;
    this.scarfSegments = [
      { x: 0, y: 0 },
      { x: -10, y: 5 },
      { x: -22, y: 10 },
      { x: -35, y: 15 }
    ];

    // Power-up state
    this.multiplierActive = false;
    this.multiplierTimer = 0;
    this.multiplierDuration = 7.0; // seconds
  }

  reset(startY = 480) {
    this.x = 360;
    this.y = startY - this.standHeight;
    this.vy = 0;
    this.height = this.standHeight;
    this.grounded = true;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.jumpBoostTimer = 0;
    this.canDoubleJump = true;
    this.isDoubleJumping = false;
    this.doubleJumpRotation = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.landSquash = 1.0;
    this.animTime = 0;
    this.multiplierActive = false;
    this.multiplierTimer = 0;

    for (let i = 0; i < this.scarfSegments.length; i++) {
      this.scarfSegments[i] = { x: this.x - i * 10, y: this.y + 15 };
    }
  }

  onJumpPress() {
    if (this.grounded || this.coyoteTimer > 0) {
      // 1. Single Ground Jump (No somersault)
      this.grounded = false;
      this.coyoteTimer = 0;
      this.isJumping = true;
      this.canDoubleJump = true; // Arm double jump for mid-air
      this.isDoubleJumping = false;
      this.doubleJumpRotation = 0;
      this.vy = this.jumpImpulse;
      this.jumpBoostTimer = this.maxJumpBoostTime;
      this.jumpBufferTimer = 0;

      if (this.isSliding) {
        this.isSliding = false;
        this.y -= (this.standHeight - this.slideHeight);
        this.height = this.standHeight;
      }

      sounds.playJump();
      particles.addDust(this.x + this.width / 2, this.y + this.height, 8, 'rgba(0, 240, 255, 0.7)');
      return true;
    } else if (this.canDoubleJump && !this.grounded) {
      // 2. Mid-Air Double Jump (With 360-degree somersault flip!)
      this.canDoubleJump = false; // Disarm until next landing
      this.isDoubleJumping = true; // Trigger somersault
      this.doubleJumpRotation = 0;
      this.isJumping = true;
      this.vy = this.jumpImpulse * 0.95; // Crisp upward aerial vault
      this.jumpBoostTimer = this.maxJumpBoostTime * 0.85;
      this.jumpBufferTimer = 0;

      if (this.isSliding) {
        this.isSliding = false;
        this.y -= (this.standHeight - this.slideHeight);
        this.height = this.standHeight;
      }

      sounds.playDoubleJump();
      particles.addSparkle(this.x + this.width / 2, this.y + this.height, 18, '#00f0ff');
      particles.addFloatingText(this.x + 10, this.y - 20, 'DOUBLE JUMP!', '#00f0ff');
      return true;
    } else if (!this.grounded) {
      // If double jump is already spent, buffer jump for landing
      this.jumpBufferTimer = this.maxJumpBufferTime;
    }
    return false;
  }

  triggerSlide() {
    if (this.grounded && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = this.maxSlideDuration;
      this.y += (this.standHeight - this.slideHeight); // Lock feet firmly to NinjaX
      this.height = this.slideHeight;
      sounds.playSlide();
      particles.addDust(this.x, this.y + this.height, 6, '#ff0077');
    }
  }

  activateMultiplier() {
    this.multiplierActive = true;
    this.multiplierTimer = this.multiplierDuration;
    sounds.playMultiplier();
    particles.addSparkle(this.x + this.width / 2, this.y + this.height / 2, 20, '#ff00aa');
    particles.addFloatingText(this.x + 20, this.y - 20, '2X ACTIVE!', '#00f0ff');
  }

  update(dt, currentSpeed) {
    this.animTime += dt * (currentSpeed / 40);

    // Multiplier timer
    if (this.multiplierActive) {
      this.multiplierTimer -= dt;
      if (this.multiplierTimer <= 0) {
        this.multiplierActive = false;
        this.multiplierTimer = 0;
      }
    }

    // Smooth landing squash recovery
    if (this.landSquash < 1.0) {
      this.landSquash += (1.0 - this.landSquash) * Math.min(1.0, dt * 14);
    }

    // Double Jump 360-degree somersault flip
    if (this.isDoubleJumping) {
      this.doubleJumpRotation += dt * 14;
      if (this.doubleJumpRotation >= Math.PI * 2) {
        this.doubleJumpRotation = 0;
        this.isDoubleJumping = false; // Somersault complete!
      }
    }

    // Process Jump Buffer (fires single jump immediately upon landing)
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
      if (this.grounded || this.coyoteTimer > 0) {
        this.jumpBufferTimer = 0;
        this.onJumpPress();
      }
    }

    if (!this.grounded && this.coyoteTimer > 0) {
      this.coyoteTimer -= dt;
    }

    // Variable Jump Boost (holding jump button extends rise)
    if (this.isJumping && input.jump && this.jumpBoostTimer > 0) {
      this.vy += this.jumpBoostAcc * dt;
      this.jumpBoostTimer -= dt;
    } else {
      this.jumpBoostTimer = 0;
    }

    // Apply Gravity
    this.vy += this.gravity * dt;
    this.y += this.vy * dt;

    // Slide state timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      // Spawn sliding sparks
      if (Math.random() < 0.4) {
        particles.addDust(this.x - 5, this.y + this.height, 2, '#ffaa00');
      }
      if (this.slideTimer <= 0 && !input.slide) {
        this.isSliding = false;
        this.y -= (this.standHeight - this.slideHeight); // Stand back up while keeping feet locked
        this.height = this.standHeight;
      }
    }

    // Ground Collision Detection with NinjaX platforms
    let onNinjaX = false;
    const playerFeet = this.y + this.height;
    // Precise center-of-mass contact: eliminates premature edge drops!
    const playerBaseLeft = this.x + 8;
    const playerBaseRight = this.x + this.width - 8;

    for (const r of world.NinjaXs) {
      if (playerBaseRight >= r.x && playerBaseLeft <= r.x + r.width) {
        // Within horizontal bounds of this NinjaX platform
        if (playerFeet >= r.y && playerFeet - this.vy * dt <= r.y + 26 && this.vy >= 0) {
          // Land on NinjaX
          this.y = r.y - this.height;
          this.vy = 0;
          onNinjaX = true;

          if (!this.grounded) {
            this.grounded = true;

            this.isJumping = false;
            this.canDoubleJump = true; // Recharge double jump on landing!
            this.isDoubleJumping = false;
            this.doubleJumpRotation = 0;
            this.coyoteTimer = this.maxCoyoteTime;
            this.landSquash = 0.82; // Smooth squash on landing
            sounds.playLand();
            particles.addDust(this.x + this.width / 2, r.y, 6, '#ffffff');

            if (this.jumpBufferTimer > 0) {
              this.jumpBufferTimer = 0;
              this.onJumpPress();
            }
          } else {
            this.coyoteTimer = this.maxCoyoteTime;
          }
          break;
        }
      }
    }

    if (!onNinjaX && this.vy >= 0) {
      for (const connector of world.connectors) {
        if (playerBaseRight < connector.startX || playerBaseLeft > connector.endX) continue;
        const span = connector.endX - connector.startX;
        const progress = span === 0 ? 0 : (this.x + this.width / 2 - connector.startX) / span;
        const connectorY = connector.startY + (connector.endY - connector.startY) * Math.max(0, Math.min(1, progress));
        if (playerFeet >= connectorY && playerFeet - this.vy * dt <= connectorY + 26) {
          this.y = connectorY - this.height;
          this.vy = 0;
          onNinjaX = true;
          this.grounded = true;
          break;
        }
      }
    }


    if (!onNinjaX) {
      this.grounded = false;
    }

    // Update dynamic cloth scarf physics
    const neckX = this.x + 10;
    const neckY = this.y + (this.isSliding ? 10 : 16);
    this.scarfSegments[0].x = neckX;
    this.scarfSegments[0].y = neckY;

    for (let i = 1; i < this.scarfSegments.length; i++) {
      const prev = this.scarfSegments[i - 1];
      const curr = this.scarfSegments[i];
      const targetX = prev.x - 12 - (currentSpeed / 120);
      const wave = Math.sin(this.animTime * 3 + i) * 6;
      const targetY = prev.y + (this.vy * 0.03) + wave;

      curr.x += (targetX - curr.x) * (dt * 20);
      curr.y += (targetY - curr.y) * (dt * 20);
    }
  }

  draw(ctx) {
    ctx.save();

    const px = this.x;
    const py = this.y;

    // Landing Squash & Stretch Transform (anchored at feet)
    if (this.landSquash < 0.99) {
      const feetX = px + this.width / 2;
      const feetY = py + this.height;
      ctx.translate(feetX, feetY);
      ctx.scale(1 / Math.sqrt(this.landSquash), this.landSquash);
      ctx.translate(-feetX, -feetY);
    }

    // Double Jump Acrobatics (360-degree front flip)
    if (this.isDoubleJumping && this.doubleJumpRotation < Math.PI * 2) {
      const centerX = px + this.width / 2;
      const centerY = py + this.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(this.doubleJumpRotation);
      ctx.translate(-centerX, -centerY);
    }

    // 1. Multiplier Active Aura
    if (this.multiplierActive) {
      ctx.save();
      const glowGrad = ctx.createRadialGradient(
        px + this.width / 2, py + this.height / 2, 10,
        px + this.width / 2, py + this.height / 2, 45
      );
      glowGrad.addColorStop(0, 'rgba(255, 0, 170, 0.4)');
      glowGrad.addColorStop(0.7, 'rgba(0, 240, 255, 0.2)');
      glowGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(px + this.width / 2, py + this.height / 2, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Flowing Ninja Scarf (Trailing cloth)
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(this.scarfSegments[0].x, this.scarfSegments[0].y);
    for (let i = 1; i < this.scarfSegments.length; i++) {
      ctx.lineTo(this.scarfSegments[i].x, this.scarfSegments[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Ninja Character Body & Parkour Poses
    if (this.isSliding) {
      // --- SLIDE POSE (Low, aerodynamic parkour slide) ---
      // Torso angled low
      ctx.fillStyle = '#101c38';
      ctx.fillRect(px + 4, py + 8, 28, 14);

      // Head / Mask
      ctx.fillStyle = '#1a2b54';
      ctx.beginPath();
      ctx.arc(px + 32, py + 10, 8, 0, Math.PI * 2);
      ctx.fill();

      // Cyan Glowing Visor / Headband
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.fillRect(px + 32, py + 8, 7, 3);
      ctx.shadowBlur = 0;

      // Extended Leg sliding along NinjaX
      ctx.strokeStyle = '#0e172e';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(px + 10, py + 18);
      ctx.lineTo(px + 38, py + 26);
      ctx.stroke();

      // Trailing folded leg
      ctx.beginPath();
      ctx.moveTo(px + 6, py + 18);
      ctx.lineTo(px - 6, py + 26);
      ctx.stroke();
    } else if (!this.grounded) {
      // --- JUMP / VAULT POSE (Tucked legs, forward leap) ---
      // Torso
      ctx.fillStyle = '#101c38';
      ctx.fillRect(px + 6, py + 12, 20, 24);

      // Belt Accent
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(px + 6, py + 24, 20, 4);

      // Head & Mask
      ctx.fillStyle = '#1a2b54';
      ctx.beginPath();
      ctx.arc(px + 18, py + 8, 9, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Eyes / Visor
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(px + 20, py + 7, 6, 3);
      ctx.shadowBlur = 0;

      // Arms reaching forward for vault
      ctx.strokeStyle = '#1a2b54';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 16);
      ctx.lineTo(px + 32, py + 22);
      ctx.stroke();

      // Tucked Legs
      ctx.strokeStyle = '#0e172e';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(px + 12, py + 34);
      ctx.lineTo(px + 2, py + 46);
      ctx.lineTo(px + 16, py + 48);
      ctx.stroke();
    } else {
      // --- RUNNING ANIMATION CYCLE (Smooth multi-joint kinematics) ---
      const cycle = this.animTime * 8;
      const legAngle1 = Math.sin(cycle) * 0.75;
      const legAngle2 = Math.sin(cycle + Math.PI) * 0.75;
      const armAngle1 = Math.sin(cycle + Math.PI) * 0.7;
      const armAngle2 = Math.sin(cycle) * 0.7;

      // Torso leaning forward slightly
      ctx.fillStyle = '#101c38';
      ctx.fillRect(px + 8, py + 14, 18, 22);

      // Crimson Belt
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(px + 8, py + 26, 18, 4);

      // Head & Mask
      ctx.fillStyle = '#1a2b54';
      ctx.beginPath();
      ctx.arc(px + 18, py + 8, 9, 0, Math.PI * 2);
      ctx.fill();

      // Cyan Visor
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.fillRect(px + 20, py + 7, 6, 3);
      ctx.shadowBlur = 0;

      // Back Arm
      ctx.strokeStyle = '#0e172e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px + 14, py + 18);
      ctx.lineTo(px + 14 + Math.sin(armAngle1) * 16, py + 28 + Math.cos(armAngle1) * 8);
      ctx.stroke();

      // Legs
      ctx.lineWidth = 6;
      // Leg 1 (Front)
      ctx.strokeStyle = '#101c38';
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 34);
      ctx.lineTo(px + 16 + Math.sin(legAngle1) * 18, py + 34 + Math.cos(legAngle1) * 20);
      ctx.stroke();

      // Leg 2 (Back)
      ctx.strokeStyle = '#0e172e';
      ctx.beginPath();
      ctx.moveTo(px + 14, py + 34);
      ctx.lineTo(px + 14 + Math.sin(legAngle2) * 18, py + 34 + Math.cos(legAngle2) * 20);
      ctx.stroke();

      // Front Arm
      ctx.strokeStyle = '#1a2b54';
      ctx.beginPath();
      ctx.moveTo(px + 18, py + 18);
      ctx.lineTo(px + 18 + Math.sin(armAngle2) * 16, py + 28 + Math.cos(armAngle2) * 8);
      ctx.stroke();
    }

    ctx.restore();
  }
}

const player = new NinjaPlayer();

// --- Rival Pursuer (Shadow Beast / Wolf) ---
class RivalPursuer {
  constructor() {
    this.x = 210; // ~140px behind player
    this.y = 480;
    this.vy = 0;
    this.width = 50;
    this.height = 46;
    this.grounded = false;
    this.animTime = 0;
    this.targetOffsetX = 145; // Default distance behind player
    this.currentDistance = 145;
  }

  reset(startY = 480) {
    this.currentDistance = 145;
    this.x = player.x - this.currentDistance;
    this.y = startY - this.height;
    this.vy = 0;
    this.grounded = true;
    this.animTime = 0;
  }

  update(dt, currentSpeed) {
    this.animTime += dt * (currentSpeed / 35);

    // Dynamic distance: rival closes in slightly when speed rises or if player stumbled
    this.x = player.x - this.currentDistance;

    const autoJumpDistance = Math.max(110, currentSpeed * 0.35);
    const nextObstacle = world.obstacles.find(o => (
      !o.cleared &&
      o.type === 'JUMP' &&
      o.x > this.x + this.width &&
      o.x - (this.x + this.width) <= autoJumpDistance
    ));
    if (nextObstacle && this.grounded) {
      this.grounded = false;
      this.vy = -540;
    }

    // Apply gravity
    this.vy += 1600 * dt;
    this.y += this.vy * dt;

    // Ground check with NinjaX platforms
    let onNinjaX = false;
    const feetY = this.y + this.height;
    const left = this.x;
    const right = this.x + this.width;

    for (const r of world.NinjaXs) {
      if (right >= r.x && left <= r.x + r.width) {
        if (feetY >= r.y && feetY - this.vy * dt <= r.y + 28 && this.vy >= 0) {
          this.y = r.y - this.height;
          this.vy = 0;
          onNinjaX = true;
          this.grounded = true;
          break;
        }
      }
    }

    // If falling below NinjaX, make wolf leap naturally across gap
    if (!onNinjaX) {
      this.grounded = false;
      if (this.vy > 100 && this.y > player.y + 40) {
        // Auto-leap to match player trajectory over gap
        this.vy = -540;
      }
    }

    // Trailing dark smoky aura
    if (Math.random() < 0.6) {
      particles.addDust(this.x + 10, this.y + this.height - 10, 1, 'rgba(180, 0, 50, 0.4)');
    }
  }

  draw(ctx) {
    ctx.save();
    const rx = this.x;
    const ry = this.y;

    // Menacing Red Smoky Shadow Trail
    ctx.save();
    const shadowGrad = ctx.createRadialGradient(rx + 25, ry + 25, 5, rx + 25, ry + 25, 40);
    shadowGrad.addColorStop(0, 'rgba(255, 0, 68, 0.35)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(rx + 25, ry + 25, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Quadruped Beast Gallop Kinematics
    const cycle = this.animTime * 9;
    const frontLeg1 = Math.sin(cycle) * 14;
    const frontLeg2 = Math.sin(cycle + 0.6) * 14;
    const backLeg1 = Math.sin(cycle + Math.PI) * 14;
    const backLeg2 = Math.sin(cycle + Math.PI + 0.6) * 14;

    // Muscular Beast Torso
    ctx.fillStyle = '#260b18';
    ctx.beginPath();
    ctx.ellipse(rx + 28, ry + 22, 22, 13, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Spiky Mane
    ctx.fillStyle = '#ff0044';
    ctx.beginPath();
    ctx.moveTo(rx + 30, ry + 10);
    ctx.lineTo(rx + 20, ry + 2);
    ctx.lineTo(rx + 24, ry + 12);
    ctx.lineTo(rx + 12, ry + 6);
    ctx.lineTo(rx + 18, ry + 16);
    ctx.fill();

    // Predator Head & Snout
    ctx.fillStyle = '#3a0f24';
    ctx.beginPath();
    ctx.moveTo(rx + 38, ry + 14);
    ctx.lineTo(rx + 54, ry + 18); // Snout tip
    ctx.lineTo(rx + 48, ry + 26);
    ctx.lineTo(rx + 36, ry + 28);
    ctx.fill();

    // Pointed Wolf Ears
    ctx.beginPath();
    ctx.moveTo(rx + 36, ry + 12);
    ctx.lineTo(rx + 38, ry);
    ctx.lineTo(rx + 44, ry + 10);
    ctx.fill();

    // Menacing Glowing Amber/Crimson Eye
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(rx + 44, ry + 16, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Legs (Animated Gallop)
    ctx.strokeStyle = '#260b18';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    // Front Legs
    ctx.beginPath();
    ctx.moveTo(rx + 38, ry + 26);
    ctx.lineTo(rx + 42 + frontLeg1, ry + 44);
    ctx.moveTo(rx + 34, ry + 26);
    ctx.lineTo(rx + 38 + frontLeg2, ry + 44);
    ctx.stroke();

    // Back Legs
    ctx.beginPath();
    ctx.moveTo(rx + 16, ry + 24);
    ctx.lineTo(rx + 12 + backLeg1, ry + 44);
    ctx.moveTo(rx + 12, ry + 24);
    ctx.lineTo(rx + 8 + backLeg2, ry + 44);
    ctx.stroke();

    // Bushy Beast Tail
    ctx.strokeStyle = '#ff0044';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rx + 8, ry + 20);
    ctx.quadraticCurveTo(rx - 8, ry + 14 + Math.sin(cycle) * 6, rx - 16, ry + 26);
    ctx.stroke();

    ctx.restore();
  }
}

const rival = new RivalPursuer();

// --- Game Engine Variables ---
let score = 0;
let distance = 0;
let coinsCollected = 0;
let baseSpeed = 360; // Moderate starting speed
let currentSpeed = baseSpeed;
let failReason = '';
let failDesc = '';
let failTimer = 0;

// --- State Machine & Transitions ---

function startGameCountdown() {
  if (gameState !== STATE.START) return;
  sounds.init();
  sounds.startBGM();

  gameState = STATE.COUNTDOWN;
  startScreen.classList.add('hidden');
  countdownOverlay.classList.remove('hidden');
  hudElement.classList.remove('hidden');

  let count = 3;
  countdownText.textContent = count;
  sounds.playCountdown(false);

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownText.textContent = count;
      countdownText.style.animation = 'none';
      void countdownText.offsetWidth; // Trigger reflow
      countdownText.style.animation = 'countdown-pop 0.9s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
      sounds.playCountdown(false);
    } else if (count === 0) {
      countdownText.textContent = 'GO!';
      countdownText.style.animation = 'none';
      void countdownText.offsetWidth;
      countdownText.style.animation = 'countdown-pop 0.9s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
      sounds.playCountdown(true);
    } else {
      clearInterval(timer);
      countdownOverlay.classList.add('hidden');
      gameState = STATE.PLAYING;
    }
  }, 750);
}

function togglePause() {
  if (gameState === STATE.PLAYING) {
    gameState = STATE.PAUSED;
    sounds.stopBGM();
    pauseScreen.classList.remove('hidden');
    pauseBtn.textContent = '▶';
    pauseBtn.title = 'Resume game';
  } else if (gameState === STATE.PAUSED) {
    gameState = STATE.PLAYING;
    sounds.startBGM();
    pauseScreen.classList.add('hidden');
    pauseBtn.textContent = 'Ⅱ';
    pauseBtn.title = 'Pause game';
  }
}

function exitToTitle() {
  sounds.stopBGM();
  pauseScreen.classList.add('hidden');
  hudElement.classList.add('hidden');
  startScreen.classList.remove('hidden');
  score = 0;
  distance = 0;
  coinsCollected = 0;
  currentSpeed = baseSpeed;
  scoreDisplay.textContent = '0';
  background.setThemeLevel(0);
  world.init();
  player.reset(480);
  rival.reset(480);
  particles.reset();
  gameState = STATE.START;
}

function triggerFail(reason, desc, toastTitle) {
  if (gameState !== STATE.PLAYING) return;
  gameState = STATE.FAIL_SEQUENCE;
  sounds.stopBGM();
  failReason = reason;
  failDesc = desc;
  failTimer = 0.85; // Short slow-mo / impact freeze

  screenShake = 15;
  failReasonTitle.textContent = toastTitle;
  failReasonDesc.textContent = desc;
  failToast.classList.remove('hidden');

  if (reason === 'FELL') {
    sounds.playFall();
  } else if (reason === 'OBSTACLE') {
    sounds.playHitObstacle();
    particles.addSparkle(player.x + player.width / 2, player.y + player.height / 2, 25, '#ff0055');
  } else if (reason === 'CAUGHT') {
    sounds.playCaught();
    particles.addSparkle(player.x, player.y + player.height / 2, 30, '#ff0044');
  }
}

function showGameOverScreen() {
  gameState = STATE.GAMEOVER;
  sounds.stopBGM();
  failToast.classList.add('hidden');
  gameoverScreen.classList.remove('hidden');

  const finalScoreVal = Math.floor(score);
  finalScoreDisplay.textContent = finalScoreVal.toLocaleString();
  finalDistanceDisplay.textContent = `${Math.floor(distance)} m`;
  finalCoinsDisplay.textContent = coinsCollected;

  failBadge.textContent = failReason === 'FELL' ? 'YOU FELL OFF NinjaX!' : (failReason === 'OBSTACLE' ? 'HIT OBSTACLE!' : 'CAUGHT BY PURSUER!');

  if (finalScoreVal > highScore) {
    highScore = finalScoreVal;
    localStorage.setItem('NinjaX_chase_highscore', highScore.toString());
    highscoreDisplay.textContent = highScore.toLocaleString();
    newHighscoreBanner.classList.remove('hidden');
  } else {
    newHighscoreBanner.classList.add('hidden');
  }
}

function restartGame() {
  gameoverScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  score = 0;
  distance = 0;
  coinsCollected = 0;
  currentSpeed = baseSpeed;
  scoreDisplay.textContent = '0';
  background.setThemeLevel(0);
  pauseBtn.textContent = 'Ⅱ';
  pauseBtn.title = 'Pause game';

  world.init();
  player.reset(480);
  rival.reset(480);
  particles.reset();

  gameState = STATE.PLAYING;
  sounds.startBGM();
}

// --- Main Update Loop ---
function update(dt) {
  // Screen shake decay
  if (screenShake > 0) {
    screenShake = Math.max(0, screenShake - dt * 40);
  }

  // Particle updates across all states
  particles.update(dt);

  if (gameState === STATE.START) {
    // Idle parallax drift
    background.update(40, dt);
    return;
  }

  if (gameState === STATE.COUNTDOWN) {
    background.update(60, dt);
    return;
  }

  if (gameState === STATE.FAIL_SEQUENCE) {
    failTimer -= dt;
    if (failTimer <= 0) {
      showGameOverScreen();
    }
    return;
  }

  if (gameState !== STATE.PLAYING) return;

  // --- 1. Difficulty & Speed Curve ---
  // Moderate, gentle ramp: ~1.4 px/s increase per second
  currentSpeed = baseSpeed + (distance * 0.08);

  // --- 2. Input Handling ---
  if (input.slide && player.grounded && !player.isSliding) {
    player.triggerSlide();
  }



  // --- 3. Update Entities & World ---
  world.update(currentSpeed, dt);
  background.update(currentSpeed, dt);
  player.update(dt, currentSpeed);
  rival.update(dt, currentSpeed);

  // --- 4. Scoring ---
  const multiplier = player.multiplierActive ? 2 : 1;
  distance += (currentSpeed * dt) / 10;
  score += (currentSpeed * dt * 0.2) * multiplier;
  background.setThemeLevel(Math.floor(score / 5000));
  scoreDisplay.textContent = Math.floor(score).toLocaleString();

  // Multiplier UI bar update
  if (player.multiplierActive) {
    multiplierBadge.classList.remove('hidden');
    const pct = Math.max(0, (player.multiplierTimer / player.multiplierDuration) * 100);
    multiplierBar.style.width = `${pct}%`;
  } else {
    multiplierBadge.classList.add('hidden');
  }

  // Chase Proximity Meter
  const distToRival = player.x - rival.x;
  const proximityPct = Math.min(100, Math.max(0, 100 - ((distToRival - 50) / 140) * 100));
  chaseMeterFill.style.width = `${proximityPct}%`;
  chaseMarker.style.right = `${100 - proximityPct}%`;

  if (proximityPct > 75) {
    chaseStatus.textContent = 'CRITICAL DANGER!';
    chaseStatus.style.color = '#ff0044';
  } else {
    chaseStatus.textContent = 'HOT ON TAIL';
    chaseStatus.style.color = '#ff8800';
  }

  // --- 5. Collision Checks ---

  // Condition 1: Falling into gap
  if (player.y > VIRTUAL_HEIGHT + 20) {
    triggerFail('FELL', 'Missed the NinjaX landing', 'YOU FELL!');
    return;
  }

  // Condition 2: Obstacle Collisions
  const playerBox = {
    x: player.x + 6,
    y: player.y + 4,
    width: player.width - 12,
    height: player.height - 4
  };

  for (const o of world.obstacles) {
    if (o.cleared) continue;

    // AABB Intersection check
    const isColliding = (
      playerBox.x < o.x + o.width &&
      playerBox.x + playerBox.width > o.x &&
      playerBox.y < o.y + o.height &&
      playerBox.y + playerBox.height > o.y
    );

    if (isColliding) {
      if (o.type === 'SLIDE') {
        // Overhead beam: if sliding, player fits underneath (height is reduced)
        if (!player.isSliding) {
          triggerFail('OBSTACLE', 'Failed to slide under low beam', 'OUCH!');
          return;
        }
      } else {
        // Jump obstacle (AC unit or pipe): player must jump over
        triggerFail('OBSTACLE', 'Stumbled on NinjaX equipment', 'OUCH!');
        return;
      }
    }

    // Mark as cleared once safely passed
    if (player.x > o.x + o.width) {
      o.cleared = true;
    }
  }

  // Condition 3: Rival Catching Up
  if (rival.x + rival.width >= player.x + 8) {
    triggerFail('CAUGHT', 'The shadow beast caught you', 'CAUGHT!');
    return;
  }

  // --- 6. Collectibles Checks ---

  // Coins
  for (const c of world.coins) {
    if (c.collected) continue;
    const dx = (player.x + player.width / 2) - c.x;
    const dy = (player.y + player.height / 2) - c.y;
    const dist = Math.hypot(dx, dy);

    if (dist < player.width / 2 + c.radius) {
      c.collected = true;
      const coinPoints = 100 * multiplier;
      score += coinPoints;
      coinsCollected++;
      sounds.playCoin();
      particles.addSparkle(c.x, c.y, 10, '#ffea00');
      particles.addFloatingText(c.x, c.y - 15, `+${coinPoints}`, '#ffea00');
    }
  }

  // Multiplier Power-up Orb
  for (const p of world.powerups) {
    if (p.collected) continue;
    const dx = (player.x + player.width / 2) - p.x;
    const dy = (player.y + player.height / 2) - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist < player.width / 2 + (p.pickupRadius || p.radius)) {
      p.collected = true;
      player.activateMultiplier();
    }
  }
}

// --- Main Render Loop ---
function render() {
  ctx.save();

  // Screen shake effect
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;
    ctx.translate(shakeX, shakeY);
  }

  // Clear Canvas
  ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  // 1. Draw Parallax Backgrounds
  background.draw(ctx);

  if (gameState === STATE.START) {
    // Draw initial platform, sitting ninja & lurking rival on start screen
    ctx.fillStyle = '#100b1a';
    ctx.fillRect(0, 480, VIRTUAL_WIDTH, 240);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(0, 480, VIRTUAL_WIDTH, 4);

    // Sitting Ninja on NinjaX ledge
    ctx.fillStyle = '#101c38';
    ctx.fillRect(360, 440, 30, 40);
    ctx.fillStyle = '#1a2b54';
    ctx.beginPath();
    ctx.arc(375, 432, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(377, 430, 6, 3);
    // Flowing Scarf
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(370, 438);
    ctx.quadraticCurveTo(345, 445 + Math.sin(Date.now() * 0.003) * 6, 320, 455);
    ctx.stroke();

    // Lurking Beast behind
    ctx.fillStyle = '#260b18';
    ctx.beginPath();
    ctx.ellipse(230, 455, 24, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(245, 450, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 2. Draw Playable World (NinjaX, Obstacles, Coins, Powerups)
    world.draw(ctx);

    // 3. Draw Characters
    rival.draw(ctx);
    player.draw(ctx);

    // 4. Draw Particles & Overlays
    particles.draw(ctx);

    // Speed Lines Effect when running fast
    if (currentSpeed > 450) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const lineY = (Math.sin(Date.now() * 0.01 + i) * 0.5 + 0.5) * VIRTUAL_HEIGHT;
        const lineX = VIRTUAL_WIDTH - ((Date.now() * 1.5 + i * 250) % VIRTUAL_WIDTH);
        ctx.beginPath();
        ctx.moveTo(lineX, lineY);
        ctx.lineTo(lineX - 90, lineY);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

// --- Master Game Loop ---
function gameLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1); // Clamp dt to prevent tunneling
  lastTimestamp = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// Initialize world and start animation loop
world.init();
player.reset(480);
rival.reset(480);
requestAnimationFrame(gameLoop);
