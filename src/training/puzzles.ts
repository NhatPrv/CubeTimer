export const puzzles = {
  '222': { label: '2×2', wcaEventId: '222', twistyPuzzleId: '2x2x2' },
  '333': { label: '3×3', wcaEventId: '333', twistyPuzzleId: '3x3x3' },
  '444': { label: '4×4', wcaEventId: '444', twistyPuzzleId: '4x4x4' },
  '555': { label: '5×5', wcaEventId: '555', twistyPuzzleId: '5x5x5' },
  '666': { label: '6×6', wcaEventId: '666', twistyPuzzleId: '6x6x6' },
  '777': { label: '7×7', wcaEventId: '777', twistyPuzzleId: '7x7x7' },
  minx: { label: 'Megaminx', wcaEventId: 'minx', twistyPuzzleId: 'megaminx' },
  pyram: { label: 'Pyraminx', wcaEventId: 'pyram', twistyPuzzleId: 'pyraminx' },
  skewb: { label: 'Skewb', wcaEventId: 'skewb', twistyPuzzleId: 'skewb' },
  sq1: { label: 'Square-1', wcaEventId: 'sq1', twistyPuzzleId: 'square1' },
  clock: { label: 'Clock', wcaEventId: 'clock', twistyPuzzleId: 'clock' },
} as const

export type PuzzleId = keyof typeof puzzles

export function isPuzzleId(id: string): id is PuzzleId {
  return Object.hasOwn(puzzles, id)
}
