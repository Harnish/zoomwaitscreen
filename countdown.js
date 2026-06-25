function calculateTargetDate(mode, minutes, timeString) {
  if (mode === 'minutes') {
    return new Date(Date.now() + minutes * 60 * 1000)
  }
  const [hours, mins] = timeString.split(':').map(Number)
  const target = new Date()
  target.setHours(hours, mins, 0, 0)
  return target
}

function getRemainingSeconds(targetDate) {
  return Math.max(0, Math.round((targetDate.getTime() - Date.now()) / 1000))
}

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '00:00'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = n => String(n).padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

module.exports = { calculateTargetDate, getRemainingSeconds, formatTime }
