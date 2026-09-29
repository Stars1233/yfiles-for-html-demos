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
import type { GraphComponent } from '@yfiles/yfiles'
import type { AwarenessLike, ViewportPresenceController } from './collaboration'

export type FollowUserUIOptions = {
  component: GraphComponent
  awareness: AwarenessLike
  controller: ViewportPresenceController
  colorForClient: (clientId: number) => string
}

/**
 * Binds the follow-user toolbar and local-interaction cancellation to a
 * viewport-presence controller.
 */
export function initializeFollowUserUI(options: FollowUserUIOptions): () => void {
  const { component, awareness, controller, colorForClient } = options
  const select = document.querySelector<HTMLSelectElement>('#follow-user-select')!
  const stopButton = document.querySelector<HTMLButtonElement>('#stop-following-button')!
  const status = document.querySelector<HTMLElement>('#following-status')!
  const layoutStatus = document.querySelector<HTMLElement>('#layout-status')!
  const graphElement = component.htmlElement
  const layoutStatusParent = layoutStatus.parentNode
  const layoutStatusNextSibling = layoutStatus.nextSibling
  graphElement.append(layoutStatus)
  const layoutIcon = document.createElement('span')
  layoutIcon.className = 'inline-icon material-symbols-outlined'
  layoutIcon.textContent = 'sync'
  layoutIcon.setAttribute('aria-hidden', 'true')
  const layoutMessage = document.createElement('span')
  layoutStatus.replaceChildren(layoutIcon, layoutMessage)
  let layoutTimer: number | null = null

  const renderLayoutStatus = (): void => {
    if (layoutTimer !== null) {
      window.clearTimeout(layoutTimer)
      layoutTimer = null
    }

    const now = Date.now()
    const layouts = Array.from(awareness.getStates().entries())
      .map(([clientId, state]) => ({
        clientId,
        layout: state['collaborativeLayout'],
        author: state.author
      }))
      .filter(({ layout }) => isActiveLayout(layout, now))
      .sort((left, right) => compareLayouts(left.layout, right.layout))
    const current = layouts.at(0)

    if (!current || !isLayoutState(current.layout)) {
      layoutStatus.hidden = true
      layoutMessage.textContent = ''
      layoutStatus.removeAttribute('title')
      graphElement.classList.remove('layout-in-progress')
      return
    }

    const author = typeof current.author === 'string' ? current.author : `User ${current.clientId}`
    layoutStatus.hidden = false
    graphElement.classList.add('layout-in-progress')
    layoutMessage.textContent =
      current.layout.phase === 'scheduled'
        ? `${author} is preparing a layout…`
        : `${author} is applying a layout…`
    layoutStatus.title = `Editing is paused while ${author} applies the layout`
    layoutTimer = window.setTimeout(
      renderLayoutStatus,
      Math.max(100, current.layout.startAt + current.layout.durationMilliseconds + 500 - now)
    )
  }

  const renderPeers = (): void => {
    const selectedClientId = controller.getFollowedClientId()
    select.replaceChildren(new Option('Select User to Follow…', ''))
    const peers = controller.getPeers()
    const selectedPeer = peers.find(({ clientId }) => clientId === selectedClientId)
    for (const peer of peers) {
      select.add(new Option(peer.author, String(peer.clientId)))
    }
    select.value = selectedPeer ? String(selectedPeer.clientId) : ''
    stopButton.style.display = selectedPeer ? 'flex' : 'none'
    status.textContent = selectedPeer ? `Stop following ${selectedPeer.author}` : ''
    if (!selectedPeer) {
      graphElement.classList.remove('following-user')
      graphElement.style.removeProperty('--following-user-color')
    } else {
      graphElement.classList.add('following-user')
      graphElement.style.setProperty(
        '--following-user-color',
        colorForClient(selectedPeer.clientId)
      )
    }
  }

  const onSelectChanged = (): void => {
    const clientId = Number(select.value)
    if (select.value && controller.follow(clientId)) {
      renderPeers()
      return
    }
    controller.stopFollowing()
    renderPeers()
  }
  const onStopFollowing = (): void => {
    controller.stopFollowing()
    renderPeers()
  }
  select.addEventListener('change', onSelectChanged)
  stopButton.addEventListener('click', onStopFollowing)

  const onLocalInteraction = (): void => {
    if (controller.getFollowedClientId() === null) return
    controller.stopFollowing()
    renderPeers()
  }
  graphElement.addEventListener('pointerdown', onLocalInteraction)
  graphElement.addEventListener('wheel', onLocalInteraction)
  graphElement.addEventListener('keydown', onLocalInteraction)

  const onViewportChanged = (): void => renderPeers()
  const onAwarenessChanged = (): void => {
    renderPeers()
    renderLayoutStatus()
  }
  component.addEventListener('viewport-changed', onViewportChanged)

  awareness.on('change', onAwarenessChanged)
  renderPeers()
  renderLayoutStatus()

  return () => {
    select.removeEventListener('change', onSelectChanged)
    stopButton.removeEventListener('click', onStopFollowing)
    graphElement.removeEventListener('pointerdown', onLocalInteraction)
    graphElement.removeEventListener('wheel', onLocalInteraction)
    graphElement.removeEventListener('keydown', onLocalInteraction)
    component.removeEventListener('viewport-changed', onViewportChanged)
    awareness.off('change', onAwarenessChanged)
    if (layoutTimer !== null) window.clearTimeout(layoutTimer)
    layoutTimer = null
    layoutStatus.hidden = true
    layoutMessage.textContent = ''
    layoutStatus.removeAttribute('title')
    layoutStatus.replaceChildren()
    if (layoutStatusParent) {
      layoutStatusParent.insertBefore(layoutStatus, layoutStatusNextSibling)
    }
    graphElement.classList.remove('layout-in-progress')
    graphElement.classList.remove('following-user')
    graphElement.style.removeProperty('--following-user-color')
  }
}

type LayoutAwarenessState = {
  id: string
  ownerId: number
  phase: 'scheduled' | 'committed'
  startAt: number
  durationMilliseconds: number
}

function isLayoutState(value: unknown): value is LayoutAwarenessState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<LayoutAwarenessState>
  return (
    typeof state.id === 'string' &&
    typeof state.ownerId === 'number' &&
    (state.phase === 'scheduled' || state.phase === 'committed') &&
    typeof state.startAt === 'number' &&
    typeof state.durationMilliseconds === 'number' &&
    state.durationMilliseconds > 0
  )
}

function isActiveLayout(value: unknown, now: number): value is LayoutAwarenessState {
  return isLayoutState(value) && value.startAt + value.durationMilliseconds + 500 >= now
}

function compareLayouts(left: unknown, right: unknown): number {
  if (!isLayoutState(left) || !isLayoutState(right)) return 0
  return (
    left.startAt - right.startAt || left.ownerId - right.ownerId || left.id.localeCompare(right.id)
  )
}
