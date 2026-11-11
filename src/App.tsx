import { Box, ChevronDown, History, Timer, TriangleAlert } from 'lucide-react'
import { useCallback } from 'react'
import { useStore } from 'zustand'
import { formatElapsed } from './timer/format-elapsed'
import { TimerPanel } from './timer/TimerPanel'
import { createTimerStore } from './timer/timer-store'
import { isPuzzleId, puzzles, type PuzzleId } from './training/puzzles'
import type { Session } from './training/records'
import { trainingRepository } from './training/repository'
import { SessionControls } from './training/SessionControls'
import { useSessionSelection } from './training/session-selection'
import { useTrainingQuery } from './training/use-training-query'

const timer = createTimerStore(trainingRepository.recordSolve)
const recentLimit = 6
const finishedTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

function QueryError({ retry }: { retry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" role="alert">
      <TriangleAlert size={16} aria-hidden="true" /> Không đọc được dữ liệu.
      <button type="button" className="font-semibold underline underline-offset-4" onClick={retry}>Thử lại</button>
    </div>
  )
}

function TrainingBoard({ session, canStart }: { session: Session; canStart: boolean }) {
  const { puzzleId, id: sessionId } = session
  const load = useCallback(() => trainingRepository.listRecentSolves({ puzzleId, sessionId }, recentLimit), [puzzleId, sessionId])
  const { result, retry } = useTrainingQuery(load)
  const lastSaved = useStore(timer, (state) => state.lastSaved)
  const latest = result.status === 'ready' ? result.data[0] : undefined
  const savedHere = lastSaved?.sessionId === sessionId && lastSaved.puzzleId === puzzleId
  const latestMs = savedHere && (!latest || lastSaved.finishedAtMs > latest.finishedAtMs)
    ? lastSaved.elapsedMs
    : latest?.elapsedMs ?? 0

  return (
    <div className="training-board">
      <TimerPanel timer={timer} latestMs={latestMs} context={canStart ? { puzzleId, sessionId, scramble: null } : null} />

      <aside className="history-panel" aria-labelledby="history-title">
        <div className="flex items-center gap-2.5">
          <History size={18} className="text-muted" aria-hidden="true" />
          <h2 id="history-title" className="font-semibold">Lượt giải gần đây</h2>
        </div>
        {result.status === 'loading' && <p className="history-message" role="status">Đang đọc lịch sử…</p>}
        {result.status === 'error' && <div className="history-message"><QueryError retry={retry} /></div>}
        {result.status === 'ready' && (result.data.length > 0 ? (
          <ol className="mt-4 divide-y divide-line" aria-label="Lịch sử lượt giải">
            {result.data.map((solve) => (
              <li key={solve.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-3">
                <span className="font-mono text-base tabular-nums">{formatElapsed(solve.elapsedMs)}</span>
                <time dateTime={new Date(solve.finishedAtMs).toISOString()} className="text-xs text-muted">
                  {finishedTime.format(solve.finishedAtMs)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <div className="history-empty">
            <Timer size={23} aria-hidden="true" />
            <p>Phiên này chưa có lượt giải.</p>
          </div>
        ))}
      </aside>
    </div>
  )
}

function PuzzleTraining({ puzzleId }: { puzzleId: PuzzleId }) {
  const selectedId = useSessionSelection((state) => state.selectedSessions[puzzleId])
  const locked = useStore(timer, (state) => state.phase.status !== 'idle')
  const load = useCallback(() => trainingRepository.listSessions(puzzleId), [puzzleId])
  const prepare = useCallback(() => trainingRepository.getOrCreateDefaultSession(puzzleId), [puzzleId])
  const { result, retry } = useTrainingQuery(load, prepare)

  if (result.status === 'loading') return <p className="my-8 text-sm text-muted" role="status">Đang mở phiên luyện tập…</p>
  if (result.status === 'error') return <div className="my-8"><QueryError retry={retry} /></div>

  const session = result.data.find(({ id }) => id === (selectedId ?? `default:${puzzleId}`))

  return (
    <SessionControls puzzleId={puzzleId} sessions={result.data} selected={session} locked={locked}>
      {(editing) => session ? <TrainingBoard key={session.id} session={session} canStart={!editing} /> : (
        <p className="my-8 text-sm text-muted" role="status">Đang mở phiên luyện tập…</p>
      )}
    </SessionControls>
  )
}

export function App() {
  const puzzleId = useSessionSelection((state) => state.puzzleId)
  const selectPuzzle = useSessionSelection((state) => state.selectPuzzle)
  const locked = useStore(timer, (state) => state.phase.status !== 'idle')

  return (
    <>
      <header className="site-header">
        <div className="page-width flex h-16 items-center gap-2.5">
          <span className="brand-mark"><Box size={20} strokeWidth={1.8} aria-hidden="true" /></span>
          <span className="text-lg font-semibold tracking-tight">CubeTimer</span>
        </div>
      </header>

      <main className="page-width py-8 sm:py-11">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Bấm giờ</h1>
          <label className="control-label">
            Loại cube
            <span className="select-wrap">
              <select
                value={puzzleId}
                disabled={locked}
                onChange={(event) => {
                  const next = event.currentTarget.value
                  if (timer.getState().phase.status === 'idle' && isPuzzleId(next)) selectPuzzle(next)
                }}
              >
                {Object.entries(puzzles).map(([id, puzzle]) => <option key={id} value={id}>{puzzle.label}</option>)}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
        </div>

        <PuzzleTraining key={puzzleId} puzzleId={puzzleId} />
      </main>
    </>
  )
}
