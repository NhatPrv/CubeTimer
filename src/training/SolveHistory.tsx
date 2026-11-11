import { ChevronDown, ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatElapsed } from '../timer/format-elapsed'
import type { Penalty, SessionScope, Solve } from './records'
import { trainingRepository } from './repository'
import { calculateSolveStatistics, selectSolveRows, type SolveSort, type SolveTime, type SolveView } from './solve-statistics'

const finishedTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const pageSize = 25

function displayTime(time: SolveTime) {
  if (time === null) return '—'
  return time === 'DNF' ? time : formatElapsed(time)
}

type SolveHistoryProps = {
  scope: SessionScope
  solves: Solve[]
  locked: boolean
}

export function SolveHistory({ scope, solves, locked }: SolveHistoryProps) {
  const [view, setView] = useState<SolveView>('full')
  const [sort, setSort] = useState<SolveSort>('newest')
  const [requestedPage, setRequestedPage] = useState(0)
  const [saving, setSaving] = useState(false)
  const [penaltyError, setPenaltyError] = useState(false)

  const { rows, mean, validCount } = useMemo(() => calculateSolveStatistics(solves), [solves])
  const visible = useMemo(() => selectSolveRows(rows, view, sort), [rows, view, sort])
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const page = Math.min(requestedPage, pageCount - 1)
  const first = page * pageSize

  async function updatePenalty(solveId: string, penalty: Penalty) {
    if (locked || saving) return
    setSaving(true)
    setPenaltyError(false)
    try {
      await trainingRepository.setSolvePenalty(scope, solveId, penalty)
    } catch {
      setPenaltyError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="solve-summary">
        <div className="flex items-baseline gap-2">
          <span>Mean</span>
          <strong className="font-mono text-xl font-medium text-ink tabular-nums">{displayTime(mean)}</strong>
        </div>
        <div>{validCount}/{solves.length} lượt hợp lệ</div>
      </div>

      <div className="solve-filters">
        <label className="control-label min-w-0">
          Hiển thị
          <span className="select-wrap">
            <select value={view} disabled={locked} onChange={(event) => {
              setView(event.currentTarget.value as SolveView)
              setRequestedPage(0)
            }}>
              <option value="full">Đầy đủ</option>
              <option value="averages">Chỉ Ao5/Ao12</option>
              <option value="best">5 lượt tốt nhất</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </label>
        <label className="control-label min-w-0">
          Sắp xếp
          <span className="select-wrap">
            <select value={sort} disabled={locked} onChange={(event) => {
              setSort(event.currentTarget.value as SolveSort)
              setRequestedPage(0)
            }}>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="fastest">Thời gian tăng dần</option>
              <option value="slowest">Thời gian giảm dần</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </label>
      </div>

      {penaltyError && <p className="mt-3 text-sm text-red-700" role="alert">Không lưu được mức phạt. Hãy thử lại.</p>}

      {visible.length === 0 ? (
        <div className="history-empty">
          <Timer size={23} aria-hidden="true" />
          <p>{solves.length === 0 ? 'Phiên này chưa có lượt giải.' : 'Phiên này chưa có lượt hợp lệ.'}</p>
        </div>
      ) : (
        <>
          <div key={`${view}:${sort}:${page}`} className="solve-table-wrap" role="region"
            aria-label="Bảng lịch sử lượt giải" tabIndex={0}>
            <table className="solve-table" aria-label="Lượt giải trong phiên">
              <thead>
                <tr>
                  <th scope="col" aria-sort={sort === 'newest' ? 'descending' : sort === 'oldest' ? 'ascending' : undefined}>
                    Hoàn thành
                  </th>
                  {view !== 'averages' && (
                    <th scope="col" aria-sort={sort === 'fastest' ? 'ascending' : sort === 'slowest' ? 'descending' : undefined}>
                      Single
                    </th>
                  )}
                  {view !== 'best' && <><th scope="col">Ao5</th><th scope="col">Ao12</th></>}
                  <th scope="col">Phạt</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(first, first + pageSize).map(({ solve, single, ao5, ao12 }, index) => (
                  <tr key={solve.id}>
                    <td>
                      <time dateTime={new Date(solve.finishedAtMs).toISOString()}>
                        {finishedTime.format(solve.finishedAtMs)}
                      </time>
                    </td>
                    {view !== 'averages' && <td className="solve-value">{displayTime(single)}</td>}
                    {view !== 'best' && <><td className="solve-value">{displayTime(ao5)}</td><td className="solve-value">{displayTime(ao12)}</td></>}
                    <td>
                      <select
                        className="solve-penalty"
                        aria-label={`Mức phạt lượt ${first + index + 1}`}
                        value={solve.penalty}
                        disabled={locked || saving}
                        onChange={(event) => void updatePenalty(solve.id, event.currentTarget.value as Penalty)}
                      >
                        <option value="none">—</option>
                        <option value="plus2">+2</option>
                        <option value="dnf">DNF</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="solve-pagination">
              <span>{first + 1}–{Math.min(first + pageSize, visible.length)} / {visible.length} lượt</span>
              <div className="flex gap-2">
                <button type="button" className="outline-button" aria-label="Trang trước" disabled={locked || page === 0}
                  onClick={() => setRequestedPage(page - 1)}>
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <button type="button" className="outline-button" aria-label="Trang sau" disabled={locked || page + 1 === pageCount}
                  onClick={() => setRequestedPage(page + 1)}>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
