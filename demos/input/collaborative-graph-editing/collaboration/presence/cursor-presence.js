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
const CURSOR_PATH = 'M0,0 L0,16 L4,13 L8,20 L11,19 L7,12 L13,12 Z'

/**
 * Adds local cursor broadcasting and remote cursor rendering to any
 * coordinate-based canvas. yFiles integration only needs to provide the two
 * coordinate conversion callbacks. Shared points use the coordinate system
 * chosen by `getPoint`; `toViewPoint` must return coordinates relative to the
 * supplied container. The host is responsible for making the container the
 * appropriate positioning context and for styling the generated cursor
 * classes. A pointer callback returning `null` leaves the last cursor point
 * published until disposal or disconnection.
 */
export function createCursorPresence(awareness, options) {
  const cursorField = options.cursorField ?? 'cursor'
  const authorField = options.authorField ?? 'author'
  const throttleMilliseconds = options.throttleMilliseconds ?? 100
  const colorForClient = options.colorForClient ?? (() => '#3b82f6')
  const fallbackAuthor = options.fallbackAuthor ?? ((clientId) => `User ${clientId}`)
  const overlay = document.createElement('div')
  if (options.overlayId) overlay.id = options.overlayId
  overlay.className = 'cursor-overlay'
  overlay.style.position = 'absolute'
  overlay.style.inset = '0'
  overlay.style.pointerEvents = 'none'
  overlay.style.overflow = 'hidden'
  overlay.style.zIndex = '10'
  options.container.appendChild(overlay)

  const remoteCursors = new Map()
  let lastSync = 0
  let pendingPoint = null
  let timer = null

  const broadcast = (point) => {
    lastSync = Date.now()
    awareness.setLocalStateField(cursorField, point)
    pendingPoint = null
  }

  const scheduleBroadcast = (point) => {
    const now = Date.now()
    if (now - lastSync >= throttleMilliseconds) {
      broadcast(point)
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      return
    }

    pendingPoint = point
    if (timer === null) {
      timer = window.setTimeout(
        () => {
          timer = null
          if (pendingPoint) broadcast(pendingPoint)
        },
        throttleMilliseconds - (now - lastSync)
      )
    }
  }

  const onPointerMove = (event) => {
    const point = options.getPoint(event)
    if (point) scheduleBroadcast(point)
  }

  const position = (cursor) => {
    const point = options.toViewPoint(cursor.point)
    cursor.element.style.transform = `translate(${point.x}px, ${point.y}px)`
  }

  const remove = (clientId) => {
    const cursor = remoteCursors.get(clientId)
    if (!cursor) return
    cursor.element.remove()
    remoteCursors.delete(clientId)
  }

  const upsert = (clientId, author, point, color) => {
    let cursor = remoteCursors.get(clientId)
    if (!cursor) {
      const element = document.createElement('div')
      element.className = 'remote-cursor'

      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      arrow.classList.add('remote-cursor__arrow')
      arrow.setAttribute('width', '20')
      arrow.setAttribute('height', '20')
      arrow.setAttribute('viewBox', '0 0 20 20')
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', CURSOR_PATH)
      path.setAttribute('fill', color)
      path.setAttribute('stroke', 'white')
      path.setAttribute('stroke-width', '0.5')
      arrow.appendChild(path)
      element.appendChild(arrow)

      const name = document.createElement('div')
      name.className = 'remote-cursor__name'
      name.textContent = author
      name.style.backgroundColor = color
      name.style.display = 'inline-block'
      element.appendChild(name)

      element.style.position = 'absolute'
      element.style.left = '0'
      element.style.top = '0'
      element.style.whiteSpace = 'nowrap'
      overlay.appendChild(element)
      cursor = { clientId, author, point, color, element }
      remoteCursors.set(clientId, cursor)
    } else {
      cursor.author = author
      cursor.point = point
      cursor.color = color
      const name = cursor.element.querySelector('.remote-cursor__name')
      if (name) {
        name.textContent = author
        name.style.backgroundColor = color
      }
    }
    position(cursor)
  }

  const render = () => {
    const states = awareness.getStates()
    const activeIds = new Set(states.keys())

    states.forEach((state, clientId) => {
      if (clientId === awareness.clientID) return
      const value = state[cursorField]
      if (!isCursorPoint(value)) {
        remove(clientId)
        return
      }
      const author =
        typeof state[authorField] === 'string' ? state[authorField] : fallbackAuthor(clientId)
      upsert(clientId, author, value, colorForClient(clientId))
    })

    remoteCursors.forEach((_cursor, clientId) => {
      if (!activeIds.has(clientId)) remove(clientId)
    })
  }

  const onChange = () => render()
  const refresh = () => {
    overlay.classList.add('no-transition')
    remoteCursors.forEach(position)
    requestAnimationFrame(() => overlay.classList.remove('no-transition'))
  }

  options.container.addEventListener('pointermove', onPointerMove)
  awareness.on('change', onChange)
  render()

  return {
    overlay,
    refresh,
    dispose: () => {
      options.container.removeEventListener('pointermove', onPointerMove)
      awareness.off('change', onChange)
      if (timer !== null) clearTimeout(timer)
      pendingPoint = null
      awareness.setLocalStateField(cursorField, null)
      remoteCursors.forEach((cursor) => cursor.element.remove())
      remoteCursors.clear()
      overlay.remove()
    }
  }
}

function isCursorPoint(value) {
  if (!value || typeof value !== 'object') return false
  const point = value
  return typeof point.x === 'number' && typeof point.y === 'number'
}
