import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTimerStore, holdToStartMs, type TimerContext } from './timer-store'
import type { Solve } from '../training/records'

const context: TimerContext = { puzzleId: '333', sessionId: 'default:333', scramble: null }

beforeEach(() => {
  vi.useFakeTimers({ now: 1000, toFake: ['performance', 'Date', 'setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('timer store', () => {
  it('requires a ready session and cancels a short hold', () => {
    const record = vi.fn<(solve: Solve) => Promise<void>>().mockResolvedValue(undefined)
    const timer = createTimerStore(record)
    timer.getState().press('space', null)
    expect(timer.getState().phase.status).toBe('idle')
    timer.getState().press('space', context)
    vi.advanceTimersByTime(holdToStartMs - 1)
    timer.getState().release('space')
    vi.advanceTimersByTime(20)
    expect(timer.getState().phase.status).toBe('idle')
    expect(record).not.toHaveBeenCalled()
  })

  it('arms, starts on release and records only once even when another input follows', async () => {
    const record = vi.fn<(solve: Solve) => Promise<void>>().mockResolvedValue(undefined)
    const timer = createTimerStore(record)
    timer.getState().press('space', context)
    vi.advanceTimersByTime(holdToStartMs)
    expect(timer.getState().phase.status).toBe('armed')
    timer.getState().release('space')
    expect(timer.getState().phase.status).toBe('running')
    vi.advanceTimersByTime(1532)
    timer.getState().press('pointer:3', null)
    timer.getState().press('space', context)
    timer.getState().release('pointer:3')
    expect(timer.getState().phase.status).toBe('saving')
    await Promise.resolve()
    expect(timer.getState().phase.status).toBe('idle')
    expect(record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      ...context, elapsedMs: 1532, finishedAtMs: 2832, penalty: 'none',
    }))
  })

  it('ignores other pointers and cancels only the active hold', () => {
    const timer = createTimerStore(vi.fn())
    timer.getState().press('pointer:1', context)
    timer.getState().release('pointer:2')
    timer.getState().cancelHold('pointer:2')
    expect(timer.getState().phase.status).toBe('holding')
    timer.getState().cancelHold('pointer:1')
    vi.advanceTimersByTime(holdToStartMs)
    timer.getState().release('pointer:1')
    expect(timer.getState().phase.status).toBe('idle')
  })

  it('keeps a failed solve and retries with identical context and ID', async () => {
    const record = vi.fn<(solve: Solve) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Disk is full'))
      .mockResolvedValueOnce(undefined)
    const timer = createTimerStore(record)
    timer.getState().press('pointer:1', context)
    vi.advanceTimersByTime(holdToStartMs)
    timer.getState().release('pointer:1')
    timer.getState().cancelHold()
    expect(timer.getState().phase.status).toBe('running')
    vi.advanceTimersByTime(900)
    timer.getState().press('pointer:2', { puzzleId: '444', sessionId: 'default:444', scramble: null })
    await Promise.resolve()
    expect(timer.getState().phase.status).toBe('save-error')
    timer.getState().retrySave()
    timer.getState().retrySave()
    await Promise.resolve()
    expect(timer.getState().phase.status).toBe('idle')
    expect(record).toHaveBeenCalledTimes(2)
    expect(record.mock.calls[0]?.[0]).toMatchObject({ ...context, elapsedMs: 900 })
    expect(record.mock.calls[1]?.[0]).toBe(record.mock.calls[0]?.[0])
  })
})
