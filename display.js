const { ipcRenderer } = require('electron')
const { calculateTargetDate, getRemainingSeconds, formatTime } = require('./countdown')

function init() {
  const mode = sessionStorage.getItem('mode')
  const bgPath = sessionStorage.getItem('backgroundImagePath')

  if (bgPath) {
    document.body.style.backgroundImage = `url('file://${bgPath.replace(/\\/g, '/')}')`
  }

  if (mode === 'away') {
    document.getElementById('away-text').textContent = sessionStorage.getItem('message') || ''
    document.getElementById('away-display').classList.remove('hidden')
  } else {
    const label = sessionStorage.getItem('countdownLabel') || 'The meeting will start in'
    const minutes = sessionStorage.getItem('countdownMinutes')
    const timeString = sessionStorage.getItem('countdownTargetTime')

    document.getElementById('countdown-label').textContent = label
    document.getElementById('countdown-display').classList.remove('hidden')

    const targetDate = calculateTargetDate(
      minutes ? 'minutes' : 'time',
      minutes ? parseInt(minutes, 10) : null,
      timeString || null
    )
    startCountdown(targetDate)
  }
}

function startCountdown(targetDate) {
  const labelEl = document.getElementById('countdown-label')
  const timerEl = document.getElementById('countdown-timer')

  function tick() {
    const remaining = getRemainingSeconds(targetDate)
    if (remaining <= 0) {
      labelEl.textContent = 'The meeting is starting!'
      timerEl.textContent = ''
      return true
    }
    timerEl.textContent = formatTime(remaining)
    return false
  }

  if (tick()) return

  const interval = setInterval(() => {
    if (tick()) clearInterval(interval)
  }, 1000)
}

function goBack() {
  ipcRenderer.invoke('show-settings')
}

document.getElementById('back-btn').addEventListener('click', goBack)
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') goBack()
})

init()
