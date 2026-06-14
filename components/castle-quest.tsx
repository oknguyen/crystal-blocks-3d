"use client";

import { useEffect, useRef, useState } from "react";

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Platform = Rect & {
  kind: "grass" | "brick" | "pipe" | "castle" | "crystal" | "lava";
};

type Coin = {
  id: number;
  x: number;
  y: number;
  taken: boolean;
};

type Enemy = Rect & {
  id: number;
  vx: number;
  minX: number;
  maxX: number;
  alive: boolean;
};

type Pickup = {
  id: number;
  x: number;
  y: number;
  kind: "star" | "heart";
  taken: boolean;
};

type Player = Rect & {
  vx: number;
  vy: number;
  face: 1 | -1;
  ground: boolean;
  coyote: number;
  jumpBuffer: number;
  invincible: number;
  jumps: number;
};

type GameStatus = "playing" | "paused" | "won" | "lost" | "levelup";

type GameState = {
  player: Player;
  camera: number;
  score: number;
  coins: number;
  lives: number;
  time: number;
  status: GameStatus;
  message: string;
  checkpoint: number;
  enemies: Enemy[];
  coinsList: Coin[];
  pickups: Pickup[];
  level: number;
  levelTimer: number;
};

type Input = {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
};

const WORLD_H = 720;
const FLOOR_Y = 610;

type LevelDef = {
  worldW: number; goalX: number;
  platforms: Platform[];
  coins: [number, number][];
  enemies: { x: number; y: number; minX: number; maxX: number }[];
  pickups: { x: number; y: number; kind: "star" | "heart" }[];
  skyTop: string; skyMid: string; skyBot: string;
  sun: string; hill: string; mtn: string;
  name: string;
};

const LEVELS: LevelDef[] = [
  {
    worldW: 5400, goalX: 5150, name: "Emerald Hills",
    skyTop: "#7ed0ff", skyMid: "#bde9ff", skyBot: "#f8f0c5",
    sun: "#fff7d6", hill: "#4ebc73", mtn: "#376aa0",
    platforms: [
      { x: 0, y: FLOOR_Y, w: 1040, h: 120, kind: "grass" },
      { x: 1160, y: FLOOR_Y, w: 780, h: 120, kind: "grass" },
      { x: 2140, y: FLOOR_Y, w: 880, h: 120, kind: "brick" },
      { x: 3300, y: FLOOR_Y, w: 840, h: 120, kind: "grass" },
      { x: 4260, y: FLOOR_Y, w: 1000, h: 120, kind: "castle" },
      { x: 300, y: 520, w: 150, h: 32, kind: "brick" }, { x: 560, y: 450, w: 160, h: 32, kind: "brick" }, { x: 820, y: 380, w: 130, h: 32, kind: "brick" },
      { x: 1320, y: 525, w: 150, h: 32, kind: "brick" }, { x: 1580, y: 450, w: 150, h: 32, kind: "brick" }, { x: 1850, y: 375, w: 130, h: 32, kind: "brick" },
      { x: 2380, y: 520, w: 180, h: 32, kind: "brick" }, { x: 2660, y: 455, w: 170, h: 32, kind: "brick" }, { x: 2920, y: 385, w: 140, h: 32, kind: "brick" },
      { x: 3480, y: 510, w: 180, h: 32, kind: "brick" }, { x: 3770, y: 430, w: 150, h: 32, kind: "brick" }, { x: 4020, y: 355, w: 140, h: 32, kind: "brick" },
      { x: 4440, y: 520, w: 190, h: 32, kind: "brick" }, { x: 4740, y: 450, w: 160, h: 32, kind: "brick" }, { x: 5080, y: 380, w: 160, h: 32, kind: "brick" },
      { x: 1050, y: 545, w: 82, h: 65, kind: "pipe" }, { x: 2040, y: 528, w: 90, h: 82, kind: "pipe" },
      { x: 3180, y: 528, w: 90, h: 82, kind: "pipe" }, { x: 4200, y: 528, w: 90, h: 82, kind: "pipe" },
    ],
    coins: [[355,475],[620,405],[675,405],[865,335],[1370,480],[1635,405],[1900,330],[2440,475],[2500,475],[2730,410],[2990,340],[3530,465],[3820,385],[4080,310],[4510,475],[4810,405],[5140,335]],
    enemies: [{ x:690,y:580,minX:530,maxX:980 },{ x:1470,y:580,minX:1180,maxX:1880 },{ x:2440,y:580,minX:2180,maxX:2960 },{ x:3600,y:580,minX:3320,maxX:4080 },{ x:4630,y:580,minX:4280,maxX:5180 }],
    pickups: [{ x:1625,y:398,kind:"star" },{ x:3000,y:330,kind:"heart" },{ x:4800,y:398,kind:"star" }],
  },
  {
    worldW: 6400, goalX: 6100, name: "Crystal Caverns",
    skyTop: "#050318", skyMid: "#0e0840", skyBot: "#1a1060",
    sun: "#7050ff", hill: "#1a2870", mtn: "#0a1040",
    platforms: [
      { x:0,y:FLOOR_Y,w:860,h:120,kind:"crystal" }, { x:1020,y:FLOOR_Y,w:620,h:120,kind:"crystal" },
      { x:1860,y:FLOOR_Y,w:660,h:120,kind:"crystal" }, { x:2760,y:FLOOR_Y,w:640,h:120,kind:"crystal" },
      { x:3660,y:FLOOR_Y,w:620,h:120,kind:"crystal" }, { x:4560,y:FLOOR_Y,w:620,h:120,kind:"crystal" },
      { x:5440,y:FLOOR_Y,w:960,h:120,kind:"castle" },
      { x:200,y:510,w:140,h:32,kind:"crystal" }, { x:440,y:440,w:130,h:32,kind:"crystal" }, { x:690,y:370,w:130,h:32,kind:"crystal" },
      { x:1080,y:510,w:140,h:32,kind:"crystal" }, { x:1330,y:440,w:130,h:32,kind:"crystal" }, { x:1580,y:365,w:130,h:32,kind:"crystal" },
      { x:1920,y:510,w:130,h:32,kind:"crystal" }, { x:2170,y:440,w:140,h:32,kind:"crystal" }, { x:2430,y:370,w:130,h:32,kind:"crystal" },
      { x:2830,y:510,w:130,h:32,kind:"crystal" }, { x:3080,y:440,w:140,h:32,kind:"crystal" }, { x:3340,y:365,w:130,h:32,kind:"crystal" },
      { x:3730,y:510,w:130,h:32,kind:"crystal" }, { x:3980,y:440,w:130,h:32,kind:"crystal" }, { x:4230,y:365,w:140,h:32,kind:"crystal" },
      { x:4630,y:510,w:130,h:32,kind:"crystal" }, { x:4880,y:440,w:130,h:32,kind:"crystal" }, { x:5130,y:365,w:130,h:32,kind:"crystal" },
      { x:870,y:540,w:88,h:72,kind:"pipe" }, { x:1820,y:530,w:88,h:82,kind:"pipe" }, { x:2720,y:528,w:88,h:82,kind:"pipe" },
      { x:3620,y:530,w:88,h:82,kind:"pipe" }, { x:4510,y:530,w:88,h:82,kind:"pipe" },
    ],
    coins: [[210,460],[450,390],[700,320],[1090,460],[1340,390],[1590,315],[1930,460],[2180,390],[2440,320],[2840,460],[3090,390],[3350,315],[3740,460],[3990,390],[4240,315],[4640,460],[4890,390],[5140,315]],
    enemies: [{ x:400,y:580,minX:10,maxX:820 },{ x:1300,y:580,minX:1030,maxX:1820 },{ x:2200,y:580,minX:1870,maxX:2720 },{ x:3100,y:580,minX:2770,maxX:3620 },{ x:4000,y:580,minX:3670,maxX:4520 },{ x:4900,y:580,minX:4570,maxX:5400 }],
    pickups: [{ x:450,y:388,kind:"star" },{ x:2180,y:388,kind:"heart" },{ x:3990,y:388,kind:"star" }],
  },
  {
    worldW: 7200, goalX: 6900, name: "Volcanic Fortress",
    skyTop: "#0a0100", skyMid: "#300800", skyBot: "#601000",
    sun: "#ff5010", hill: "#381008", mtn: "#200802",
    platforms: [
      { x:0,y:FLOOR_Y,w:780,h:120,kind:"lava" }, { x:940,y:FLOOR_Y,w:580,h:120,kind:"lava" },
      { x:1740,y:FLOOR_Y,w:560,h:120,kind:"lava" }, { x:2560,y:FLOOR_Y,w:560,h:120,kind:"lava" },
      { x:3360,y:FLOOR_Y,w:520,h:120,kind:"lava" }, { x:4160,y:FLOOR_Y,w:520,h:120,kind:"lava" },
      { x:4960,y:FLOOR_Y,w:520,h:120,kind:"lava" }, { x:5760,y:FLOOR_Y,w:480,h:120,kind:"lava" },
      { x:6400,y:FLOOR_Y,w:800,h:120,kind:"castle" },
      { x:180,y:510,w:130,h:32,kind:"brick" }, { x:420,y:435,w:120,h:32,kind:"brick" }, { x:650,y:360,w:120,h:32,kind:"brick" },
      { x:1000,y:510,w:130,h:32,kind:"brick" }, { x:1240,y:435,w:120,h:32,kind:"brick" }, { x:1480,y:360,w:120,h:32,kind:"brick" },
      { x:1800,y:510,w:130,h:32,kind:"brick" }, { x:2040,y:435,w:120,h:32,kind:"brick" }, { x:2280,y:360,w:120,h:32,kind:"brick" },
      { x:2620,y:510,w:130,h:32,kind:"brick" }, { x:2860,y:435,w:120,h:32,kind:"brick" }, { x:3100,y:360,w:120,h:32,kind:"brick" },
      { x:3420,y:510,w:130,h:32,kind:"brick" }, { x:3660,y:435,w:120,h:32,kind:"brick" }, { x:3900,y:360,w:120,h:32,kind:"brick" },
      { x:4220,y:510,w:130,h:32,kind:"brick" }, { x:4460,y:435,w:120,h:32,kind:"brick" }, { x:4700,y:360,w:120,h:32,kind:"brick" },
      { x:5020,y:510,w:130,h:32,kind:"brick" }, { x:5260,y:435,w:120,h:32,kind:"brick" }, { x:5500,y:360,w:120,h:32,kind:"brick" },
      { x:5820,y:510,w:130,h:32,kind:"brick" }, { x:6060,y:435,w:120,h:32,kind:"brick" }, { x:6300,y:360,w:120,h:32,kind:"brick" },
      { x:860,y:538,w:88,h:74,kind:"pipe" }, { x:1700,y:530,w:88,h:82,kind:"pipe" }, { x:2500,y:528,w:88,h:82,kind:"pipe" },
      { x:3300,y:528,w:88,h:82,kind:"pipe" }, { x:4100,y:528,w:88,h:82,kind:"pipe" }, { x:4900,y:528,w:88,h:82,kind:"pipe" },
      { x:5700,y:528,w:88,h:82,kind:"pipe" },
    ],
    coins: [[190,460],[430,385],[660,310],[1010,460],[1250,385],[1490,310],[1810,460],[2050,385],[2290,310],[2630,460],[2870,385],[3110,310],[3430,460],[3670,385],[3910,310],[4230,460],[4470,385],[4710,310],[5030,460],[5270,385],[5510,310],[5830,460],[6070,385],[6310,310]],
    enemies: [{ x:300,y:580,minX:10,maxX:740 },{ x:1100,y:580,minX:950,maxX:1700 },{ x:1900,y:580,minX:1750,maxX:2520 },{ x:2700,y:580,minX:2570,maxX:3320 },{ x:3500,y:580,minX:3370,maxX:4120 },{ x:4300,y:580,minX:4170,maxX:4920 },{ x:5100,y:580,minX:4970,maxX:5720 },{ x:5900,y:580,minX:5770,maxX:6360 }],
    pickups: [{ x:430,y:383,kind:"star" },{ x:2870,y:383,kind:"heart" },{ x:5270,y:383,kind:"star" }],
  },
];

function getLevelPlatforms(level: number): Platform[] { return LEVELS[level - 1].platforms; }


function makePlayer(x = 120, y = 520): Player {
  return { x, y, w: 34, h: 48, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, jumpBuffer: 0, invincible: 1, jumps: 0 };
}

function makeGame(level = 1, score = 0, coins = 0, lives = 3): GameState {
  const lv = LEVELS[level - 1];
  const spd = 80 + (level - 1) * 20;
  return {
    player: makePlayer(),
    camera: 0, score, coins, lives,
    time: 0, status: "playing",
    message: `Level ${level}: ${lv.name}`,
    checkpoint: 120,
    level, levelTimer: 0,
    enemies: lv.enemies.map((s, i) => ({ id: i + 1, x: s.x, y: s.y, w: 36, h: 30, vx: i % 2 === 0 ? spd : -spd, minX: s.minX, maxX: s.maxX, alive: true })),
    coinsList: lv.coins.map(([x, y], i) => ({ id: i + 1, x, y, taken: false })),
    pickups: lv.pickups.map((s, i) => ({ id: i + 1, ...s, taken: false })),
  };
}



function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function moveToward(value: number, target: number, amount: number) {
  if (value < target) return Math.min(value + amount, target);
  return Math.max(value - amount, target);
}

function hurt(game: GameState): GameState {
  const lives = game.lives - 1;
  if (lives <= 0) {
    sfx.kill();
    return { ...game, lives: 0, status: "lost", message: "Try again." };
  }
  sfx.hurt();
  return {
    ...game,
    lives,
    player: makePlayer(game.checkpoint, 520),
    camera: clamp(game.checkpoint - 180, 0, LEVELS[game.level - 1].worldW),
    message: "Checkpoint restored.",
  };
}

function stepGame(game: GameState, input: Input, dt: number): GameState {
  if (game.status === "levelup") {
    return makeGame(game.level + 1, game.score, game.coins, game.lives);
  }
  if (game.status !== "playing") return game;
  const lv = LEVELS[game.level - 1];
  const platforms = lv.platforms;
  const enemies = game.enemies.map((enemy) => ({ ...enemy }));
  const coinsList = game.coinsList.map((coin) => ({ ...coin }));
  const pickups = game.pickups.map((pickup) => ({ ...pickup }));
  let score = game.score;
  let coins = game.coins;
  let lives = game.lives;
  let checkpoint = game.checkpoint;
  let message = game.message;
  const player = game.player;

  const wasBottom = player.y + player.h;
  const axis = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const maxSpeed = input.run ? 410 : 285;

  if (axis !== 0) {
    player.vx = moveToward(player.vx, axis * maxSpeed, 2600 * dt);
    player.face = axis > 0 ? 1 : -1;
  } else {
    player.vx = moveToward(player.vx, 0, 3200 * dt);
  }

  if (input.jump) player.jumpBuffer = 0.13;
  player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.coyote = Math.max(0, player.coyote - dt);
  player.invincible = Math.max(0, player.invincible - dt);

  if (player.jumpBuffer > 0 && (player.ground || player.coyote > 0 || player.jumps < 2)) {
    player.vy = -880;
    player.ground = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    player.jumps += 1;
    message = player.jumps === 2 ? "Double jump!" : "Jump!";
    sfx.jump();
  }

  player.vy = clamp(player.vy + 2500 * dt, -1200, 980);

  player.x += player.vx * dt;
  for (const platform of platforms) {
    if (!overlaps(player, platform)) continue;
    if (player.vx > 0) player.x = platform.x - player.w;
    if (player.vx < 0) player.x = platform.x + platform.w;
    player.vx = 0;
  }

  player.y += player.vy * dt;
  player.ground = false;
  for (const platform of platforms) {
    if (!overlaps(player, platform)) continue;
    if (player.vy > 0) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.ground = true;
      player.coyote = 0.12;
      player.jumps = 0;
    } else if (player.vy < 0) {
      player.y = platform.y + platform.h;
      player.vy = 0;
    }
  }

  if (player.ground && Math.abs(player.vx) > 50) sfx.step();

  player.x = clamp(player.x, 0, lv.worldW - player.w);

  if (player.y > WORLD_H + 160) {
    return hurt({ ...game, player, enemies, coinsList, pickups, score, coins, lives, checkpoint });
  }

  for (const coin of coinsList) {
    if (coin.taken) continue;
    if (!overlaps(player, { x: coin.x - 14, y: coin.y - 14, w: 28, h: 28 })) continue;
    coin.taken = true;
    coins += 1;
    score += 100;
    message = "Coin!";
  }

  for (const pickup of pickups) {
    if (pickup.taken) continue;
    if (!overlaps(player, { x: pickup.x - 16, y: pickup.y - 16, w: 32, h: 32 })) continue;
    pickup.taken = true;
    if (pickup.kind === "star") {
      player.invincible = 7;
      score += 350;
      message = "Star power!";
    } else {
      lives += 1;
      score += 250;
      message = "Extra life!";
    }
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.vx * dt;
    if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) {
      enemy.vx *= -1;
      enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX - enemy.w);
    }
    if (!overlaps(player, enemy)) continue;

    const stomp = wasBottom <= enemy.y + 12 && player.vy > 0;
    if (stomp || player.invincible > 0) {
      enemy.alive = false;
      player.vy = -560;
      score += stomp ? 250 : 180;
      message = stomp ? "Stomp!" : "Invincible!";
    } else {
      return hurt({ ...game, player, enemies, coinsList, pickups, score, coins, lives, checkpoint });
    }
  }

  if (player.x > 1250) checkpoint = Math.max(checkpoint, 1250);
  if (player.x > 2900) checkpoint = Math.max(checkpoint, 2900);
  if (player.x > 4450) checkpoint = Math.max(checkpoint, 4450);

  score += Math.floor(Math.abs(player.vx) * dt * 0.08);
  const camera = clamp(player.x - 420, 0, lv.worldW - 960);

  if (player.x > lv.goalX) {
    if (game.level >= LEVELS.length) {
      return { ...game, player, camera, score: score + 1500 + lives * 300, coins, lives, checkpoint, enemies, coinsList, pickups, time: game.time + dt, status: "won", message: "You beat all levels!", levelTimer: 0 };
    }
    return { ...game, player, camera, score: score + 1000 + lives * 200, coins, lives, checkpoint, enemies, coinsList, pickups, time: game.time + dt, status: "levelup", message: `Level ${game.level + 1}: ${LEVELS[game.level].name}`, levelTimer: 0 };
  }

  return { ...game, player, camera, score, coins, lives, checkpoint, enemies, coinsList, pickups, time: game.time + dt, message, levelTimer: 0 };
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawGame(ctx: CanvasRenderingContext2D, game: GameState, width: number, height: number, dpr: number) {
  const scale = Math.min(width / 960, height / 720);
  const viewW = width / scale;
  const viewH = height / scale;
  const offsetY = (viewH - WORLD_H) * 0.5;
  const cam = clamp(game.camera, 0, LEVELS[game.level - 1].worldW - viewW);

  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.clearRect(0, 0, viewW, viewH);

  const sky = ctx.createLinearGradient(0, 0, 0, viewH);
  sky.addColorStop(0, "#7ed0ff");
  sky.addColorStop(0.55, "#bde9ff");
  sky.addColorStop(1, "#f8f0c5");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.translate(-cam, offsetY);

  drawBackdrop(ctx, cam, viewW);

  for (const platform of LEVELS[game.level - 1].platforms) drawPlatform(ctx, platform);
  for (const coin of game.coinsList) {
    if (!coin.taken) drawCoin(ctx, coin.x, coin.y, game.time);
  }
  for (const pickup of game.pickups) {
    if (!pickup.taken) drawPickup(ctx, pickup, game.time);
  }
  for (const enemy of game.enemies) {
    if (enemy.alive) drawEnemy(ctx, enemy, game.time);
  }

  drawGoal(ctx, LEVELS[game.level - 1].goalX);
  drawPlayer(ctx, game.player, game.time);
  ctx.restore();
}

function drawBackdrop(ctx: CanvasRenderingContext2D, cam: number, viewW: number) {
  ctx.fillStyle = "#fff7d6";
  ctx.beginPath();
  ctx.arc(cam + viewW - 110, 92, 44, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  for (let i = 0; i < 12; i += 1) {
    const x = 160 + i * 470;
    drawCloud(ctx, x, 95 + (i % 3) * 38);
  }

  ctx.fillStyle = "#4ebc73";
  for (let i = 0; i < 12; i += 1) {
    const x = i * 520 - 80;
    ctx.beginPath();
    ctx.moveTo(x, FLOOR_Y);
    ctx.quadraticCurveTo(x + 170, 430, x + 340, FLOOR_Y);
    ctx.fill();
  }

  ctx.fillStyle = "#376aa0";
  for (let i = 0; i < 8; i += 1) {
    const x = i * 760 + 280;
    ctx.beginPath();
    ctx.moveTo(x - 210, FLOOR_Y);
    ctx.lineTo(x, 330);
    ctx.lineTo(x + 250, FLOOR_Y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.arc(x, y + 18, 24, 0, Math.PI * 2);
  ctx.arc(x + 28, y, 32, 0, Math.PI * 2);
  ctx.arc(x + 66, y + 18, 26, 0, Math.PI * 2);
  ctx.rect(x - 2, y + 16, 72, 28);
  ctx.fill();
}

function drawPlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
  const top = platform.kind === "grass" ? "#55d979" : platform.kind === "pipe" ? "#2ed184" : platform.kind === "castle" ? "#cbd2dc" : "#e7a24a";
  const side = platform.kind === "grass" ? "#33884c" : platform.kind === "pipe" ? "#15744f" : platform.kind === "castle" ? "#798798" : "#9e5e32";

  ctx.fillStyle = side;
  drawRoundRect(ctx, platform.x, platform.y, platform.w, platform.h, 8);
  ctx.fill();

  ctx.fillStyle = top;
  drawRoundRect(ctx, platform.x, platform.y, platform.w, Math.min(28, platform.h), 8);
  ctx.fill();

  ctx.strokeStyle = "rgba(16,19,28,0.22)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const bob = Math.sin(time * 8 + x * 0.02) * 5;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "#ffcf42";
  ctx.strokeStyle = "#9d6515";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff3a4";
  ctx.fillRect(-3, -9, 6, 18);
  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup, time: number) {
  const bob = Math.sin(time * 6 + pickup.x * 0.01) * 5;
  ctx.save();
  ctx.translate(pickup.x, pickup.y + bob);
  if (pickup.kind === "star") {
    ctx.fillStyle = "#ffe35a";
    ctx.strokeStyle = "#8a6217";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const radius = i % 2 === 0 ? 18 : 8;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = "#e94d3c";
    ctx.beginPath();
    ctx.arc(-7, -5, 10, 0, Math.PI * 2);
    ctx.arc(7, -5, 10, 0, Math.PI * 2);
    ctx.lineTo(0, 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  const wobble = Math.sin(time * 9 + enemy.id) * 2;
  ctx.fillStyle = "#b4493d";
  ctx.strokeStyle = "#1b1d25";
  ctx.lineWidth = 3;
  drawRoundRect(ctx, enemy.x, enemy.y + wobble, enemy.w, enemy.h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(enemy.x + 10, enemy.y + 10 + wobble, 5, 0, Math.PI * 2);
  ctx.arc(enemy.x + 25, enemy.y + 10 + wobble, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.fillRect(enemy.x + 9, enemy.y + 9 + wobble, 3, 5);
  ctx.fillRect(enemy.x + 24, enemy.y + 9 + wobble, 3, 5);
}

function drawGoal(ctx: CanvasRenderingContext2D, goalX: number) {
  ctx.fillStyle = "#343843";
  ctx.fillRect(goalX + 75, 280, 12, 330);
  ctx.fillStyle = "#f6e36d";
  ctx.fillRect(goalX + 87, 308, 88, 48);
  ctx.fillStyle = "#263448";
  ctx.fillRect(goalX + 150, 492, 190, 118);
  ctx.fillStyle = "#d6dce6";
  ctx.fillRect(goalX + 170, 430, 52, 180);
  ctx.fillRect(goalX + 270, 430, 52, 180);
  ctx.fillStyle = "#151a24";
  ctx.fillRect(goalX + 220, 550, 50, 60);
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, time: number) {
  const flash = player.invincible > 0 && Math.floor(time * 18) % 2 === 0;
  const stride = player.ground ? Math.sin(time * 18) * Math.min(8, Math.abs(player.vx) / 40) : 0;

  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.scale(player.face, 1);
  ctx.translate(-player.w / 2, -player.h / 2);

  ctx.fillStyle = flash ? "#ffe35a" : "#e94d3c";
  drawRoundRect(ctx, 4, 0, 26, 15, 8);
  ctx.fill();

  ctx.fillStyle = "#ffd2a3";
  drawRoundRect(ctx, 8, 11, 20, 17, 8);
  ctx.fill();

  ctx.fillStyle = "#2e70d1";
  drawRoundRect(ctx, 6, 26, 24, 18, 6);
  ctx.fill();

  ctx.fillStyle = "#1d2530";
  drawRoundRect(ctx, 6, 42, 10, 9 + Math.max(0, stride), 4);
  ctx.fill();
  drawRoundRect(ctx, 20, 42, 10, 9 + Math.max(0, -stride), 4);
  ctx.fill();

  ctx.fillStyle = "#111";
  ctx.fillRect(23, 17, 3, 3);
  ctx.restore();
}

function formatTime(time: number) {
  const seconds = Math.floor(time);
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

class Sfx {
  private ctx: AudioContext | null = null;
  private bgmInterval: ReturnType<typeof setInterval> | null = null;
  private lastStep = 0;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  resume() {
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  private tone(type: OscillatorType, freq: number, endFreq: number, duration: number, gain: number, delay = 0) {
    const ctx = this.getCtx();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    gainNode.gain.setValueAtTime(gain, t);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  jump() {
    this.tone("sine", 300, 900, 0.15, 0.12);
  }

  step() {
    const now = performance.now();
    if (now - this.lastStep < 180) return;
    this.lastStep = now;
    this.tone("square", 80, 60, 0.04, 0.05);
  }

  hurt() {
    this.tone("sawtooth", 200, 80, 0.4, 0.08);
  }

  kill() {
    this.tone("square", 400, 60, 0.6, 0.1);
  }

  keyR() {
    this.tone("sine", 440, 660, 0.08, 0.08);
    this.tone("sine", 660, 880, 0.08, 0.06, 0.08);
  }

  keyP() {
    this.tone("sine", 523, 659, 0.12, 0.08);
  }

  startBgm() {
    if (this.bgmInterval) return;
    const ctx = this.getCtx();
    const notes = [523, 587, 659, 784, 659, 587, 523, 523];
    let i = 0;
    const play = () => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gn = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(notes[i % notes.length], t);
      gn.gain.setValueAtTime(0.03, t);
      gn.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gn);
      gn.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
      i++;
    };
    play();
    this.bgmInterval = setInterval(play, 200);
  }

  stopBgm() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

const sfx = new Sfx();

export default function CastleQuest() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(makeGame());
  const inputRef = useRef<Input>({ left: false, right: false, jump: false, run: false });
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const [hud, setHud] = useState(gameRef.current);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const loop = (now: number) => {
      const last = lastRef.current ?? now;
      const dt = Math.min(0.033, (now - last) / 1000);
      lastRef.current = now;

      gameRef.current = stepGame(gameRef.current, inputRef.current, dt);
      inputRef.current.jump = false;
      const dpr = window.devicePixelRatio || 1;
      drawGame(ctx, gameRef.current, window.innerWidth, window.innerHeight, dpr);
      setHud(gameRef.current);
      frameRef.current = window.requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      sfx.resume();
      sfx.startBgm();
      if (event.code === "ArrowLeft" || event.code === "KeyA") inputRef.current.left = true;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputRef.current.right = true;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") inputRef.current.run = true;
      if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        inputRef.current.jump = true;
      }
      if (event.code === "KeyP" || event.code === "Escape") {
        sfx.keyP();
        const next = gameRef.current.status === "paused" ? "playing" : "paused";
        if (gameRef.current.status === "playing" || gameRef.current.status === "paused") {
          gameRef.current = { ...gameRef.current, status: next, message: next === "paused" ? "Paused." : "Go!" };
        }
      }
      if (event.code === "KeyR") {
        sfx.keyR();
        resetGame();
      }
    };

    const up = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") inputRef.current.left = false;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputRef.current.right = false;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") inputRef.current.run = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const resetGame = () => {
    gameRef.current = makeGame();
    setHud(gameRef.current);
  };

  const setInput = (key: keyof Input, value: boolean) => {
    inputRef.current[key] = value;
  };

  const togglePause = () => {
    const current = gameRef.current;
    if (current.status !== "playing" && current.status !== "paused") return;
    const status: GameStatus = current.status === "paused" ? "playing" : "paused";
    gameRef.current = { ...current, status, message: status === "paused" ? "Paused." : "Go!" };
    setHud(gameRef.current);
  };

  const goalX = LEVELS[hud.level - 1]?.goalX ?? 5150;
  const progress = Math.min(100, Math.max(0, Math.round((hud.player.x / goalX) * 100)));
  const overlay = hud.status === "won" ? "You reached the castle." : hud.status === "lost" ? "Press R or restart." : hud.status === "paused" ? "Paused." : "";

  return (
    <main className="game" aria-label="Castle Quest platformer">
      <canvas ref={canvasRef} className="game__canvas" />

      <div className="hud">
        <div className="hud__cluster">
          <div className="hud__title">Castle Quest</div>
          <div className="hud__pill">Score {hud.score}</div>
          <div className="hud__pill">Coins {hud.coins}</div>
          <div className="hud__pill">Lives {hud.lives}</div>
        </div>
        <div className="hud__cluster">
          <div className="hud__pill">Time {formatTime(hud.time)}</div>
          <div className="hud__pill">{progress}%</div>
        </div>
      </div>

      <div className="pad">
        <button
          className="control"
          onPointerDown={() => setInput("left", true)}
          onPointerUp={() => setInput("left", false)}
          onPointerLeave={() => setInput("left", false)}
          onPointerCancel={() => setInput("left", false)}
          aria-label="Move left"
        >
          L
        </button>
        <button
          className="control"
          onPointerDown={() => setInput("right", true)}
          onPointerUp={() => setInput("right", false)}
          onPointerLeave={() => setInput("right", false)}
          onPointerCancel={() => setInput("right", false)}
          aria-label="Move right"
        >
          R
        </button>
      </div>

      <div className="jump-pad">
        <button
          className="control control--wide control--run"
          onPointerDown={() => setInput("run", true)}
          onPointerUp={() => setInput("run", false)}
          onPointerLeave={() => setInput("run", false)}
          onPointerCancel={() => setInput("run", false)}
          aria-label="Run"
        >
          RUN
        </button>
        <button
          className="control control--wide control--primary"
          onPointerDown={() => setInput("jump", true)}
          aria-label="Jump"
        >
          JUMP
        </button>
      </div>

      <div className="actions">
        <button className="control" onClick={togglePause} aria-label="Pause">
          P
        </button>
        <button className="control" onClick={resetGame} aria-label="Restart">
          R
        </button>
      </div>

      {overlay ? <div className="notice">{overlay}</div> : null}
    </main>
  );
}
