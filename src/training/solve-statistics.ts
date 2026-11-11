import type { Solve } from './records'

export type Single = number | 'DNF'
export type SolveTime = Single | null

export type SolveRow = {
  solve: Solve
  single: Single
  ao5: SolveTime
  ao12: SolveTime
}

export type SolveView = 'full' | 'averages' | 'best'
export type SolveSort = 'newest' | 'oldest' | 'fastest' | 'slowest'

export function getSingle({ elapsedMs, penalty }: Solve): Single {
  if (penalty === 'dnf') return 'DNF'
  return elapsedMs + (penalty === 'plus2' ? 2000 : 0)
}

function rollingAverage(singles: readonly Single[], end: number, size: number): SolveTime {
  if (end < size) return null
  const window = singles.slice(end - size, end)
  const valid = window.filter((single) => single !== 'DNF')
  if (valid.length < size - 1) return 'DNF'

  const total = valid.reduce((sum, single) => sum + single, 0)
  const fastest = Math.min(...valid)
  // A single DNF takes the place of the discarded slowest time.
  const slowest = valid.length === size ? Math.max(...valid) : 0
  return (total - fastest - slowest) / (size - 2)
}

// The repository supplies solves in ascending completion time and ID order.
export function calculateSolveStatistics(solves: readonly Solve[]) {
  const singles: Single[] = []
  let totalMs = 0
  let validCount = 0

  const rows = solves.map((solve, index): SolveRow => {
    const single = getSingle(solve)
    singles.push(single)
    if (single !== 'DNF') {
      totalMs += single
      validCount += 1
    }
    return {
      solve,
      single,
      ao5: rollingAverage(singles, index + 1, 5),
      ao12: rollingAverage(singles, index + 1, 12),
    }
  })

  return { rows, validCount, mean: validCount > 0 ? totalMs / validCount : null }
}

function compareId(a: SolveRow, b: SolveRow) {
  if (a.solve.id === b.solve.id) return 0
  return a.solve.id < b.solve.id ? -1 : 1
}

function compareCompletion(a: SolveRow, b: SolveRow) {
  return a.solve.finishedAtMs - b.solve.finishedAtMs || compareId(a, b)
}

function compareSingle(a: SolveRow, b: SolveRow, direction: 1 | -1) {
  if (a.single !== 'DNF' && b.single !== 'DNF' && a.single !== b.single) {
    return direction * (a.single - b.single)
  }
  if (a.single !== b.single) return a.single === 'DNF' ? 1 : -1
  return b.solve.finishedAtMs - a.solve.finishedAtMs || compareId(a, b)
}

export function selectSolveRows(rows: readonly SolveRow[], view: SolveView, sort: SolveSort) {
  const selected = view === 'best'
    ? rows.filter(({ single }) => single !== 'DNF').sort((a, b) => compareSingle(a, b, 1)).slice(0, 5)
    : [...rows]

  return selected.sort((a, b) => {
    switch (sort) {
      case 'oldest': return compareCompletion(a, b)
      case 'newest': return compareCompletion(b, a)
      case 'fastest': return compareSingle(a, b, 1)
      case 'slowest': return compareSingle(a, b, -1)
    }
  })
}
