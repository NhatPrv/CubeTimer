import { create } from 'zustand'
import type { PuzzleId } from './puzzles'

type SessionSelection = {
  puzzleId: PuzzleId
  selectedSessions: Partial<Record<PuzzleId, string>>
  selectPuzzle: (puzzleId: PuzzleId) => void
  selectSession: (puzzleId: PuzzleId, sessionId: string) => void
}

export const useSessionSelection = create<SessionSelection>((set) => ({
  puzzleId: '333',
  selectedSessions: {},
  selectPuzzle: (puzzleId) => set({ puzzleId }),
  selectSession: (puzzleId, sessionId) => set((state) => ({
    selectedSessions: { ...state.selectedSessions, [puzzleId]: sessionId },
  })),
}))
