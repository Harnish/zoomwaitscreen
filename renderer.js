const { ipcRenderer } = require('electron')
const path = require('path')

let selectedMode = 'away'
let backgroundImagePath = null

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedMode = btn.dataset.mode
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    document.getElementById('away-fields').classList.toggle('hidden', selectedMode !== 'away')
    document.getElementById('countdown-fields').classList.toggle('hidden', selectedMode !== 'countdown')
  })
})

document.querySelectorAll('input[name="time-mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const minutesMode = document.querySelector('input[name="time-mode"][value="minutes"]').checked
    document.getElementById('minutes-input').disabled = !minutesMode
    document.getElementById('time-input').disabled = minutesMode
  })
})

document.getElementById('choose-bg').addEventListener('click', async () => {
  const filePath = await ipcRenderer.invoke('choose-background')
  if (filePath) {
    backgroundImagePath = filePath
    document.getElementById('bg-filename').textContent = path.basename(filePath)
    const preview = document.getElementById('bg-preview')
    preview.style.backgroundImage = `url('${encodeURI('file://' + filePath.replace(/\\/g, '/'))}')`
    preview.classList.remove('hidden')
  }
})

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    document.getElementById('width-input').value = btn.dataset.w
    document.getElementById('height-input').value = btn.dataset.h
  })
})

;['width-input', 'height-input'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'))
  })
})

document.getElementById('start-btn').addEventListener('click', () => {
  const errorEl = document.getElementById('error-msg')
  errorEl.classList.add('hidden')

  if (selectedMode === 'away') {
    const message = document.getElementById('message').value.trim()
    if (!message) {
      errorEl.textContent = 'Please enter a message.'
      errorEl.classList.remove('hidden')
      return
    }
    sessionStorage.setItem('mode', 'away')
    sessionStorage.setItem('message', message)
    sessionStorage.setItem('countdownLabel', '')
    sessionStorage.setItem('countdownMinutes', '')
    sessionStorage.setItem('countdownTargetTime', '')
  } else {
    const timeMode = document.querySelector('input[name="time-mode"]:checked').value
    const label = document.getElementById('countdown-label-input').value.trim() || 'The meeting will start in'
    sessionStorage.setItem('mode', 'countdown')
    sessionStorage.setItem('countdownLabel', label)
    sessionStorage.setItem('message', '')

    if (timeMode === 'minutes') {
      const minutes = parseInt(document.getElementById('minutes-input').value, 10)
      if (!minutes || minutes < 1) {
        errorEl.textContent = 'Please enter a valid number of minutes.'
        errorEl.classList.remove('hidden')
        return
      }
      sessionStorage.setItem('countdownMinutes', String(minutes))
      sessionStorage.setItem('countdownTargetTime', '')
    } else {
      const timeVal = document.getElementById('time-input').value
      if (!timeVal) {
        errorEl.textContent = 'Please select a time.'
        errorEl.classList.remove('hidden')
        return
      }
      sessionStorage.setItem('countdownMinutes', '')
      sessionStorage.setItem('countdownTargetTime', timeVal)
    }
  }

  sessionStorage.setItem('backgroundImagePath', backgroundImagePath || '')

  const width = parseInt(document.getElementById('width-input').value, 10) || 1280
  const height = parseInt(document.getElementById('height-input').value, 10) || 720

  sessionStorage.setItem('displayWidth', String(width))
  sessionStorage.setItem('displayHeight', String(height))
  ipcRenderer.invoke('show-display', width, height)
})
