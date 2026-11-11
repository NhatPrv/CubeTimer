import type { PuzzleId } from './puzzles'

export type SessionScope = {
  puzzleId: PuzzleId
  sessionId: string
}

export type Session = {
  id: string
  puzzleId: PuzzleId
  name: string
  createdAtMs: number
}

export type Scramble = {
  eventId: string
  notation: string
  source: 'cubing.js'
}

export type Penalty = 'none' | 'plus2' | 'dnf'

export type Solve = SessionScope & {
  id: string
  elapsedMs: number
  finishedAtMs: number
  penalty: Penalty
  scramble: Scramble | null
}
