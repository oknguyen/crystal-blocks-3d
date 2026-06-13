"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Viewport = {
  width: number;
  height: number;
};

type PlatformKind = "grass" | "stone" | "castle" | "pipe" | "bridge";

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatformKind;
};

type Coin = {
  id: number;
  x: number;
  y: number;
  taken: boolean;
};

type Enemy = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rangeMin: number;
  rangeMax: number;
  vx: number;
  alive: boolean;
  dir: 1 | -1;
};

type PowerType = "star" | "mushroom";

type PowerUp = {
  id: number;
  x: number;
  y: number;
  kind: PowerType;
  taken: boolean;
};

type DecorationKind = "cloud" | "hill" | "tower" | "banner";

type Decoration = {
  id: number;
  x: number;
  y: number;
  kind: DecorationKind;
  scale: number;
  layer: number;
};

type Player = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  coyote: number;
  jumpBuffer: number;
  invincible: number;
  hurtCooldown: number;
};

type GameStatus = "playing" | "paused" | "victory" | "gameover";

type GameWorld = {
  width: number;
  height: number;
  goalX: number;
  checkpointXs: number[];
  platforms: Rect[];
  coins: Coin[];
  enemies: Enemy[];
  powerups: PowerUp[];
  decorations: Decoration[];
};

type GameState = {
  status: GameStatus;
  player: Player;
  cameraX: number;
  score: number;
  lives: number;
  coins: number;
  time: number;
  starTimer: number;
  checkpointX: number;
  message: string;
  collectedCoins: Set<number>;
  enemies: Enemy[];
  powerups: PowerUp[];
};

type InputState = {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  run: boolean;
};

const WORLD: GameWorld = buildWorld();

const PLAYER_W = 34;
const PLAYER_H = 48;
const WALK_SPEED = 240;
const RUN_SPEED = 360;
const JUMP_FORCE = 860;
const GRAVITY = 2450;
const MAX_FALL_SPEED = 980;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function approach(current: number, target: number, delta: number) {
  if (current < target) {
    return Math.min(current + delta, target);
  }
  return Math.max(current - delta, target);
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    coyote: 0,
    jumpBuffer: 0,
    invincible: 0,
    hurtCooldown: 0,
  };
}

function buildWorld(): GameWorld {
  const platforms: Rect[] = [];
  const coins: Coin[] = [];
  const enemies: Enemy[] = [];
  const powerups: PowerUp[] = [];
  const decorations: Decoration[] = [];

  let coinId = 1;
  let enemyId = 1;
  let powerId = 1;
  let decoId = 1;

  const addPlatform = (x: number, y: number, w: number, h: number, kind: PlatformKind = "grass") => {
    platforms.push({ x, y, w, h, kind });
  };

  const addCoins = (points: Array<[number, number]>) => {
    for (const [x, y] of points) {
      coins.push({ id: coinId += 1, x, y, taken: false });
    }
  };

  const addEnemy = (x: number, y: number, rangeMin: number, rangeMax: number) => {
    enemies.push({
      id: enemyId += 1,
      x,
      y,
      w: 34,
      h: 30,
      rangeMin,
      rangeMax,
      vx: 65,
      alive: true,
      dir: Math.random() > 0.5 ? 1 : -1,
    });
  };

  const addPowerUp = (x: number, y: number, kind: PowerType) => {
    powerups.push({ id: powerId += 1, x, y, kind, taken: false });
  };

  const addDecoration = (x: number, y: number, kind: DecorationKind, scale: number, layer: number) => {
    decorations.push({ id: decoId += 1, x, y, kind, scale, layer });
  };

  addPlatform(0, 620, 980, 100, "grass");
  addPlatform(1120, 620, 860, 100, "grass");
  addPlatform(2240, 620, 920, 100, "stone");
  addPlatform(3480, 620, 980, 100, "castle");
  addPlatform(4520, 620, 720, 100, "castle");

  addPlatform(260, 540, 120, 26, "bridge");
  addPlatform(520, 480, 140, 26, "bridge");
  addPlatform(760, 410, 120, 26, "bridge");
  addPlatform(1380, 520, 150, 26, "bridge");
  addPlatform(1650, 440, 130, 26, "bridge");
  addPlatform(1880, 360, 120, 26, "bridge");
  addPlatform(2520, 520, 160, 26, "bridge");
  addPlatform(2770, 440, 120, 26, "bridge");
  addPlatform(3010, 360, 120, 26, "bridge");
  addPlatform(3740, 510, 150, 26, "bridge");
  addPlatform(4020, 430, 150, 26, "bridge");
  addPlatform(4270, 360, 150, 26, "bridge");
  addPlatform(4740, 520, 150, 26, "bridge");
  addPlatform(4980, 440, 120, 26, "bridge");
  addPlatform(5140, 370, 110, 26, "bridge");

  addPlatform(1050, 560, 76, 60, "pipe");
  addPlatform(2140, 540, 84, 80, "pipe");
  addPlatform(3400, 540, 84, 80, "pipe");
  addPlatform(4440, 540, 84, 80, "pipe");

  addCoins([
    [320, 492],
    [360, 442],
    [560, 422],
    [600, 422],
    [810, 352],
    [1410, 482],
    [1470, 482],
    [1700, 402],
    [1760, 402],
    [1910, 322],
    [1970, 322],
    [2570, 482],
    [2630, 482],
    [2800, 402],
    [2860, 402],
    [3040, 322],
    [3100, 322],
    [3780, 474],
    [3840, 474],
    [4040, 394],
    [4100, 394],
    [4310, 326],
    [4370, 326],
    [4770, 484],
    [4830, 484],
    [5010, 404],
    [5070, 404],
    [5160, 336],
  ]);

  addEnemy(680, 590, 540, 920);
  addEnemy(1550, 590, 1220, 2010);
  addEnemy(2330, 590, 2240, 3100);
  addEnemy(3710, 590, 3480, 4420);
  addEnemy(4910, 590, 4520, 5200);

  addPowerUp(1640, 340, "star");
  addPowerUp(2870, 300, "mushroom");
  addPowerUp(4760, 280, "star");

  for (let i = 0; i < 18; i += 1) {
    addDecoration(140 + i * 290, 120 + (i % 3) * 12, "cloud", 0.8 + (i % 4) * 0.12, 1);
  }

  addDecoration(220, 512, "hill", 1.8, 0);
  addDecoration(620, 500, "hill", 1.5, 0);
  addDecoration(1450, 502, "hill", 1.9, 0);
  addDecoration(2330, 492, "hill", 1.7, 0);
  addDecoration(3860, 488, "hill", 2.0, 0);
  addDecoration(4700, 486, "hill", 1.8, 0);
  addDecoration(3300, 430, "tower", 1.1, 2);
  addDecoration(5150, 410, "banner", 1.0, 2);

  return {
    width: 5400,
    height: 720,
    goalX: 5210,
    checkpointXs: [120, 1240, 2920, 4560],
    platforms,
    coins,
    enemies,
    powerups,
    decorations,
  };
}

function initialState(): GameState {
  return {
    status: "playing",
    player: createPlayer(110, 540),
    cameraX: 0,
    score: 0,
    lives: 3,
    coins: 0,
    time: 0,
    starTimer: 0,
    checkpointX: 120,
    message: "Chạy, nhảy và tới cột cờ cuối map để giải cứu công chúa.",
    collectedCoins: new Set<number>(),
    enemies: WORLD.enemies.map((enemy) => ({ ...enemy })),
    powerups: WORLD.powerups.map((powerup) => ({ ...powerup })),
  };
}

function respawn(state: GameState): GameState {
  return {
    ...state,
    player: {
      ...createPlayer(state.checkpointX, 520),
      invincible: 1.8,
      hurtCooldown: 1.2,
    },
    cameraX: clamp(state.checkpointX - 180, 0, WORLD.width - 1),
    message: "Checkpoint đã lưu. Tiếp tục cuộc phiêu lưu.",
  };
}

function applyDamage(state: GameState): GameState {
  const lives = state.lives - 1;
  if (lives <= 0) {
    return {
      ...state,
      lives: 0,
      status: "gameover",
      message: "Bạn đã gục ngã. Bấm restart để thử lại.",
    };
  }

  return respawn({
    ...state,
    lives,
    starTimer: 0,
  });
}

function simulate(state: GameState, input: InputState, dt: number): GameState {
  if (state.status !== "playing") {
    return {
      ...state,
      time: state.time + dt,
      starTimer: Math.max(0, state.starTimer - dt),
      player: {
        ...state.player,
        invincible: Math.max(0, state.player.invincible - dt),
        hurtCooldown: Math.max(0, state.player.hurtCooldown - dt),
      },
    };
  }

  const jumpPressed = input.jumpPressed;
  input.jumpPressed = false;

  let nextState: GameState = {
    ...state,
    time: state.time + dt,
    starTimer: Math.max(0, state.starTimer - dt),
    message: state.message,
  };

  let player = { ...nextState.player };
  let enemies = nextState.enemies.map((enemy) => ({ ...enemy }));
  let powerups = nextState.powerups.map((powerup) => ({ ...powerup }));
  const collectedCoins = new Set(nextState.collectedCoins);

  if (jumpPressed) {
    player.jumpBuffer = 0.16;
  }
  player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.coyote = Math.max(0, player.coyote - dt);
  player.invincible = Math.max(0, player.invincible - dt);
  player.hurtCooldown = Math.max(0, player.hurtCooldown - dt);

  const moveAxis = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const targetSpeed = input.run ? RUN_SPEED : WALK_SPEED;
  if (moveAxis !== 0) {
    player.vx = approach(player.vx, moveAxis * targetSpeed, 2400 * dt);
    player.facing = moveAxis > 0 ? 1 : -1;
  } else {
    player.vx = approach(player.vx, 0, 2600 * dt);
  }

  if (player.jumpBuffer > 0 && (player.onGround || player.coyote > 0)) {
    player.vy = -JUMP_FORCE;
    player.onGround = false;
    player.jumpBuffer = 0;
    player.coyote = 0;
    nextState.message = "Jump!";
  }

  player.vy = clamp(player.vy + GRAVITY * dt, -9999, MAX_FALL_SPEED);

  const prevBottom = player.y + player.h;

  player.x += player.vx * dt;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    let collided = false;
    for (const platform of WORLD.platforms) {
      if (!rectsOverlap(player, platform)) {
        continue;
      }
      collided = true;
      if (player.vx > 0) {
        player.x = platform.x - player.w - 0.01;
      } else if (player.vx < 0) {
        player.x = platform.x + platform.w + 0.01;
      }
      player.vx = 0;
    }
    if (!collided) {
      break;
    }
  }

  player.y += player.vy * dt;
  player.onGround = false;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    let collided = false;
    for (const platform of WORLD.platforms) {
      if (!rectsOverlap(player, platform)) {
        continue;
      }
      collided = true;
      if (player.vy > 0) {
        player.y = platform.y - player.h - 0.01;
        player.vy = 0;
        player.onGround = true;
        player.coyote = 0.12;
      } else if (player.vy < 0) {
        player.y = platform.y + platform.h + 0.01;
        player.vy = 0;
      }
    }
    if (!collided) {
      break;
    }
  }

  if (player.onGround) {
    player.coyote = 0.12;
  }

  if (player.y > WORLD.height + 180) {
    return applyDamage({
      ...nextState,
      player,
      enemies,
      powerups,
      collectedCoins,
      message: "Rơi xuống vực! Hãy thử nhảy chính xác hơn.",
    });
  }

  let score = nextState.score + Math.max(0, Math.floor(Math.abs(player.vx) * dt * 0.18));
  let coins = nextState.coins;
  let lives = nextState.lives;
  let checkpointX = nextState.checkpointX;
  let starTimer = nextState.starTimer;

  for (const coin of WORLD.coins) {
    if (collectedCoins.has(coin.id)) {
      continue;
    }
    const coinBox = { x: coin.x - 12, y: coin.y - 12, w: 24, h: 24 };
    if (rectsOverlap(player, coinBox)) {
      collectedCoins.add(coin.id);
      coins += 1;
      score += 50;
      nextState.message = "Thu được đồng xu!";
    }
  }

  for (const powerup of powerups) {
    if (powerup.taken) {
      continue;
    }
    const powerBox = { x: powerup.x - 16, y: powerup.y - 16, w: 32, h: 32 };
    if (!rectsOverlap(player, powerBox)) {
      continue;
    }
    powerup.taken = true;
    if (powerup.kind === "star") {
      starTimer = 7;
      player.invincible = 7;
      score += 250;
      nextState.message = "Sao bất tử! Tăng tốc phá đảo màn chơi.";
    } else {
      lives += 1;
      score += 120;
      nextState.message = "Được thêm 1 mạng!";
    }
  }

  const speedBoost = starTimer > 0 ? 1.15 : 1;
  player.vx *= speedBoost;

  for (const enemy of enemies) {
    if (!enemy.alive) {
      continue;
    }
    enemy.x += enemy.dir * enemy.vx * dt;
    if (enemy.x < enemy.rangeMin) {
      enemy.x = enemy.rangeMin;
      enemy.dir = 1;
    }
    if (enemy.x + enemy.w > enemy.rangeMax) {
      enemy.x = enemy.rangeMax - enemy.w;
      enemy.dir = -1;
    }

    const enemyBox = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
    if (!rectsOverlap(player, enemyBox)) {
      continue;
    }

    const stomp = prevBottom <= enemy.y + 12 && player.vy > 0;
    const invincible = player.invincible > 0 || starTimer > 0;

    if (stomp || invincible) {
      enemy.alive = false;
      player.vy = -560;
      score += stomp ? 180 : 120;
      nextState.message = stomp ? "Đạp trúng kẻ địch!" : "Lướt qua bằng sức mạnh ngôi sao!";
    } else if (player.hurtCooldown <= 0) {
      return applyDamage({
        ...nextState,
        player: {
          ...player,
          invincible: 1.2,
          hurtCooldown: 1.2,
        },
        enemies,
        powerups,
        collectedCoins,
        score,
        coins,
        lives,
        checkpointX,
        starTimer: 0,
        message: "Chạm kẻ địch! Mất một mạng.",
      });
    }
  }

  const checkpoint = [...WORLD.checkpointXs].sort((a, b) => a - b).filter((x) => player.x >= x).at(-1);
  if (checkpoint && checkpoint > checkpointX) {
    checkpointX = checkpoint;
    nextState.message = `Checkpoint đạt ${Math.round(checkpoint / 100)}m.`;
  }

  const cameraX = clamp(player.x + player.w / 2 - 520, 0, WORLD.width - 1);

  const reachedGoal = player.x + player.w >= WORLD.goalX && player.y + player.h >= 320;
  if (reachedGoal) {
    return {
      ...nextState,
      status: "victory",
      player,
      cameraX,
      score: score + 1000 + lives * 250 + coins * 20,
      lives,
      coins,
      starTimer,
      checkpointX,
      enemies,
      powerups,
      collectedCoins,
      message: "Cứu được công chúa! Cổng thành đã mở.",
    };
  }

  return {
    ...nextState,
    player,
    cameraX,
    score,
    lives,
    coins,
    starTimer,
    checkpointX,
    enemies,
    powerups,
    collectedCoins,
    message: nextState.message,
  };
}

function formatTime(seconds: number) {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60)
    .toString()
    .padStart(2, "0");
  const rest = (whole % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function spriteClass(kind: string, extra = "") {
  return `sprite sprite--${kind} ${extra}`.trim();
}

export default function CastleRunnerGame() {
  const [game, setGame] = useState<GameState>(() => initialState());
  const [viewport, setViewport] = useState<Viewport>({ width: 1280, height: 720 });
  const viewportRef = useRef(viewport);
  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    jumpPressed: false,
    run: false,
  });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewport({
        width,
        height,
      });
      viewportRef.current = { width, height };
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        inputRef.current.left = true;
      }
      if (event.code === "ArrowRight" || event.code === "KeyD") {
        inputRef.current.right = true;
      }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        inputRef.current.run = true;
      }
      if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        inputRef.current.jumpPressed = true;
      }
      if (event.code === "KeyP" || event.code === "Escape") {
        setGame((current) => ({
          ...current,
          status: current.status === "paused" ? "playing" : current.status === "playing" ? "paused" : current.status,
          message: current.status === "paused" ? "Tiếp tục hành trình." : "Tạm dừng để quan sát bản đồ.",
        }));
      }
      if (event.code === "KeyR") {
        setGame(initialState());
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        inputRef.current.left = false;
      }
      if (event.code === "ArrowRight" || event.code === "KeyD") {
        inputRef.current.right = false;
      }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        inputRef.current.run = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loop = (now: number) => {
      if (!mounted) {
        return;
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }

      const dt = clamp((now - lastTimeRef.current) / 1000, 0, 0.033);
      lastTimeRef.current = now;

      setGame((current) => simulate(current, inputRef.current, dt));
      inputRef.current.jumpPressed = false;
      rafRef.current = window.requestAnimationFrame(loop);
    };

    rafRef.current = window.requestAnimationFrame(loop);

    return () => {
      mounted = false;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!stageRef.current) {
      return;
    }
    stageRef.current.focus();
  }, []);

  const visiblePlatforms = useMemo(() => {
    const left = game.cameraX - 80;
    const right = game.cameraX + viewport.width + 120;
    return WORLD.platforms.filter((platform) => platform.x + platform.w >= left && platform.x <= right);
  }, [game.cameraX, viewport.width]);

  const visibleCoins = useMemo(() => {
    const left = game.cameraX - 100;
    const right = game.cameraX + viewport.width + 120;
    return WORLD.coins.filter((coin) => !game.collectedCoins.has(coin.id) && coin.x >= left && coin.x <= right);
  }, [game.cameraX, game.collectedCoins, viewport.width]);

  const visibleEnemies = useMemo(() => {
    const left = game.cameraX - 100;
    const right = game.cameraX + viewport.width + 120;
    return game.enemies.filter((enemy) => enemy.alive && enemy.x + enemy.w >= left && enemy.x <= right);
  }, [game.cameraX, game.enemies, viewport.width]);

  const visiblePowerups = useMemo(() => {
    const left = game.cameraX - 100;
    const right = game.cameraX + viewport.width + 120;
    return game.powerups.filter((powerup) => !powerup.taken && powerup.x >= left && powerup.x <= right);
  }, [game.cameraX, game.powerups, viewport.width]);

  const visibleDecorations = useMemo(() => {
    return WORLD.decorations.filter((deco) => deco.layer <= 2);
  }, []);

  const hudCheckpoint = Math.round(game.checkpointX / 100);
  const starPercent = Math.max(0, Math.min(100, (game.starTimer / 7) * 100));
  const playerAltitude = Math.max(0, WORLD.height - (game.player.y + game.player.h));

  return (
    <main className="runner-shell">
      <section className="hero-banner">
        <div>
          <p className="eyebrow">Castle Runner</p>
          <h1>Platformer tốc độ cao, chạy nhảy cứu công chúa, không còn xếp khối.</h1>
          <p className="lead">
            Một web game kiểu Mario trên Next.js: chạy ngang, nhảy qua hố, đạp địch, nhặt xu,
            chạm checkpoint và lao tới cột cờ cuối màn.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat-card stat-card--accent">
            <span>Score</span>
            <strong>{game.score.toLocaleString("vi-VN")}</strong>
          </div>
          <div className="stat-card">
            <span>Coins</span>
            <strong>{game.coins}</strong>
          </div>
          <div className="stat-card">
            <span>Lives</span>
            <strong>{game.lives}</strong>
          </div>
        </div>
      </section>

      <section className="toolbar">
        <div className="toolbar__group">
          <button className="primary-button" onClick={() => setGame(initialState())}>
            Restart
          </button>
          <button
            className="secondary-button"
            onClick={() =>
              setGame((current) => ({
                ...current,
                status: current.status === "paused" ? "playing" : current.status === "playing" ? "paused" : current.status,
                message: current.status === "paused" ? "Tiếp tục cuộc chạy." : "Tạm dừng quan sát màn chơi.",
              }))
            }
          >
            {game.status === "paused" ? "Resume" : "Pause"}
          </button>
        </div>
        <div className="toolbar__group toolbar__group--meta">
          <span>Checkpoint {hudCheckpoint}</span>
          <span>Time {formatTime(game.time)}</span>
          <span>Altitude {Math.round(playerAltitude)}px</span>
        </div>
      </section>

      <section className="game-layout">
        <aside className="panel panel--left">
          <h2>Mission</h2>
          <ul className="feature-list">
            <li>Chạy ngang như một platformer cổ điển.</li>
            <li>Nhảy qua hố, đạp kẻ địch và gom xu.</li>
            <li>Ngôi sao cho bất tử tạm thời.</li>
            <li>Checkpoint giúp hồi sinh ở giữa màn.</li>
          </ul>

          <div className="mini-panel">
            <p>Controls</p>
            <strong>WASD / arrows, Space to jump, Shift to run, P to pause, R to restart</strong>
          </div>

          <div className="mini-panel">
            <p>Power</p>
            <strong>{game.starTimer > 0 ? "Star active" : "Collect a star"}</strong>
            <span>{Math.round(starPercent)}% left</span>
            <div className="meter">
              <span style={{ width: `${starPercent}%` }} />
            </div>
          </div>
        </aside>

        <section className="stage-wrap">
          <div className="sky-glow" />
          <div className="parallax parallax--far" style={{ transform: `translateX(${game.cameraX * -0.08}px)` }} />
          <div className="parallax parallax--mid" style={{ transform: `translateX(${game.cameraX * -0.22}px)` }} />
          <div className="parallax parallax--near" style={{ transform: `translateX(${game.cameraX * -0.42}px)` }} />

          <div className="hud-row">
            <div className="hud-chip">Princess rescue mission</div>
            <div className="hud-chip">Status {game.status}</div>
            <div className="hud-chip">{game.message}</div>
          </div>

          <div className="stage" ref={stageRef} tabIndex={0} aria-label="Castle Runner game stage">
            <div className="stage__world" style={{ width: `${WORLD.width}px`, height: `${WORLD.height}px`, transform: `translateX(${-game.cameraX}px)` }}>
              <div className="mountain mountain--1" />
              <div className="mountain mountain--2" />
              <div className="castle-backdrop" style={{ left: `${WORLD.goalX - 180}px` }} />

              {visibleDecorations.map((deco) => (
                <div
                  key={deco.id}
                  className={`deco deco--${deco.kind}`}
                  style={{
                    left: `${deco.x}px`,
                    top: `${deco.y}px`,
                    transform: `scale(${deco.scale})`,
                  }}
                />
              ))}

              {visiblePlatforms.map((platform, index) => (
                <div
                  key={`${platform.kind}-${index}-${platform.x}`}
                  className={`platform platform--${platform.kind}`}
                  style={{
                    left: `${platform.x}px`,
                    top: `${platform.y}px`,
                    width: `${platform.w}px`,
                    height: `${platform.h}px`,
                  }}
                />
              ))}

              {WORLD.coins.map((coin) => {
                if (game.collectedCoins.has(coin.id)) {
                  return null;
                }
                if (!visibleCoins.includes(coin)) {
                  return null;
                }
                return (
                  <div
                    key={coin.id}
                    className="coin"
                    style={{ left: `${coin.x}px`, top: `${coin.y}px` }}
                  >
                    <span />
                  </div>
                );
              })}

              {visibleEnemies.map((enemy) => (
                <div
                  key={enemy.id}
                  className={`enemy ${enemy.alive ? "" : "enemy--defeated"}`}
                  style={{
                    left: `${enemy.x}px`,
                    top: `${enemy.y}px`,
                    width: `${enemy.w}px`,
                    height: `${enemy.h}px`,
                  }}
                >
                  <span className="enemy__shell" />
                  <span className="enemy__eye enemy__eye--left" />
                  <span className="enemy__eye enemy__eye--right" />
                </div>
              ))}

              {visiblePowerups.map((powerup) => (
                <div
                  key={powerup.id}
                  className={`powerup powerup--${powerup.kind}`}
                  style={{ left: `${powerup.x}px`, top: `${powerup.y}px` }}
                />
              ))}

              <div className="goal" style={{ left: `${WORLD.goalX}px`, top: "306px" }}>
                <div className="goal__pole" />
                <div className="goal__flag">GO</div>
                <div className="goal__castle" />
              </div>

              <div
                className={`player ${game.player.invincible > 0 ? "player--invincible" : ""}`}
                style={{
                  left: `${game.player.x}px`,
                  top: `${game.player.y}px`,
                  width: `${game.player.w}px`,
                  height: `${game.player.h}px`,
                  transform: `scaleX(${game.player.facing})`,
                }}
              >
                <span className="player__cap" />
                <span className="player__face" />
                <span className="player__body" />
                <span className="player__arm player__arm--left" />
                <span className="player__arm player__arm--right" />
                <span className="player__leg player__leg--left" />
                <span className="player__leg player__leg--right" />
              </div>
            </div>

            {game.status !== "playing" ? (
              <div className="stage-overlay">
                <div className="overlay-card">
                  <p>{game.status === "victory" ? "Victory" : game.status === "paused" ? "Paused" : "Game Over"}</p>
                  <strong>{game.message}</strong>
                  <button
                    className="primary-button"
                    onClick={() =>
                      game.status === "paused"
                        ? setGame((current) => ({ ...current, status: "playing", message: "Tiếp tục cuộc chạy." }))
                        : setGame(initialState())
                    }
                  >
                    {game.status === "paused" ? "Resume" : "Play again"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="footer-bar">
            <div>
              <span>Progress</span>
              <strong>{Math.min(100, Math.round((game.player.x / WORLD.goalX) * 100))}%</strong>
            </div>
            <div>
              <span>Checkpoint</span>
              <strong>{hudCheckpoint}</strong>
            </div>
            <div>
              <span>Goal</span>
              <strong>{Math.max(0, Math.round((WORLD.goalX - game.player.x) / 10))}m left</strong>
            </div>
          </div>
        </section>

        <aside className="panel panel--right">
          <h2>Tips</h2>
          <div className="mini-panel">
            <p>Combo play</p>
            <strong>Run + jump để vượt gap xa hơn.</strong>
          </div>

          <div className="mini-panel">
            <p>Enemy</p>
            <strong>Nhảy lên đầu quái để hạ gục.</strong>
          </div>

          <div className="mini-panel">
            <p>Rewards</p>
            <strong>Coins, star power và extra life.</strong>
          </div>

          <div className="touch-controls">
            <button
              className="touch-button"
              onPointerDown={() => {
                inputRef.current.left = true;
              }}
              onPointerUp={() => {
                inputRef.current.left = false;
              }}
              onPointerLeave={() => {
                inputRef.current.left = false;
              }}
              onPointerCancel={() => {
                inputRef.current.left = false;
              }}
            >
              Left
            </button>
            <button
              className="touch-button"
              onPointerDown={() => {
                inputRef.current.right = true;
              }}
              onPointerUp={() => {
                inputRef.current.right = false;
              }}
              onPointerLeave={() => {
                inputRef.current.right = false;
              }}
              onPointerCancel={() => {
                inputRef.current.right = false;
              }}
            >
              Right
            </button>
            <button
              className="touch-button touch-button--accent"
              onPointerDown={() => {
                inputRef.current.jumpPressed = true;
              }}
            >
              Jump
            </button>
            <button
              className="touch-button"
              onPointerDown={() => {
                inputRef.current.run = true;
              }}
              onPointerUp={() => {
                inputRef.current.run = false;
              }}
              onPointerLeave={() => {
                inputRef.current.run = false;
              }}
              onPointerCancel={() => {
                inputRef.current.run = false;
              }}
            >
              Run
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
