import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

type QueryResult<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T }

export function useTrainingQuery<T>(query: () => Promise<T>, prepare?: () => Promise<unknown>) {
  const [result, setResult] = useState<QueryResult<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    let subscription: { unsubscribe: () => void } | undefined

    function reportError() {
      if (active) setResult({ status: 'error' })
    }

    function subscribe() {
      if (!active) return
      subscription = liveQuery(query).subscribe({
        next: (data) => {
          if (active) setResult({ status: 'ready', data })
        },
        error: reportError,
      })
    }

    if (prepare) void prepare().then(subscribe, reportError)
    else subscribe()

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [query, prepare, attempt])

  return {
    result,
    retry: () => {
      setResult({ status: 'loading' })
      setAttempt((previous) => previous + 1)
    },
  }
}
