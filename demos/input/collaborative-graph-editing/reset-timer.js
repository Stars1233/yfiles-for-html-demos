/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) 2026 by yWorks GmbH, Vor dem Kreuzberg 28,
 ** 72070 Tuebingen, Germany. All rights reserved.
 **
 ** yFiles demo files exhibit yFiles for HTML functionalities. Any redistribution
 ** of demo files in source code or binary form, with or without
 ** modification, is not permitted.
 **
 ** Owners of a valid software license for a yFiles for HTML version that this
 ** demo is shipped with are allowed to use the demo source code as basis
 ** for their own yFiles for HTML powered applications. Use of such programs is
 ** governed by the rights and conditions as set out in the yFiles for HTML
 ** license agreement.
 **
 ** THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESS OR IMPLIED
 ** WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 ** MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
 ** NO EVENT SHALL yWorks BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 ** SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 ** TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 ** PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 ** LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 ** NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 ** SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **
 ***************************************************************************/
const progressRing = document.querySelector('#refresh-progress')
const spinner = document.querySelector('.reset-ring')
const timeText = document.querySelector('#reset-time')

const circumference = 2 * Math.PI * 46

let remainingMs = 0
let intervalMs = 0
let lastUpdateAt = 0

let timerId
let statusPollId
let initializationId = 0

export function initializeTimerVisualization(collabUrl) {
  if (!spinner) {
    return () => {}
  }

  const currentInitializationId = ++initializationId

  spinner.style.display = 'block'

  if (timerId) {
    clearInterval(timerId)
    timerId = undefined
  }

  if (statusPollId) {
    clearInterval(statusPollId)
    statusPollId = undefined
  }

  const statusUrl = getStatusUrl(collabUrl)

  const fetchStatus = async () => {
    try {
      const response = await fetch(statusUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      })

      if (!response.ok) {
        console.error(`Status request failed: ${response.status}`)
        return
      }

      const status = await response.json()

      // Ignore responses from an older initialization.
      if (currentInitializationId !== initializationId) {
        return
      }

      remainingMs = Math.max(0, status.remainingMs)
      intervalMs = Math.max(0, status.intervalMs)
      lastUpdateAt = Date.now()

      updateDisplay()
    } catch (error) {
      console.error('Refresh status HTTP error', error)
    }
  }

  // Get the initial value immediately.
  void fetchStatus()

  // Periodically resynchronize with the server.
  statusPollId = setInterval(() => {
    void fetchStatus()
  }, 300000)

  // Update the countdown locally every second.
  timerId = setInterval(() => {
    const now = Date.now()
    const elapsedMs = now - lastUpdateAt

    if (remainingMs - elapsedMs > 0) {
      remainingMs = Math.max(0, remainingMs - elapsedMs)
    } else {
      void fetchStatus()
    }

    lastUpdateAt = now
    updateDisplay()
  }, 1000)

  updateDisplay()

  return () => {
    // Invalidate any in-flight fetch from this initialization.
    if (currentInitializationId === initializationId) {
      initializationId++

      if (timerId) {
        clearInterval(timerId)
        timerId = undefined
      }

      if (statusPollId) {
        clearInterval(statusPollId)
        statusPollId = undefined
      }
    }
  }
}
function getStatusUrl(collabUrl) {
  const url = new URL(collabUrl)

  url.pathname = '/status'
  url.search = ''
  url.hash = ''

  if (url.protocol === 'ws:') {
    url.protocol = 'http:'
  } else if (url.protocol === 'wss:') {
    url.protocol = 'https:'
  }

  return url.toString()
}

function formatRemaining(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function updateDisplay() {
  const progress = intervalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / intervalMs)) : 0

  const offset = circumference * (1 - progress)

  if (progressRing) {
    progressRing.style.strokeDashoffset = String(offset)
    progressRing.style.opacity = String(0.65 + progress * 0.35)
  }

  if (spinner) {
    spinner.setAttribute('aria-valuenow', String(Math.round(progress * 100)))
  }

  if (timeText) {
    timeText.textContent = remainingMs > 0 ? formatRemaining(remainingMs) : '00:00'
  }
}
