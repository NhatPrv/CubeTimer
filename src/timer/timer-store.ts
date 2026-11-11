import { createStore } from 'zustand/vanilla'
import type { Scramble, SessionScope, Solve } from '../training/records'

export const holdToStartMs = 300

export type TimerInput = 'space' | 'enter' | `pointer:${number}`
export type TimerContext = SessionScope & { scramble: Scramble | null }

type Hold = {
  input: TimerInput
  pressedAtMs: number
  context: TimerContext
}

type TimerPhase =
  | { status: 'idle' }
  | { status: 'holding' | 'armed'; hold: Hold }
  | { status: 'running'; context: TimerContext; startedAtMs: number; id: string }
  | { status: 'saving' | 'save-error'; solve: Solve }

type TimerStore = {
  phase: TimerPhase
  lastSaved: Solve | null
  press: (input: TimerInput, context: TimerContext | null) => void
  release: (input: TimerInput) => void
  cancelHold: (input?: TimerInput) => void
  retrySave: () => void
}

export function createTimerStore(recordSolve: (solve: Solve) => Promise<void>) {
  return createStore<TimerStore>((set, get) => {
    let armTimeout: ReturnType<typeof setTimeout> | undefined

    async function save(solve: Solve) {
      set({ phase: { status: 'saving', solve } })
      try {
        await recordSolve(solve)
        set({ phase: { status: 'idle' }, lastSaved: solve })
      } catch {
        set({ phase: { status: 'save-error', solve } })
      }
    }

    return {
      phase: { status: 'idle' },
      lastSaved: null,

      press(input, context) {
        const { phase } = get()
        if (phase.status === 'running') {
          void save({
            ...phase.context,
            id: phase.id,
            elapsedMs: Math.max(1, Math.round(performance.now() - phase.startedAtMs)),
            finishedAtMs: Date.now(),
            penalty: 'none',
          })
        } else if (phase.status === 'idle' && context) {
          const hold = { input, pressedAtMs: performance.now(), context: structuredClone(context) }
          set({ phase: { status: 'holding', hold } })
          armTimeout = setTimeout(() => {
            const { phase } = get()
            if (phase.status === 'holding' && phase.hold === hold) {
              set({ phase: { status: 'armed', hold } })
            }
          }, holdToStartMs)
        }
      },

      release(input) {
        const { phase } = get()
        if ((phase.status !== 'holding' && phase.status !== 'armed') || phase.hold.input !== input) return
        clearTimeout(armTimeout)
        const now = performance.now()
        if (now - phase.hold.pressedAtMs < holdToStartMs) {
          set({ phase: { status: 'idle' } })
        } else {
          set({ phase: {
            status: 'running', context: phase.hold.context, startedAtMs: now, id: crypto.randomUUID(),
          } })
        }
      },

      cancelHold(input) {
        const { phase } = get()
        if ((phase.status !== 'holding' && phase.status !== 'armed') ||
            (input !== undefined && phase.hold.input !== input)) return
        clearTimeout(armTimeout)
        set({ phase: { status: 'idle' } })
      },

      retrySave() {
        const { phase } = get()
        if (phase.status === 'save-error') void save(phase.solve)
      },
    }
  })
}
