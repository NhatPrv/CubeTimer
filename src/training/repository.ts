import { TrainingDatabase } from './database'
import { isPuzzleId, puzzles, type PuzzleId } from './puzzles'
import type { Penalty, Session, SessionScope, Solve } from './records'

export const maxSessionNameLength = 80

function checkPuzzle(puzzleId: PuzzleId) {
  if (!isPuzzleId(puzzleId)) throw new Error('Loại cube không hợp lệ.')
}

function normalizeName(name: string) {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > maxSessionNameLength) {
    throw new Error('Tên phiên cần có từ 1 đến 80 ký tự.')
  }
  return trimmed
}

function checkPenalty(penalty: Penalty) {
  if (penalty !== 'none' && penalty !== 'plus2' && penalty !== 'dnf') {
    throw new Error('Mức phạt không hợp lệ.')
  }
}

function checkSolve(solve: Solve) {
  checkPuzzle(solve.puzzleId)
  checkPenalty(solve.penalty)
  if (!solve.id || !Number.isSafeInteger(solve.elapsedMs) || solve.elapsedMs < 1 ||
      !Number.isSafeInteger(solve.finishedAtMs) || solve.finishedAtMs < 0) {
    throw new Error('Thông tin thời gian của lượt giải không hợp lệ.')
  }
  const scramble = solve.scramble
  if (scramble !== null && (scramble.source !== 'cubing.js' ||
      scramble.eventId !== puzzles[solve.puzzleId].wcaEventId || !scramble.notation.trim())) {
    throw new Error('Scramble không khớp với loại cube.')
  }
}

function isSameSolve(a: Solve, b: Solve) {
  return a.puzzleId === b.puzzleId && a.sessionId === b.sessionId &&
    a.elapsedMs === b.elapsedMs && a.finishedAtMs === b.finishedAtMs &&
    a.penalty === b.penalty &&
    a.scramble?.eventId === b.scramble?.eventId &&
    a.scramble?.notation === b.scramble?.notation && a.scramble?.source === b.scramble?.source
}

export function createTrainingRepository(db: TrainingDatabase) {
  async function requireSession({ puzzleId, sessionId }: SessionScope) {
    const session = await db.sessions.get(sessionId)
    if (!session || session.puzzleId !== puzzleId) {
      throw new Error('Phiên luyện tập không thuộc loại cube đang chọn.')
    }
    return session
  }

  function scopedSolves({ puzzleId, sessionId }: SessionScope) {
    checkPuzzle(puzzleId)
    // Compound keys compare lexicographically. An array sorts after any numeric timestamp.
    return db.solves.where('[puzzleId+sessionId+finishedAtMs+id]').between(
      [puzzleId, sessionId], [puzzleId, sessionId, []],
    )
  }

  return {
    async listSessions(puzzleId: PuzzleId) {
      checkPuzzle(puzzleId)
      return db.sessions.where('[puzzleId+createdAtMs+id]').between(
        [puzzleId], [puzzleId, []],
      ).toArray()
    },

    async getOrCreateDefaultSession(puzzleId: PuzzleId) {
      checkPuzzle(puzzleId)
      const id = `default:${puzzleId}`
      return db.transaction('rw', db.sessions, async () => {
        const existing = await db.sessions.get(id)
        if (existing) return existing
        const session: Session = { id, puzzleId, name: 'Mặc định', createdAtMs: Date.now() }
        await db.sessions.add(session)
        return session
      })
    },

    async createSession(puzzleId: PuzzleId, name: string) {
      checkPuzzle(puzzleId)
      const session: Session = {
        id: crypto.randomUUID(), puzzleId, name: normalizeName(name), createdAtMs: Date.now(),
      }
      await db.sessions.add(session)
      return session
    },

    async renameSession(scope: SessionScope, name: string) {
      const normalized = normalizeName(name)
      return db.transaction('rw', db.sessions, async () => {
        const session = await requireSession(scope)
        await db.sessions.update(session.id, { name: normalized })
      })
    },

    async recordSolve(solve: Solve) {
      checkSolve(solve)
      return db.transaction('rw', db.sessions, db.solves, async () => {
        await requireSession(solve)
        const existing = await db.solves.get(solve.id)
        if (!existing) {
          await db.solves.add(solve)
        } else if (!isSameSolve(existing, solve)) {
          throw new Error('Mã lượt giải đã được dùng cho một kết quả khác.')
        }
      })
    },

    async listSolves(scope: SessionScope) {
      return scopedSolves(scope).toArray()
    },

    async listRecentSolves(scope: SessionScope, limit: number) {
      return scopedSolves(scope).reverse().limit(limit).toArray()
    },

    async setSolvePenalty(scope: SessionScope, solveId: string, penalty: Penalty) {
      checkPenalty(penalty)
      return db.transaction('rw', db.solves, async () => {
        const solve = await db.solves.get(solveId)
        if (!solve || solve.puzzleId !== scope.puzzleId || solve.sessionId !== scope.sessionId) {
          throw new Error('Lượt giải không thuộc phiên đang chọn.')
        }
        await db.solves.update(solve.id, { penalty })
      })
    },
  }
}

export const trainingRepository = createTrainingRepository(new TrainingDatabase())
