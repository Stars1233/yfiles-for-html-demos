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
import { TimeSpan } from '@yfiles/yfiles'

/**
 * Creates a debounced pointer listener that annotates movement events and signals a
 * fast pointer movement
 */
export function wrapPointerWithMomentumAnalysis(listener, options = {}) {
  const {
    speedThreshold = 300, // pixels per second
    stopDelay = '200ms', // time to wait after stopping
    sampleInterval = '50ms' // time between speed checks
  } = options
  const smoothingFactor = 0.2 // weight for new values (0-1, higher = more reactive)

  let lastEvent = null
  let lastSender = null
  let lastTimestamp = 0
  let lastPosition = null
  let stopTimer = null
  let sampleTimer = null
  let isMovingFast = false
  let smoothedSpeed = null // exponentially smoothed speed

  function calculateSpeed(pos1, pos2, timeDelta) {
    const distance = pos1.distanceTo(pos2)
    const zoom = lastSender?.zoom ?? 1
    return (zoom * distance) / timeDelta
  }

  function updateSmoothedSpeed(currentSpeed) {
    if (smoothedSpeed === null) {
      // Initialize with first measurement
      smoothedSpeed = currentSpeed
    } else {
      // Exponential moving average: EMA = α * current + (1 - α) * previous
      smoothedSpeed = smoothingFactor * currentSpeed + (1 - smoothingFactor) * smoothedSpeed
    }
    return smoothedSpeed
  }

  function checkSpeedAndTrigger() {
    if (!lastEvent || !lastPosition || !lastSender) return

    const now = performance.now()
    const timeDelta = (now - lastTimestamp) / 1000

    if (timeDelta > 0) {
      const instantSpeed = calculateSpeed(lastPosition, lastEvent.location, timeDelta)
      const speed = updateSmoothedSpeed(instantSpeed)

      if (speed <= speedThreshold && isMovingFast) {
        // Smoothed speed dropped below threshold
        isMovingFast = false
      } else if (speed > speedThreshold) {
        isMovingFast = true
      }
      listener(lastEvent, lastSender, isMovingFast)

      lastPosition = lastEvent.location
      lastTimestamp = now
    }
  }

  return function (evt, sender) {
    lastEvent = evt
    lastSender = sender

    // Clear existing timers
    if (stopTimer) clearTimeout(stopTimer)
    if (sampleTimer) clearTimeout(sampleTimer)

    // Initialize if first event
    if (!lastPosition) {
      lastPosition = evt.location
      lastTimestamp = performance.now()
      isMovingFast = false
      smoothedSpeed = null
      return
    }

    checkSpeedAndTrigger()

    // Schedule speed check
    sampleTimer = setTimeout(checkSpeedAndTrigger, TimeSpan.from(sampleInterval).totalMilliseconds)

    // Schedule stop timer (fallback if mouse completely stops)
    stopTimer = setTimeout(() => {
      if (lastEvent && lastSender) {
        isMovingFast = false
        smoothedSpeed = null // Reset smoothing when stopped
        listener(lastEvent, lastSender, isMovingFast)
        lastPosition = lastEvent.location
        lastTimestamp = performance.now()
      }
    }, TimeSpan.from(stopDelay).totalMilliseconds)
  }
}
