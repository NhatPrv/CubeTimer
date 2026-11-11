export function formatElapsed(elapsedMs: number) {
  const centiseconds = Math.floor(elapsedMs / 10)
  const minutes = Math.floor(centiseconds / 6000)
  const seconds = Math.floor(centiseconds / 100) % 60
  const fraction = String(centiseconds % 100).padStart(2, '0')
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}.${fraction}` : `${seconds}.${fraction}`
}
