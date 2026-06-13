export const BOARD_WIDTH = 8;
export const BOARD_DEPTH = 8;
export const BOARD_HEIGHT = 18;

export const TICK_MS = 160;

export const PALETTE = [
  "azure",
  "violet",
  "sun",
  "mint",
  "rose",
  "amber",
] as const;

export type Mode = "story" | "endless" | "time-attack" | "multiplayer";
export type CellColor = (typeof PALETTE)[number];
export type SpecialType = "crystal" | "bomb" | "ice" | "rainbow";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface BoardCell {
  color: CellColor;
  special?: SpecialType;
  freeze: number;
}

export type Board = Array<Array<Array<BoardCell | null>>>;

export interface ShapeTemplate {
  name: string;
  cells: Vec3[];
}

export interface ActivePiece {
  name: string;
  cells: Vec3[];
  anchor: Vec3;
  color: CellColor;
  special?: SpecialType;
}

export interface EffectParticle {
  id: string;
  x: number;
  y: number;
  z: number;
  color: CellColor;
  life: number;
}

export interface SpawnResult {
  piece: ActivePiece | null;
  gameOver: boolean;
}

export interface ResolveResult {
  board: Board;
  scoreDelta: number;
  clearedLayers: number;
  clearedBlocks: number;
  comboDelta: number;
  specialCount: number;
  effects: EffectParticle[];
}

const SHAPES: ShapeTemplate[] = [
  {
    name: "Astra",
    cells: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
    ],
  },
  {
    name: "Helix",
    cells: [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 1, z: 1 },
    ],
  },
  {
    name: "Crown",
    cells: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 1, z: 0 },
    ],
  },
  {
    name: "Shard",
    cells: [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 1, z: 1 },
      { x: 1, y: 1, z: 1 },
    ],
  },
  {
    name: "Bloom",
    cells: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 0, z: 1 },
      { x: 2, y: 0, z: 1 },
    ],
  },
  {
    name: "Prism",
    cells: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 },
    ],
  },
];

export const COLOR_CLASSES: Record<CellColor, string> = {
  azure: "#42c5ff",
  violet: "#9f7bff",
  sun: "#ffd166",
  mint: "#5cf2c2",
  rose: "#ff7bb5",
  amber: "#ff9f43",
};

export function createBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_DEPTH }, () =>
      Array.from({ length: BOARD_WIDTH }, () => null),
    ),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((layer) =>
    layer.map((row) =>
      row.map((cell) => (cell ? { ...cell } : null)),
    ),
  );
}

export function normalizeCells(cells: Vec3[]): Vec3[] {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const minZ = Math.min(...cells.map((cell) => cell.z));
  return cells.map((cell) => ({
    x: cell.x - minX,
    y: cell.y - minY,
    z: cell.z - minZ,
  }));
}

export function getShapeBounds(cells: Vec3[]) {
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const maxY = Math.max(...cells.map((cell) => cell.y));
  const maxZ = Math.max(...cells.map((cell) => cell.z));
  return {
    width: maxX + 1,
    height: maxY + 1,
    depth: maxZ + 1,
  };
}

export function rotateCellsY(cells: Vec3[], direction: 1 | -1): Vec3[] {
  const rotated = cells.map((cell) => {
    if (direction === 1) {
      return { x: cell.z, y: cell.y, z: -cell.x };
    }
    return { x: -cell.z, y: cell.y, z: cell.x };
  });
  return normalizeCells(rotated);
}

export function getRandomColor(excludeRainbow = false): CellColor {
  const pool = excludeRainbow ? PALETTE : PALETTE;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRandomSpecial(level: number): SpecialType | undefined {
  const roll = Math.random();
  const chance = Math.min(0.26, 0.08 + level * 0.01);
  if (roll > chance) {
    return undefined;
  }

  const specialPool: SpecialType[] = ["crystal", "bomb", "ice", "rainbow"];
  return specialPool[Math.floor(Math.random() * specialPool.length)];
}

export function makeActivePiece(level: number): ActivePiece {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const cells = normalizeCells(shape.cells);
  const special = getRandomSpecial(level);
  const color = special === "rainbow" ? getRandomColor(true) : getRandomColor();

  return {
    name: shape.name,
    cells,
    anchor: { x: 0, y: 0, z: 0 },
    color,
    special,
  };
}

export function getSpawnAnchor(piece: ActivePiece) {
  const bounds = getShapeBounds(piece.cells);
  return {
    x: Math.floor((BOARD_WIDTH - bounds.width) / 2),
    z: Math.floor((BOARD_DEPTH - bounds.depth) / 2),
    y: BOARD_HEIGHT - bounds.height,
  };
}

export function resolveCells(piece: ActivePiece, anchor = piece.anchor): Vec3[] {
  return piece.cells.map((cell) => ({
    x: anchor.x + cell.x,
    y: anchor.y + cell.y,
    z: anchor.z + cell.z,
  }));
}

export function canPlace(board: Board, piece: ActivePiece, anchor = piece.anchor) {
  return resolveCells(piece, anchor).every((cell) => {
    if (
      cell.x < 0 ||
      cell.x >= BOARD_WIDTH ||
      cell.z < 0 ||
      cell.z >= BOARD_DEPTH ||
      cell.y < 0 ||
      cell.y >= BOARD_HEIGHT
    ) {
      return false;
    }

    return board[cell.y][cell.z][cell.x] === null;
  });
}

export function spawnPiece(board: Board, level: number): SpawnResult {
  const piece = makeActivePiece(level);
  const anchor = getSpawnAnchor(piece);
  const spawned: ActivePiece = {
    ...piece,
    anchor,
  };

  if (!canPlace(board, spawned, anchor)) {
    return { piece: null, gameOver: true };
  }

  return { piece: spawned, gameOver: false };
}

export function movePiece(piece: ActivePiece, dx: number, dz: number): ActivePiece {
  return {
    ...piece,
    anchor: {
      ...piece.anchor,
      x: piece.anchor.x + dx,
      z: piece.anchor.z + dz,
    },
  };
}

export function lowerPiece(piece: ActivePiece): ActivePiece {
  return {
    ...piece,
    anchor: {
      ...piece.anchor,
      y: piece.anchor.y - 1,
    },
  };
}

export function rotatePiece(piece: ActivePiece, direction: 1 | -1): ActivePiece {
  return {
    ...piece,
    cells: rotateCellsY(piece.cells, direction),
  };
}

export function hardDropDistance(board: Board, piece: ActivePiece): number {
  let distance = 0;
  let probe = piece;

  while (canPlace(board, lowerPiece(probe))) {
    probe = lowerPiece(probe);
    distance += 1;
  }

  return distance;
}

function cellKey(x: number, y: number, z: number) {
  return `${x}:${y}:${z}`;
}

function neighborsOf(cell: Vec3): Vec3[] {
  return [
    { x: cell.x + 1, y: cell.y, z: cell.z },
    { x: cell.x - 1, y: cell.y, z: cell.z },
    { x: cell.x, y: cell.y + 1, z: cell.z },
    { x: cell.x, y: cell.y - 1, z: cell.z },
    { x: cell.x, y: cell.y, z: cell.z + 1 },
    { x: cell.x, y: cell.y, z: cell.z - 1 },
  ];
}

function resolveRainbowColor(board: Board, x: number, y: number, z: number): CellColor {
  const counts = new Map<CellColor, number>();

  for (const neighbor of neighborsOf({ x, y, z })) {
    if (
      neighbor.x < 0 ||
      neighbor.x >= BOARD_WIDTH ||
      neighbor.y < 0 ||
      neighbor.y >= BOARD_HEIGHT ||
      neighbor.z < 0 ||
      neighbor.z >= BOARD_DEPTH
    ) {
      continue;
    }

    const cell = board[neighbor.y][neighbor.z][neighbor.x];
    if (!cell) {
      continue;
    }

    counts.set(cell.color, (counts.get(cell.color) ?? 0) + 1);
  }

  let bestColor = getRandomColor(true);
  let bestCount = -1;

  counts.forEach((count, color) => {
    if (count > bestCount) {
      bestCount = count;
      bestColor = color;
    }
  });

  return bestColor;
}

function clearCell(board: Board, x: number, y: number, z: number) {
  if (
    x < 0 ||
    x >= BOARD_WIDTH ||
    y < 0 ||
    y >= BOARD_HEIGHT ||
    z < 0 ||
    z >= BOARD_DEPTH
  ) {
    return;
  }

  board[y][z][x] = null;
}

function clearSphere(board: Board, center: Vec3, radius: number) {
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let z = center.z - radius; z <= center.z + radius; z += 1) {
      for (let x = center.x - radius; x <= center.x + radius; x += 1) {
        const dist = Math.abs(x - center.x) + Math.abs(y - center.y) + Math.abs(z - center.z);
        if (dist <= radius + 1) {
          clearCell(board, x, y, z);
        }
      }
    }
  }
}

function collectParticles(
  cells: Vec3[],
  color: CellColor,
  life = 1,
): EffectParticle[] {
  return cells.map((cell, index) => ({
    id: `${cellKey(cell.x, cell.y, cell.z)}:${index}:${Math.random().toString(36).slice(2, 7)}`,
    x: cell.x,
    y: cell.y,
    z: cell.z,
    color,
    life,
  }));
}

function clearLayer(board: Board, y: number) {
  for (let z = 0; z < BOARD_DEPTH; z += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      board[y][z][x] = null;
    }
  }
}

function applyGravityCompression(board: Board) {
  const compact: Board = createBoard();
  let writeY = 0;

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    const isEmptyLayer = board[y].every((row) => row.every((cell) => cell === null));
    if (isEmptyLayer) {
      continue;
    }

    compact[writeY] = board[y].map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    writeY += 1;
  }

  return compact;
}

function getFilledLayers(board: Board) {
  const layers: number[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    const full = board[y].every((row) => row.every((cell) => cell !== null));
    if (full) {
      layers.push(y);
    }
  }

  return layers;
}

function getConnectedGroups(board: Board) {
  const visited = new Set<string>();
  const groups: Vec3[][] = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let z = 0; z < BOARD_DEPTH; z += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const key = cellKey(x, y, z);
        const cell = board[y][z][x];

        if (!cell || visited.has(key) || cell.freeze > 0) {
          continue;
        }

        const queue: Vec3[] = [{ x, y, z }];
        const group: Vec3[] = [];
        visited.add(key);

        while (queue.length > 0) {
          const current = queue.shift()!;
          group.push(current);

          for (const neighbor of neighborsOf(current)) {
            const neighborKey = cellKey(neighbor.x, neighbor.y, neighbor.z);
            if (
              neighbor.x < 0 ||
              neighbor.x >= BOARD_WIDTH ||
              neighbor.y < 0 ||
              neighbor.y >= BOARD_HEIGHT ||
              neighbor.z < 0 ||
              neighbor.z >= BOARD_DEPTH ||
              visited.has(neighborKey)
            ) {
              continue;
            }

            const nextCell = board[neighbor.y][neighbor.z][neighbor.x];
            if (!nextCell || nextCell.freeze > 0 || nextCell.color !== cell.color) {
              continue;
            }

            visited.add(neighborKey);
            queue.push(neighbor);
          }
        }

        groups.push(group);
      }
    }
  }

  return groups;
}

function decayFrozenCells(board: Board) {
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let z = 0; z < BOARD_DEPTH; z += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const cell = board[y][z][x];
        if (!cell) {
          continue;
        }

        cell.freeze = Math.max(0, cell.freeze - 1);
      }
    }
  }
}

export function lockPiece(board: Board, piece: ActivePiece): ResolveResult {
  const nextBoard = cloneBoard(board);
  const occupied = resolveCells(piece);

  let specialCount = 0;
  for (const cell of occupied) {
    const special = cell === occupied[0] ? piece.special : undefined;
    nextBoard[cell.y][cell.z][cell.x] = {
      color: piece.special === "rainbow" ? piece.color : piece.color,
      special,
      freeze: 0,
    };
  }

  const effectParticles: EffectParticle[] = [];
  let scoreDelta = 0;

  for (const cell of occupied) {
    const lockedCell = nextBoard[cell.y][cell.z][cell.x];
    if (!lockedCell?.special) {
      continue;
    }

    specialCount += 1;
    if (lockedCell.special === "crystal") {
      const rowTargets: Vec3[] = [];
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        rowTargets.push({ x, y: cell.y, z: cell.z });
        clearCell(nextBoard, x, cell.y, cell.z);
      }
      for (let z = 0; z < BOARD_DEPTH; z += 1) {
        rowTargets.push({ x: cell.x, y: cell.y, z });
        clearCell(nextBoard, cell.x, cell.y, z);
      }
      effectParticles.push(...collectParticles(rowTargets, piece.color, 1.1));
      scoreDelta += 120;
    }

    if (lockedCell.special === "bomb") {
      const blastTargets: Vec3[] = [];
      for (let y = cell.y - 1; y <= cell.y + 1; y += 1) {
        for (let z = cell.z - 1; z <= cell.z + 1; z += 1) {
          for (let x = cell.x - 1; x <= cell.x + 1; x += 1) {
            const target = { x, y, z };
            blastTargets.push(target);
            clearCell(nextBoard, x, y, z);
          }
        }
      }
      effectParticles.push(...collectParticles(blastTargets, piece.color, 1.2));
      scoreDelta += 90;
    }

    if (lockedCell.special === "ice") {
      if (cell.y > 0) {
        const below = nextBoard[cell.y - 1][cell.z][cell.x];
        if (below) {
          below.freeze = Math.max(3, below.freeze);
        }
      }
      scoreDelta += 45;
    }

    if (lockedCell.special === "rainbow") {
      const resolved = resolveRainbowColor(nextBoard, cell.x, cell.y, cell.z);
      const current = nextBoard[cell.y][cell.z][cell.x];
      if (current) {
        current.color = resolved;
      }
      scoreDelta += 55;
    }

    const afterSpecial = nextBoard[cell.y]?.[cell.z]?.[cell.x];
    if (afterSpecial) {
      afterSpecial.special = undefined;
    }
  }

  let clearedLayers = 0;
  const filledLayers = getFilledLayers(nextBoard);
  if (filledLayers.length > 0) {
    clearedLayers = filledLayers.length;
    for (const layer of filledLayers) {
      const layerCells: Vec3[] = [];
      for (let z = 0; z < BOARD_DEPTH; z += 1) {
        for (let x = 0; x < BOARD_WIDTH; x += 1) {
          layerCells.push({ x, y: layer, z });
        }
      }
      effectParticles.push(...collectParticles(layerCells, "sun", 1.4));
      scoreDelta += 150;
      clearLayer(nextBoard, layer);
    }
  }

  const compacted = applyGravityCompression(nextBoard);
  const groups = getConnectedGroups(compacted);
  let clearedBlocks = 0;

  for (const group of groups) {
    if (group.length < 4) {
      continue;
    }

    const groupColor = compacted[group[0].y][group[0].z][group[0].x]?.color ?? "azure";
    effectParticles.push(...collectParticles(group, groupColor, 0.9));
    clearedBlocks += group.length;
    scoreDelta += group.length * 20;

    for (const cell of group) {
      clearCell(compacted, cell.x, cell.y, cell.z);
    }
  }

  const normalized = applyGravityCompression(compacted);
  decayFrozenCells(normalized);

  return {
    board: normalized,
    scoreDelta,
    clearedLayers,
    clearedBlocks,
    comboDelta: clearedLayers > 0 || clearedBlocks > 0 ? 1 : 0,
    specialCount,
    effects: effectParticles,
  };
}

export function applyMove(board: Board, piece: ActivePiece, dx: number, dz: number) {
  const candidate = movePiece(piece, dx, dz);
  if (canPlace(board, candidate)) {
    return candidate;
  }

  return piece;
}

export function applyRotation(board: Board, piece: ActivePiece, direction: 1 | -1) {
  const rotated = rotatePiece(piece, direction);
  const kicks = [
    { x: 0, z: 0 },
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 },
    { x: 2, z: 0 },
    { x: -2, z: 0 },
  ];

  for (const kick of kicks) {
    const candidate: ActivePiece = {
      ...rotated,
      anchor: {
        ...rotated.anchor,
        x: rotated.anchor.x + kick.x,
        z: rotated.anchor.z + kick.z,
      },
    };

    if (canPlace(board, candidate)) {
      return candidate;
    }
  }

  return piece;
}

export function ghostPiece(board: Board, piece: ActivePiece) {
  let probe = piece;
  while (canPlace(board, lowerPiece(probe))) {
    probe = lowerPiece(probe);
  }
  return probe;
}

export function getModeTitle(mode: Mode) {
  switch (mode) {
    case "story":
      return "Story Mode";
    case "endless":
      return "Endless Mode";
    case "time-attack":
      return "Time Attack";
    case "multiplayer":
      return "Multiplayer";
    default:
      return mode;
  }
}
