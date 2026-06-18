export type Operator = '+' | '-' | '×' | '÷';

export interface RoundResult {
  timeSeconds: number | null;
  solved: boolean;
}

// A tile on the board — either an original number or an intermediate result
export interface Tile {
  id: number;       // unique id
  value: number;
  // label shown to user (e.g. "(2+4)" for intermediate results)
  label: string;
}

// One completed operation step: two tiles combined with an operator → new tile
export interface Step {
  leftTile: Tile;
  op: Operator;
  rightTile: Tile;
  result: Tile;
}

// State of the input panel for one round
export interface InputState {
  // Tiles currently on the board (start with 4, reduces by 1 each step)
  tiles: Tile[];
  // First tile selected for current operation (null if none selected yet)
  selectedFirst: Tile | null;
  // Operator selected for current operation (null if none selected yet)
  selectedOp: Operator | null;
  // History of steps (for undo)
  steps: Step[];
}
