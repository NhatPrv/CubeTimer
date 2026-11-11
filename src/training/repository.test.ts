import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TrainingDatabase } from './database'
import type { Session, Solve } from './records'
import { createTrainingRepository } from './repository'

let db: TrainingDatabase
let repository: ReturnType<typeof createTrainingRepository>

beforeEach(() => {
  db = new TrainingDatabase(`CubeTimer-${crypto.randomUUID()}`)
  repository = createTrainingRepository(db)
})

afterEach(async () => {
  await db.delete()
})

function makeSolve(session: Session, id: string, finishedAtMs = 1000): Solve {
  return {
    id,
    sessionId: session.id,
    puzzleId: session.puzzleId,
    elapsedMs: 742,
    finishedAtMs,
    scramble: null,
    penalty: 'none',
  }
}

describe('training repository', () => {
  it('initializes one default session even across concurrent connections', async () => {
    const otherConnection = new TrainingDatabase(db.name)
    try {
      const [a, b] = await Promise.all([
        repository.getOrCreateDefaultSession('333'),
        createTrainingRepository(otherConnection).getOrCreateDefaultSession('333'),
      ])
      expect(a.id).toBe('default:333')
      expect(a).toEqual(b)
      expect(await repository.listSessions('333')).toEqual([a])
    } finally {
      otherConnection.close()
    }
  })

  it('validates, trims and renames sessions only inside their puzzle', async () => {
    await expect(repository.createSession('444', '   ')).rejects.toThrow('Tên phiên')
    const session = await repository.createSession('444', '  Tập Yau  ')
    expect(session.name).toBe('Tập Yau')
    await expect(repository.renameSession({ puzzleId: '333', sessionId: session.id }, 'Sai puzzle'))
      .rejects.toThrow('không thuộc')
    await repository.renameSession({ puzzleId: '444', sessionId: session.id }, ' Yau 4×4 ')
    expect(await repository.listSessions('333')).toEqual([])
    expect(await repository.listSessions('444')).toEqual([{ ...session, name: 'Yau 4×4' }])
  })

  it('isolates solves by puzzle and session and breaks timestamp ties by ID', async () => {
    const three = await repository.getOrCreateDefaultSession('333')
    const four = await repository.getOrCreateDefaultSession('444')
    const other = await repository.createSession('333', 'Khác')
    for (const solve of [makeSolve(three, 'b'), makeSolve(three, 'a'), makeSolve(three, 'c', 2000),
      makeSolve(four, 'four'), makeSolve(other, 'other')]) {
      await repository.recordSolve(solve)
    }
    const scope = { puzzleId: three.puzzleId, sessionId: three.id }
    expect((await repository.listSolves(scope)).map(({ id }) => id)).toEqual(['a', 'b', 'c'])
    expect((await repository.listRecentSolves(scope, 2)).map(({ id }) => id)).toEqual(['c', 'b'])
    expect((await repository.listSolves({ puzzleId: '444', sessionId: four.id })).map(({ id }) => id))
      .toEqual(['four'])
    expect((await repository.listSolves({ puzzleId: '333', sessionId: other.id })).map(({ id }) => id))
      .toEqual(['other'])
  })

  it('rejects cross-puzzle writes and invalid scramble metadata', async () => {
    const session = await repository.getOrCreateDefaultSession('333')
    const solve = makeSolve(session, 'solve')
    await expect(repository.recordSolve({ ...solve, puzzleId: '444' })).rejects.toThrow('không thuộc')
    await expect(repository.recordSolve({
      ...solve, scramble: { eventId: '444', notation: 'U', source: 'cubing.js' },
    })).rejects.toThrow('Scramble')
    expect(await repository.listSolves(solve)).toEqual([])
  })

  it('persists on reopen and accepts a retry only when the solve is identical', async () => {
    const session = await repository.getOrCreateDefaultSession('333')
    const solve = makeSolve(session, 'solve')
    await Promise.all([repository.recordSolve(solve), repository.recordSolve({ ...solve })])
    db.close()
    await db.open()
    await expect(repository.recordSolve({ ...solve, elapsedMs: 999 })).rejects.toThrow('đã được dùng')
    expect(await repository.listSolves(solve)).toEqual([solve])
  })

  it('edits a penalty only in its own scope and preserves the measured time', async () => {
    const session = await repository.getOrCreateDefaultSession('333')
    const solve = makeSolve(session, 'penalty-target')
    await repository.recordSolve(solve)
    await expect(repository.setSolvePenalty({ puzzleId: '444', sessionId: session.id }, solve.id, 'dnf'))
      .rejects.toThrow('không thuộc')
    await expect(repository.setSolvePenalty({ puzzleId: '333', sessionId: 'other' }, solve.id, 'dnf'))
      .rejects.toThrow('không thuộc')
    await repository.setSolvePenalty(solve, solve.id, 'plus2')
    expect(await repository.listSolves(solve)).toEqual([{ ...solve, penalty: 'plus2' }])
    await repository.setSolvePenalty(solve, solve.id, 'none')
    expect(await repository.listSolves(solve)).toEqual([solve])
  })
})
