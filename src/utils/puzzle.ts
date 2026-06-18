import type { Operator, Tile, InputState, Step } from '../types';

// Generate a puzzle guaranteed to have at least one solution
export function generatePuzzle(): { numbers: number[]; target: number; solution: string } {
  for (;;) {
    const numbers = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1);
    const target = Math.floor(Math.random() * 90) + 10; // 10-99
    const sol = findSolution(numbers, target);
    if (sol) return { numbers, target, solution: sol };
  }
}

type Tree =
  | { type: 'num'; val: number; idx: number }
  | { type: 'op'; op: Operator; left: Tree; right: Tree };

function evalTree(t: Tree): number | null {
  if (t.type === 'num') return t.val;
  const l = evalTree(t.left);
  const r = evalTree(t.right);
  if (l === null || r === null) return null;
  if (t.op === '+') return l + r;
  if (t.op === '-') return l - r;
  if (t.op === '×') return l * r;
  if (t.op === '÷') {
    if (r === 0) return null;
    const res = l / r;
    return Number.isInteger(res) ? res : null;
  }
  return null;
}

function precedence(op: Operator): number {
  return op === '+' || op === '-' ? 1 : 2;
}

function treeToString(t: Tree): string {
  if (t.type === 'num') return String(t.val);
  const l = treeToString(t.left);
  const r = treeToString(t.right);

  // Left child needs parens when its precedence is lower than parent
  const needParenLeft = t.left.type === 'op' && precedence(t.left.op) < precedence(t.op);

  // Right child needs parens when:
  // - its precedence is lower than parent, OR
  // - same precedence but parent is - or ÷ (right-associativity would change the result)
  const needParenRight =
    t.right.type === 'op' &&
    (precedence(t.right.op) < precedence(t.op) ||
      (precedence(t.right.op) === precedence(t.op) && (t.op === '-' || t.op === '÷')));

  const ls = needParenLeft ? `(${l})` : l;
  const rs = needParenRight ? `(${r})` : r;
  return `${ls}${t.op}${rs}`;
}

const OPS: Operator[] = ['+', '-', '×', '÷'];

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) {
      result.push([arr[i], ...p]);
    }
  }
  return result;
}

function buildAllTrees(nums: Array<{ val: number; idx: number }>): Tree[] {
  if (nums.length === 1) {
    return [{ type: 'num', val: nums[0].val, idx: nums[0].idx }];
  }
  const trees: Tree[] = [];
  for (let split = 1; split < nums.length; split++) {
    const leftNums = nums.slice(0, split);
    const rightNums = nums.slice(split);
    for (const leftTree of buildAllTrees(leftNums)) {
      for (const rightTree of buildAllTrees(rightNums)) {
        for (const op of OPS) {
          trees.push({ type: 'op', op, left: leftTree, right: rightTree });
        }
      }
    }
  }
  return trees;
}

export function findSolution(numbers: number[], target: number): string | null {
  const items = numbers.map((val, idx) => ({ val, idx }));
  for (const perm of permutations(items)) {
    for (const tree of buildAllTrees(perm)) {
      const val = evalTree(tree);
      if (val === target) {
        return treeToString(tree);
      }
    }
  }
  return null;
}

// Apply one operation to two tiles, returning the resulting tile
let nextTileId = 1000;
export function applyOp(left: Tile, op: Operator, right: Tile): Tile | null {
  let val: number;
  if (op === '+') val = left.value + right.value;
  else if (op === '-') val = left.value - right.value;
  else if (op === '×') val = left.value * right.value;
  else {
    if (right.value === 0) return null;
    const r = left.value / right.value;
    if (!Number.isInteger(r)) return null;
    val = r;
  }
  return { id: nextTileId++, value: val, label: String(val) };
}

// Build initial InputState from a set of numbers
export function buildInitialInputState(numbers: number[]): InputState {
  const tiles: Tile[] = numbers.map((n, i) => ({ id: i, value: n, label: String(n) }));
  return { tiles, selectedFirst: null, selectedOp: null, steps: [] };
}

// CPU solver with brute force - returns solution string after `delayMs`
export async function cpuSolve(numbers: number[], target: number, delayMs: number): Promise<string | null> {
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  return findSolution(numbers, target);
}

// Evaluate the final single tile against target
export function isSolved(state: InputState, target: number): boolean {
  return state.tiles.length === 1 && state.tiles[0].value === target;
}

// Perform one step: combine selectedFirst op secondTile → new tile replaces both
export function performStep(state: InputState, secondTile: Tile): { newState: InputState; step: Step } | null {
  if (!state.selectedFirst || !state.selectedOp) return null;
  const result = applyOp(state.selectedFirst, state.selectedOp, secondTile);
  if (result === null) return null;

  const step: Step = {
    leftTile: state.selectedFirst,
    op: state.selectedOp,
    rightTile: secondTile,
    result,
  };

  const newTiles = state.tiles
    .filter((t) => t.id !== state.selectedFirst!.id && t.id !== secondTile.id)
    .concat(result);

  return {
    newState: {
      tiles: newTiles,
      selectedFirst: null,
      selectedOp: null,
      steps: [...state.steps, step],
    },
    step,
  };
}

// Undo last step
export function undoStep(state: InputState): InputState {
  if (state.steps.length === 0) {
    // Just clear selection
    if (state.selectedFirst || state.selectedOp) {
      return { ...state, selectedFirst: null, selectedOp: null };
    }
    return state;
  }
  const lastStep = state.steps[state.steps.length - 1];
  const newTiles = state.tiles
    .filter((t) => t.id !== lastStep.result.id)
    .concat([lastStep.leftTile, lastStep.rightTile]);
  return {
    tiles: newTiles,
    selectedFirst: null,
    selectedOp: null,
    steps: state.steps.slice(0, -1),
  };
}

// Reset to initial state
export function resetInputState(numbers: number[]): InputState {
  return buildInitialInputState(numbers);
}
