"use client";

import { useEffect, useMemo, useReducer } from "react";
import {
  applyMove,
  applyRotation,
  BOARD_DEPTH,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  canPlace,
  createBoard,
  ghostPiece,
  getModeTitle,
  hardDropDistance,
  lockPiece,
  resolveCells,
  spawnPiece,
  TICK_MS,
  type ActivePiece,
  type Board,
  type EffectParticle,
  type Mode,
  type SpecialType,
} from "@/lib/crystal-engine";

const MODES: Array<{
  id: Mode;
  title: string;
  subtitle: string;
}> = [
  {
    id: "story",
    title: "Story",
    subtitle: "50 cấp độ cứu công chúa",
  },
  {
    id: "endless",
    title: "Endless",
    subtitle: "Leo bảng xếp hạng vô hạn",
  },
  {
    id: "time-attack",
    title: "Time Attack",
    subtitle: "Hoàn thành mục tiêu trong giới hạn",
  },
  {
    id: "multiplayer",
    title: "Multiplayer",
    subtitle: "Khung online 2-4 người",
  },
];

const CHARACTERS = [
  {
    id: "lyra",
    name: "Lyra",
    role: "Crystal Knight",
    skill: "Giảm tốc độ rơi 1 lần mỗi 6 lượt",
  },
  {
    id: "orion",
    name: "Orion",
    role: "Shard Ranger",
    skill: "Tăng điểm combo từ khối cùng màu",
  },
  {
    id: "nova",
    name: "Nova",
    role: "Bloom Alchemist",
    skill: "Tăng tỷ lệ khối đặc biệt",
  },
  {
    id: "aero",
    name: "Aero",
    role: "Sky Architect",
    skill: "Xoay khối nhanh hơn với wall-kick",
  },
] as const;

const ACHIEVEMENTS = [
  {
    id: "first-layer",
    name: "First Spark",
    hint: "Hoàn thành 1 tầng",
  },
  {
    id: "combo-3",
    name: "Runebender",
    hint: "Đạt combo 3",
  },
  {
    id: "special-5",
    name: "Prism Collector",
    hint: "Kích hoạt 5 khối đặc biệt",
  },
  {
    id: "story-10",
    name: "Princess Trail",
    hint: "Mở khóa Story level 10",
  },
  {
    id: "score-5000",
    name: "Skyline",
    hint: "Đạt 5000 điểm",
  },
  {
    id: "daily",
    name: "Daily Bloom",
    hint: "Hoàn thành thử thách ngày",
  },
] as const;

const SPECIALS: Array<{ id: SpecialType; name: string; detail: string }> = [
  {
    id: "crystal",
    name: "Khối Pha Lê",
    detail: "Phá một hàng ngang/dọc trong tầng hiện tại.",
  },
  {
    id: "bomb",
    name: "Khối Bom",
    detail: "Nổ khu vực 3x3x3 xung quanh.",
  },
  {
    id: "ice",
    name: "Khối Băng",
    detail: "Đóng băng khối bên dưới trong 3 lượt.",
  },
  {
    id: "rainbow",
    name: "Khối Cầu Vồng",
    detail: "Tự đổi sang màu phù hợp nhất với cụm lân cận.",
  },
];

type GameStatus = "ready" | "playing" | "paused" | "gameover" | "victory";

type GameState = {
  mode: Mode;
  characterId: (typeof CHARACTERS)[number]["id"];
  board: Board;
  active: ActivePiece | null;
  status: GameStatus;
  score: number;
  level: number;
  clearedLayers: number;
  combo: number;
  specialUsed: number;
  timer: number;
  message: string;
  particles: EffectParticle[];
  fallClock: number;
  dailyChallenge: string;
  dailyTarget: number;
  dailyProgress: number;
  sessionTurns: number;
};

type Action =
  | { type: "SELECT_MODE"; mode: Mode }
  | { type: "SELECT_CHARACTER"; characterId: GameState["characterId"] }
  | { type: "NEW_GAME" }
  | { type: "MOVE"; dx: number; dz: number }
  | { type: "ROTATE"; direction: 1 | -1 }
  | { type: "DROP" }
  | { type: "TICK" }
  | { type: "TOGGLE_PAUSE" };

function getDailyChallenge() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate();
  const challenges = [
    "Clear 3 layers",
    "Trigger 2 special blocks",
    "Reach 1200 points",
    "Chain one color cluster",
  ];
  const target = 3 + (seed % 4);
  return {
    title: challenges[seed % challenges.length],
    target,
  };
}

function buildInitialState(mode: Mode): GameState {
  const board = createBoard();
  const challenge = getDailyChallenge();
  const spawn = spawnPiece(board, 1);

  return {
    mode,
    characterId: "lyra",
    board,
    active: spawn.piece,
    status: spawn.gameOver ? "gameover" : "ready",
    score: 0,
    level: 1,
    clearedLayers: 0,
    combo: 0,
    specialUsed: 0,
    timer: mode === "time-attack" ? 120 : 0,
    message:
      mode === "story"
        ? "Xây tháp pha lê để giải cứu công chúa."
        : "Chọn chế độ và bắt đầu xây tháp.",
    particles: [],
    fallClock: 0,
    dailyChallenge: challenge.title,
    dailyTarget: challenge.target,
    dailyProgress: 0,
    sessionTurns: 0,
  };
}

function gravityDelay(mode: Mode, level: number) {
  const base =
    mode === "time-attack" ? 540 : mode === "multiplayer" ? 620 : mode === "story" ? 680 : 720;
  return Math.max(140, base - (level - 1) * 22);
}

function advanceTurn(state: GameState, nextBoard: Board) {
  return {
    ...state,
    board: nextBoard,
    sessionTurns: state.sessionTurns + 1,
  };
}

function restartFromMode(state: GameState, mode = state.mode): GameState {
  const fresh = buildInitialState(mode);
  return {
    ...fresh,
    characterId: state.characterId,
    mode,
    status: "playing",
    message:
      mode === "story"
        ? "Nhiệm vụ: dựng 50 tầng pha lê và giải cứu công chúa."
        : mode === "time-attack"
          ? "Tốc độ tối đa. Hãy tích điểm thật nhanh."
          : mode === "multiplayer"
            ? "Khung multiplayer đang sẵn sàng cho backend realtime."
            : "Vào endless mode và đuổi theo điểm cao.",
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SELECT_MODE":
      return {
        ...buildInitialState(action.mode),
        mode: action.mode,
        characterId: state.characterId,
      };
    case "SELECT_CHARACTER":
      return {
        ...state,
        characterId: action.characterId,
      };
    case "NEW_GAME":
      return restartFromMode(state, state.mode);
    case "TOGGLE_PAUSE":
      if (state.status === "gameover" || state.status === "victory") {
        return state;
      }
      return {
        ...state,
        status: state.status === "paused" ? "playing" : "paused",
        message:
          state.status === "paused"
            ? "Tiếp tục cuộc phiêu lưu."
            : "Tạm dừng để quan sát tháp pha lê.",
      };
    case "MOVE": {
      if (state.status !== "playing" || !state.active) {
        return state;
      }

      const moved = applyMove(state.board, state.active, action.dx, action.dz);
      if (moved === state.active) {
        return state;
      }

      return {
        ...state,
        active: moved,
        fallClock: state.fallClock,
        sessionTurns: state.sessionTurns + 1,
      };
    }
    case "ROTATE": {
      if (state.status !== "playing" || !state.active) {
        return state;
      }

      const rotated = applyRotation(state.board, state.active, action.direction);
      if (rotated === state.active) {
        return state;
      }

      return {
        ...state,
        active: rotated,
        sessionTurns: state.sessionTurns + 1,
      };
    }
    case "DROP": {
      if (state.status !== "playing" || !state.active) {
        return state;
      }

      const ghost = ghostPiece(state.board, state.active);
      const dropDistance = hardDropDistance(state.board, state.active);
      if (ghost.anchor.y === state.active.anchor.y) {
        const resolved = lockPiece(state.board, ghost);
        const score = state.score + Math.round(resolved.scoreDelta * (1 + state.combo * 0.15));
        const clearedLayers = state.clearedLayers + resolved.clearedLayers;
        const specialUsed = state.specialUsed + resolved.specialCount;
        const combo = resolved.comboDelta > 0 ? state.combo + 1 : 0;
        const dailyProgress = state.dailyProgress + resolved.clearedLayers + Math.floor(resolved.clearedBlocks / 4);
        const level = Math.max(1, 1 + Math.floor(clearedLayers / 4) + Math.floor(score / 1500));
        const nextSpawn = spawnPiece(resolved.board, level);

        if (!nextSpawn.piece) {
          return {
            ...state,
            board: resolved.board,
            score,
            clearedLayers,
            specialUsed,
            combo,
            dailyProgress,
            status: "gameover",
            message: "Tháp đã chạm giới hạn. Game over.",
            particles: [...state.particles, ...resolved.effects],
            fallClock: 0,
            sessionTurns: state.sessionTurns + 1,
          };
        }

        return {
          ...state,
          board: resolved.board,
          active: nextSpawn.piece,
          score,
          level,
          clearedLayers,
          combo,
          specialUsed,
          dailyProgress,
          particles: [...state.particles, ...resolved.effects],
          fallClock: 0,
          message: "Piece locked at the landing point.",
          sessionTurns: state.sessionTurns + 1,
        };
      }

      const resolved = lockPiece(state.board, ghost);
      const score = state.score + Math.round(resolved.scoreDelta * (1 + state.combo * 0.15)) + dropDistance * 3;
      const clearedLayers = state.clearedLayers + resolved.clearedLayers;
      const specialUsed = state.specialUsed + resolved.specialCount;
      const combo = resolved.comboDelta > 0 ? state.combo + 1 : 0;
      const dailyProgress = state.dailyProgress + resolved.clearedLayers + Math.floor(resolved.clearedBlocks / 4);
      const level = Math.max(1, 1 + Math.floor(clearedLayers / 4) + Math.floor(score / 1500));
      const nextSpawn = spawnPiece(resolved.board, level);

      if (!nextSpawn.piece) {
        return {
          ...state,
          board: resolved.board,
          score,
          clearedLayers,
          specialUsed,
          combo,
          dailyProgress,
          status: "gameover",
          message: "Tháp đã chạm giới hạn. Game over.",
          particles: [...state.particles, ...resolved.effects],
          fallClock: 0,
          sessionTurns: state.sessionTurns + 1,
        };
      }

      return {
        ...state,
        board: resolved.board,
        active: nextSpawn.piece,
        score,
        level,
        clearedLayers,
        combo,
        specialUsed,
        dailyProgress,
        particles: [...state.particles, ...resolved.effects],
        fallClock: 0,
        message: `Hard drop +${Math.max(12, dropDistance * 3)}`,
        sessionTurns: state.sessionTurns + 1,
      };
    }
    case "TICK": {
      if (state.status !== "playing" || !state.active) {
        return state;
      }

      const timer =
        state.mode === "time-attack" ? Math.max(0, Number((state.timer - TICK_MS / 1000).toFixed(2))) : state.timer;
      if (state.mode === "time-attack" && timer <= 0) {
        return {
          ...state,
          timer: 0,
          status: "gameover",
          message: "Time Attack kết thúc. Hãy thử lại để tối ưu combo.",
        };
      }

      let nextActive = state.active;
      let nextBoard = state.board;
      let score = state.score;
      let clearedLayers = state.clearedLayers;
      let combo = state.combo;
      let specialUsed = state.specialUsed;
      let dailyProgress = state.dailyProgress;
      let message = state.message;
      let particles = state.particles
        .map((particle) => ({
          ...particle,
          life: Number((particle.life - 0.08).toFixed(2)),
        }))
        .filter((particle) => particle.life > 0);
      let sessionTurns = state.sessionTurns;

      const delay = gravityDelay(state.mode, state.level);
      const fallClock = state.fallClock + TICK_MS;

      if (fallClock < delay) {
        return {
          ...state,
          timer,
          fallClock,
          particles,
        };
      }

      let updatedClock = fallClock;
      let currentPiece = nextActive;

      while (updatedClock >= delay && currentPiece) {
        const fallCandidate = {
          ...currentPiece,
          anchor: { ...currentPiece.anchor, y: currentPiece.anchor.y - 1 },
        };

        if (fallCandidate.anchor.y >= 0 && canPlace(nextBoard, fallCandidate)) {
          currentPiece = fallCandidate;
          updatedClock -= delay;
          sessionTurns += 1;
          continue;
        }

        const resolved = lockPiece(nextBoard, currentPiece);
        nextBoard = resolved.board;
        score += Math.round(resolved.scoreDelta * (1 + combo * 0.2));
        clearedLayers += resolved.clearedLayers;
        specialUsed += resolved.specialCount;
        combo = resolved.comboDelta > 0 ? combo + 1 : 0;
        particles = [...particles, ...resolved.effects];
        dailyProgress += resolved.clearedLayers + Math.floor(resolved.clearedBlocks / 4);
        message =
          resolved.clearedLayers > 0
            ? `Cộng ${resolved.clearedLayers} tầng pha lê.`
            : resolved.clearedBlocks > 0
              ? `Chuỗi màu được cộng hưởng: ${resolved.clearedBlocks} khối biến mất.`
              : "Khối đã khóa vào tháp.";

        const level = Math.max(1, 1 + Math.floor(clearedLayers / 4) + Math.floor(score / 1500));
        const nextSpawn = spawnPiece(nextBoard, level);

        if (!nextSpawn.piece) {
          return {
            ...state,
            board: nextBoard,
            score,
            clearedLayers,
            combo,
            specialUsed,
            dailyProgress,
            timer,
            status: "gameover",
            message: "Tháp đã chạm giới hạn. Game over.",
            particles,
            fallClock: 0,
            sessionTurns: sessionTurns + 1,
          };
        }

        currentPiece = nextSpawn.piece;
        updatedClock -= delay;
        sessionTurns += 1;
        break;
      }

      const level = Math.max(1, 1 + Math.floor(clearedLayers / 4) + Math.floor(score / 1500));
      const status =
        state.mode === "story" && level >= 50
          ? "victory"
          : state.mode === "time-attack" && timer <= 0
            ? "gameover"
            : state.status;
      const finalMessage =
        status === "victory"
          ? "Chương cuối mở ra. Công chúa đã được giải cứu."
          : message;

      return {
        ...state,
        board: nextBoard,
        active: currentPiece,
        status,
        score,
        level,
        clearedLayers,
        combo,
        specialUsed,
        timer,
        message: finalMessage,
        particles,
        dailyProgress,
        fallClock: updatedClock,
        sessionTurns,
      };
    }
    default:
      return state;
  }
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const rest = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function projectCell(x: number, y: number, z: number) {
  const cellWidth = 36;
  const cellHeight = 20;
  const offsetX = 290;
  const offsetY = 116;
  return {
    left: offsetX + (x - z) * cellWidth * 0.92,
    top: offsetY + (x + z) * cellHeight * 0.56 - y * 18,
  };
}

function cubeClass(color: string, special?: SpecialType, ghost = false) {
  const base = special ? `cube cube--special cube--${special}` : `cube cube--${color}`;
  return ghost ? `${base} cube--ghost` : base;
}

function particleClass(color: string) {
  return `particle particle--${color}`;
}

export default function CrystalBlocksGame() {
  const [state, dispatch] = useReducer(reducer, undefined, () => buildInitialState("story"));

  useEffect(() => {
    if (state.status !== "playing") {
      return;
    }

    const timer = window.setInterval(() => {
      dispatch({ type: "TICK" });
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [state.status, state.mode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        dispatch({ type: "TOGGLE_PAUSE" });
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        dispatch({ type: "DROP" });
        return;
      }

      if (event.key === "r" || event.key === "R") {
        dispatch({ type: "NEW_GAME" });
        return;
      }

      if (state.status !== "playing") {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          event.preventDefault();
          dispatch({ type: "MOVE", dx: -1, dz: 0 });
          break;
        case "ArrowRight":
        case "d":
        case "D":
          event.preventDefault();
          dispatch({ type: "MOVE", dx: 1, dz: 0 });
          break;
        case "ArrowUp":
        case "w":
        case "W":
          event.preventDefault();
          dispatch({ type: "MOVE", dx: 0, dz: -1 });
          break;
        case "ArrowDown":
        case "s":
        case "S":
          event.preventDefault();
          dispatch({ type: "MOVE", dx: 0, dz: 1 });
          break;
        case "q":
        case "Q":
          event.preventDefault();
          dispatch({ type: "ROTATE", direction: -1 });
          break;
        case "e":
        case "E":
          event.preventDefault();
          dispatch({ type: "ROTATE", direction: 1 });
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.status]);

  const activeCells = useMemo(() => {
    if (!state.active) {
      return [];
    }
    const ghost = ghostPiece(state.board, state.active);
    return resolveCells(ghost);
  }, [state.active, state.board]);

  const boardCells = useMemo(() => {
    const list: Array<{
      x: number;
      y: number;
      z: number;
      color: string;
      special?: SpecialType;
      ghost?: boolean;
      freeze: number;
    }> = [];

    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      for (let z = 0; z < BOARD_DEPTH; z += 1) {
        for (let x = 0; x < BOARD_WIDTH; x += 1) {
          const cell = state.board[y][z][x];
          if (!cell) {
            continue;
          }
          list.push({
            x,
            y,
            z,
            color: cell.color,
            special: cell.special,
            freeze: cell.freeze,
          });
        }
      }
    }

    if (state.active) {
      const currentCells = resolveCells(state.active);
      for (const cell of currentCells) {
        list.push({
          ...cell,
          color: state.active.color,
          special: state.active.special,
          ghost: false,
          freeze: 0,
        });
      }
    }

    for (const cell of activeCells) {
      list.push({
        ...cell,
        color: state.active?.color ?? "azure",
        ghost: true,
        freeze: 0,
      });
    }

    return list;
  }, [activeCells, state.active, state.board]);

  const unlocked = useMemo(() => {
    return ACHIEVEMENTS.filter((achievement) => {
      if (achievement.id === "first-layer") {
        return state.clearedLayers > 0;
      }
      if (achievement.id === "combo-3") {
        return state.combo >= 3;
      }
      if (achievement.id === "special-5") {
        return state.specialUsed >= 5;
      }
      if (achievement.id === "story-10") {
        return state.mode === "story" && state.level >= 10;
      }
      if (achievement.id === "score-5000") {
        return state.score >= 5000;
      }
      if (achievement.id === "daily") {
        return state.dailyProgress >= state.dailyTarget;
      }
      return false;
    });
  }, [state.clearedLayers, state.combo, state.dailyProgress, state.dailyTarget, state.level, state.mode, state.score, state.specialUsed]);

  const character = CHARACTERS.find((item) => item.id === state.characterId) ?? CHARACTERS[0];
  const challengeCompleted = state.dailyProgress >= state.dailyTarget;

  return (
    <main className="game-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Crystal Blocks 3D</p>
          <h1>Low-poly puzzle, pha lê phát sáng, và tháp cứu công chúa.</h1>
          <p className="lead">
            Prototype Next.js cho một game block puzzle 3D phong cách rực rỡ, có
            hệ thống khối đặc biệt, tiến trình, achievement, và khung sẵn cho
            WebGL hoặc multiplayer realtime.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat-card stat-card--accent">
            <span>Mode</span>
            <strong>{getModeTitle(state.mode)}</strong>
          </div>
          <div className="stat-card">
            <span>Score</span>
            <strong>{state.score.toLocaleString("vi-VN")}</strong>
          </div>
          <div className="stat-card">
            <span>Level</span>
            <strong>{state.level}</strong>
          </div>
        </div>
      </section>

      <section className="control-strip">
        <div className="mode-switcher">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              className={`mode-pill ${state.mode === mode.id ? "is-active" : ""}`}
              onClick={() => dispatch({ type: "SELECT_MODE", mode: mode.id })}
            >
              <span>{mode.title}</span>
              <small>{mode.subtitle}</small>
            </button>
          ))}
        </div>

        <div className="action-row">
          <button className="primary-button" onClick={() => dispatch({ type: "NEW_GAME" })}>
            {state.status === "playing" ? "Restart run" : "Start run"}
          </button>
          <button className="secondary-button" onClick={() => dispatch({ type: "TOGGLE_PAUSE" })}>
            {state.status === "paused" ? "Resume" : "Pause"}
          </button>
          <button className="secondary-button" onClick={() => dispatch({ type: "DROP" })}>
            Hard drop
          </button>
        </div>
      </section>

      <section className="arena-grid">
        <aside className="sidebar-card">
          <h2>Hồ sơ phiêu lưu</h2>
          <div className="profile-card">
            <div className={`avatar avatar--${character.id}`}>
              <span>{character.name.slice(0, 1)}</span>
            </div>
            <div>
              <p className="profile-name">{character.name}</p>
              <p className="profile-role">{character.role}</p>
            </div>
          </div>
          <div className="character-list">
            {CHARACTERS.map((entry) => (
              <button
                key={entry.id}
                className={`character-chip ${state.characterId === entry.id ? "is-active" : ""}`}
                onClick={() => dispatch({ type: "SELECT_CHARACTER", characterId: entry.id })}
              >
                <strong>{entry.name}</strong>
                <span>{entry.role}</span>
              </button>
            ))}
          </div>
          <ul className="feature-list">
            <li>{character.skill}</li>
            <li>Story mode: 50 tầng với nhịp độ tăng dần.</li>
            <li>Time Attack: thắng bằng tốc độ và combo.</li>
            <li>Multiplayer: thiết kế UI sẵn cho online backend.</li>
          </ul>

          <div className="mini-panel">
            <p>Daily challenge</p>
            <strong>{state.dailyChallenge}</strong>
            <span>
              {state.dailyProgress}/{state.dailyTarget} progress
            </span>
            <div className="meter">
              <span
                style={{
                  width: `${Math.min(100, (state.dailyProgress / state.dailyTarget) * 100)}%`,
                }}
              />
            </div>
            {challengeCompleted ? (
              <small className="success-note">Daily reward unlocked.</small>
            ) : (
              <small className="hint-note">Nhận thưởng khi hoàn thành thử thách ngày.</small>
            )}
          </div>
        </aside>

        <section className="board-panel">
          <div className="board-header">
            <div>
              <p className="board-title">Crystal Tower</p>
              <p className="board-subtitle">{state.message}</p>
            </div>
            <div className="board-badges">
              <span>Combo x{Math.max(1, state.combo + 1)}</span>
              <span>{state.status === "playing" ? "Live" : state.status}</span>
              <span>Gravity {gravityDelay(state.mode, state.level)}ms</span>
            </div>
          </div>

          <div className="board-frame">
            <div className="board-surface">
              <div className="board-grid-grid" aria-hidden="true" />
              <div className="board-shadow" />
              <div className="board-cubes">
                {boardCells.map((cell) => {
                  const projected = projectCell(cell.x, cell.y, cell.z);
                  const hueClass = cell.special
                    ? `special-${cell.special}`
                    : cell.ghost
                      ? "ghost"
                      : cell.color;
                  return (
                    <div
                      key={`${cell.x}-${cell.y}-${cell.z}-${cell.ghost ? "g" : "b"}-${cell.special ?? "n"}`}
                      className={cubeClass(hueClass, cell.special, cell.ghost)}
                      style={{
                        left: `${projected.left}px`,
                        top: `${projected.top}px`,
                        zIndex: `${cell.x + cell.z + cell.y + (cell.ghost ? 0 : 100)}`,
                      }}
                    >
                      <span className="cube-core" />
                      {cell.freeze > 0 ? <span className="freeze-ring" /> : null}
                    </div>
                  );
                })}

                {state.particles.map((particle) => {
                  const projected = projectCell(particle.x, particle.y, particle.z);
                  return (
                    <span
                      key={particle.id}
                      className={particleClass(particle.color)}
                      style={{
                        left: `${projected.left}px`,
                        top: `${projected.top}px`,
                        opacity: Math.max(0, particle.life),
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="board-footer">
            <div>
              <span>Story progress</span>
            <strong>
                {state.mode === "story" ? `${Math.min(50, state.level)}/50` : "Sandbox"}
              </strong>
            </div>
            <div>
              <span>Time</span>
              <strong>{state.mode === "time-attack" ? formatTime(state.timer) : "∞"}</strong>
            </div>
            <div>
              <span>Session turns</span>
              <strong>{state.sessionTurns}</strong>
            </div>
          </div>
        </section>

        <aside className="sidebar-card">
          <h2>Khối đặc biệt</h2>
          <div className="special-stack">
            {SPECIALS.map((special) => (
              <article key={special.id} className={`special-card special-card--${special.id}`}>
                <h3>{special.name}</h3>
                <p>{special.detail}</p>
              </article>
            ))}
          </div>

          <div className="mini-panel">
            <p>Achievement</p>
            <div className="achievement-list">
              {ACHIEVEMENTS.map((achievement) => {
                const active = unlocked.some((item) => item.id === achievement.id);
                return (
                  <div key={achievement.id} className={`achievement ${active ? "is-unlocked" : ""}`}>
                    <strong>{achievement.name}</strong>
                    <span>{achievement.hint}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>

      <section className="footer-grid">
        <div className="mobile-controls">
          <button onClick={() => dispatch({ type: "MOVE", dx: -1, dz: 0 })}>Left</button>
          <button onClick={() => dispatch({ type: "MOVE", dx: 0, dz: -1 })}>Forward</button>
          <button onClick={() => dispatch({ type: "ROTATE", direction: -1 })}>Rotate</button>
          <button onClick={() => dispatch({ type: "MOVE", dx: 0, dz: 1 })}>Back</button>
          <button onClick={() => dispatch({ type: "MOVE", dx: 1, dz: 0 })}>Right</button>
          <button onClick={() => dispatch({ type: "DROP" })}>Drop</button>
        </div>

        <div className="hint-bar">
          <span>Keyboard</span>
          <strong>WASD / Arrows move, Q/E rotate, Space drop, Enter pause, R restart</strong>
        </div>
      </section>
    </main>
  );
}
