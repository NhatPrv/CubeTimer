import { Hand, Keyboard, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useStore } from 'zustand'
import type { Single } from '../training/solve-statistics'
import { formatElapsed } from './format-elapsed'
import type { createTimerStore, TimerContext, TimerInput } from './timer-store'

const statusText = {
  idle: 'Sẵn sàng',
  holding: 'Tiếp tục giữ',
  armed: 'Nhả để bắt đầu',
  running: 'Đang bấm giờ',
  saving: 'Đang lưu',
  'save-error': 'Chưa lưu được',
}

type TimerPanelProps = {
  timer: ReturnType<typeof createTimerStore>
  context: TimerContext | null
  latestTime: Single
}

function keyboardInput(event: KeyboardEvent): TimerInput | null {
  if (event.code === 'Space') return 'space'
  if (event.code === 'Enter' || event.code === 'NumpadEnter') return 'enter'
  return null
}

export function TimerPanel({ timer, context, latestTime }: TimerPanelProps) {
  const phase = useStore(timer, (state) => state.phase)
  const surface = useRef<HTMLButtonElement>(null)
  const startedAtMs = phase.status === 'running' ? phase.startedAtMs : null
  const [frame, setFrame] = useState<{ start: number; elapsedMs: number } | null>(null)

  useEffect(() => {
    if (startedAtMs === null) return
    let frameId = 0
    const start = startedAtMs

    function update(now: number) {
      setFrame({ start, elapsedMs: Math.max(0, now - start) })
      frameId = requestAnimationFrame(update)
    }

    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [startedAtMs])

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      const input = keyboardInput(event)
      if (!input || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
      const onTimer = event.target === surface.current
      const onControl = event.target instanceof Element && event.target.closest(
        'button, input, textarea, select, a[href], [contenteditable], [role="button"], [role="textbox"]',
      )
      if (!onTimer && (input === 'enter' || onControl)) return
      event.preventDefault()
      if (!event.repeat) timer.getState().press(input, context)
    }

    function keyUp(event: KeyboardEvent) {
      const input = keyboardInput(event)
      if (input) timer.getState().release(input)
    }

    function cancelHold() {
      timer.getState().cancelHold()
    }

    function handleVisibility() {
      if (document.hidden) cancelHold()
    }

    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', cancelHold)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', cancelHold)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [context, timer])

  function startPointer(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    timer.getState().press(`pointer:${event.pointerId}`, context)
  }

  function cancelPointer(event: PointerEvent<HTMLButtonElement>) {
    timer.getState().cancelHold(`pointer:${event.pointerId}`)
  }

  let elapsedMs = latestTime
  if (phase.status === 'holding' || phase.status === 'armed') elapsedMs = 0
  if (phase.status === 'running') elapsedMs = frame?.start === phase.startedAtMs ? frame.elapsedMs : 0
  if (phase.status === 'saving' || phase.status === 'save-error') elapsedMs = phase.solve.elapsedMs

  const canInteract = context !== null || phase.status === 'running'

  return (
    <section className="timer-panel" aria-label="Đồng hồ bấm giờ">
      <button
        ref={surface}
        type="button"
        className="timer-surface"
        data-phase={phase.status}
        aria-label="Vùng bấm giờ"
        aria-describedby="timer-help"
        disabled={!canInteract || phase.status === 'saving' || phase.status === 'save-error'}
        onPointerDown={startPointer}
        onPointerUp={(event) => timer.getState().release(`pointer:${event.pointerId}`)}
        onPointerCancel={cancelPointer}
        onLostPointerCapture={cancelPointer}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="timer-status" role="status">
          <span className="status-dot" aria-hidden="true" />
          {statusText[phase.status]}
        </span>
        <span className="timer-value" aria-live="off">{elapsedMs === 'DNF' ? elapsedMs : formatElapsed(elapsedMs)}</span>
        <span className="timer-instruction" id="timer-help">
          {phase.status === 'running' ? 'Nhấn Space hoặc chạm để dừng' : 'Giữ 0,3 giây, rồi nhả để bắt đầu'}
        </span>
      </button>

      <div className="timer-footer">
        {phase.status === 'save-error' ? (
          <button type="button" className="retry-save" onClick={timer.getState().retrySave}>
            <RotateCcw size={15} aria-hidden="true" /> Thử lưu lại
          </button>
        ) : (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <span className="inline-flex items-center gap-2"><Keyboard size={16} aria-hidden="true" /> <kbd>Space</kbd></span>
            <span className="inline-flex items-center gap-2"><Hand size={16} aria-hidden="true" /> Chạm vùng timer</span>
          </div>
        )}
      </div>
    </section>
  )
}
