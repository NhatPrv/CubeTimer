import { ChevronDown, Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { PuzzleId } from './puzzles'
import type { Session } from './records'
import { maxSessionNameLength, trainingRepository } from './repository'
import { useSessionSelection } from './session-selection'

type SessionControlsProps = {
  puzzleId: PuzzleId
  sessions: Session[]
  selected: Session | undefined
  locked: boolean
  children: (editing: boolean) => ReactNode
}

type Editor = { mode: 'create' | 'rename'; name: string }

export function SessionControls({ puzzleId, sessions, selected, locked, children }: SessionControlsProps) {
  const selectSession = useSessionSelection((state) => state.selectSession)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openEditor(next: Editor) {
    setEditor(next)
    setError('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor || saving || locked) return
    const name = editor.name.trim()
    if (!name || name.length > maxSessionNameLength) {
      setError('Tên phiên cần có từ 1 đến 80 ký tự.')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editor.mode === 'create') {
        const created = await trainingRepository.createSession(puzzleId, name)
        selectSession(puzzleId, created.id)
      } else if (selected) {
        await trainingRepository.renameSession({ puzzleId, sessionId: selected.id }, name)
      }
      setEditor(null)
    } catch {
      setError('Không lưu được phiên. Hãy thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="session-bar">
        <label className="control-label min-w-0">
          Phiên luyện tập
          <span className="select-wrap">
            <select
              disabled={locked || editor !== null || !selected}
              value={selected?.id ?? ''}
              onChange={(event) => selectSession(puzzleId, event.currentTarget.value)}
            >
              {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button" className="outline-button" disabled={locked || editor !== null}
            onClick={() => openEditor({ mode: 'create', name: '' })}
          >
            <Plus size={16} aria-hidden="true" /> Tạo phiên
          </button>
          <button
            type="button" className="outline-button" disabled={locked || editor !== null || !selected}
            onClick={() => selected && openEditor({ mode: 'rename', name: selected.name })}
          >
            <Pencil size={15} aria-hidden="true" /> Đổi tên
          </button>
        </div>
      </div>

      {editor && (
        <form className="session-editor" onSubmit={(event) => void save(event)}>
          <label className="control-label grow">
            Tên phiên
            <input
              autoFocus required maxLength={maxSessionNameLength} disabled={saving} value={editor.name}
              onChange={(event) => setEditor({ ...editor, name: event.currentTarget.value })}
            />
          </label>
          <button type="submit" className="outline-button primary-button" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu phiên'}
          </button>
          <button type="button" className="outline-button" disabled={saving} onClick={() => setEditor(null)}>Hủy</button>
          {error && <p className="basis-full text-sm text-red-700" role="alert">{error}</p>}
        </form>
      )}

      {children(editor !== null)}
    </>
  )
}
