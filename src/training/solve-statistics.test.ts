import { describe, expect, it } from 'vitest'
import type { Penalty, Solve } from './records'
import { calculateSolveStatistics, selectSolveRows, type SolveSort } from './solve-statistics'

function solve(elapsedMs: number, order: number, penalty: Penalty = 'none', id = String(order)): Solve {
  return { id, elapsedMs, penalty, finishedAtMs: order, puzzleId: '333', sessionId: 'default:333', scramble: null }
}

describe('solve statistics', () => {
  it('leaves the first four Ao5 and first eleven Ao12 values unavailable', () => {
    const times = Array.from({ length: 13 }, (_, index) => solve(10000 + index * 1000, index))
    const { rows, mean, validCount } = calculateSolveStatistics(times)
    expect(rows.slice(0, 4).map(({ ao5 }) => ao5)).toEqual(Array(4).fill(null))
    expect(rows.slice(0, 11).map(({ ao12 }) => ao12)).toEqual(Array(11).fill(null))
    expect(rows[4]?.ao5).toBe(12000)
    expect(rows[5]?.ao5).toBe(13000)
    expect(rows[11]?.ao12).toBe(15500)
    expect(rows[12]?.ao12).toBe(16500)
    expect(mean).toBe(16000)
    expect(validCount).toBe(13)
  })

  it('includes +2 and removes one DNF from an Ao5 window', () => {
    const times = [solve(10000, 0), solve(11000, 1), solve(12000, 2, 'plus2'),
      solve(13000, 3), solve(20000, 4, 'dnf')]
    const { rows, mean, validCount } = calculateSolveStatistics(times)
    expect(rows[2]?.single).toBe(14000)
    expect(rows[4]?.single).toBe('DNF')
    expect(rows[4]?.ao5).toBe(38000 / 3)
    expect(mean).toBe(12000)
    expect(validCount).toBe(4)
  })

  it.each([5, 12])('marks an Ao%i with two DNFs as DNF', (size) => {
    const times = Array.from({ length: size }, (_, index) => solve(10000, index, index === 0 ? 'dnf' : 'none'))
    const window = size === 5 ? 'ao5' : 'ao12'
    expect(calculateSolveStatistics(times).rows.at(-1)?.[window]).toBe(10000)
    times.push(solve(20000, size, 'dnf'))
    // Keep both DNFs in the current window and move a valid solve out of it.
    times[0] = solve(10000, 0)
    times[1] = solve(10000, 1, 'dnf')
    expect(calculateSolveStatistics(times).rows.at(-1)?.[window]).toBe('DNF')
  })

  it('returns no mean with an empty session or only DNFs', () => {
    expect(calculateSolveStatistics([])).toEqual({ rows: [], mean: null, validCount: 0 })
    expect(calculateSolveStatistics([solve(10000, 0, 'dnf')])).toMatchObject({ mean: null, validCount: 0 })
  })
})

describe('solve list order', () => {
  const times = [solve(3000, 1, 'none', 'a'), solve(1000, 2, 'plus2', 'b'), solve(3000, 2, 'none', 'c'),
    solve(9000, 3, 'none', 'd'), solve(500, 4, 'dnf', 'e'), solve(4000, 5, 'none', 'f')]
  const { rows } = calculateSolveStatistics(times)

  it.each<[SolveSort, string]>([
    ['newest', 'fedcba'], ['oldest', 'abcdef'], ['fastest', 'bcafde'], ['slowest', 'dfbcae'],
  ])('sorts %s with stable ties and keeps the original Ao for each solve', (sort, order) => {
    const result = selectSolveRows(rows, 'averages', sort)
    expect(result.map((row) => row.solve.id).join('')).toBe(order)
    expect(result.find((row) => row.solve.id === 'f')).toBe(rows[5])
    expect(result.find((row) => row.solve.id === 'f')?.ao5).toBe(16000 / 3)
    expect(rows.map((row) => row.solve.id).join('')).toBe('abcdef')
  })

  it('selects at most five fastest valid solves before applying the chosen order', () => {
    const extra = [...times, solve(1000, 6, 'none', 'g')]
    expect(selectSolveRows(calculateSolveStatistics(extra).rows, 'best', 'newest')
      .map((row) => row.solve.id).join('')).toBe('gfcba')
    expect(selectSolveRows(rows.slice(3, 6), 'best', 'oldest').map((row) => row.solve.id).join('')).toBe('df')
    expect(selectSolveRows(rows.slice(4, 5), 'best', 'oldest')).toEqual([])
  })
})
