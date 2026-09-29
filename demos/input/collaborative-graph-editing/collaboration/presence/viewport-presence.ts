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
import type { AwarenessLike } from './cursor-presence'

/** A viewport in the coordinate system chosen by the host callbacks. */
export type ViewportState = { centerX: number; centerY: number; zoom: number }

export type ViewportPeer = {
  clientId: number
  author: string
  viewport: ViewportState
  navigationRootId: string | null
}

export type ViewportPresenceOptions = {
  /** Awareness channel used for transient local and peer viewport state. */
  awareness: AwarenessLike
  /** Reads the local viewport before a throttled awareness broadcast. */
  getViewport: () => ViewportState
  /** Applies a followed peer's viewport; may return an animation promise. */
  applyViewport: (viewport: ViewportState) => void | Promise<void>
  /** Optional local navigation context published with the viewport. */
  getNavigationRootId?: () => string | null
  /** Applies a peer's navigation context; returning false stops following. */
  applyNavigationRootId?: (rootId: string | null) => boolean | void
  /** Cancels an in-progress host viewport animation. */
  cancelViewportAnimation?: () => void
  authorField?: string
  viewportField?: string
  throttleMilliseconds?: number
}

export type ViewportPresenceController = {
  /** Returns peers that currently publish a valid viewport, sorted by author. */
  getPeers: () => ViewportPeer[]
  /** Starts following a peer, returning false when that peer is unavailable. */
  follow: (clientId: number) => boolean
  /** Stops following and cancels the active viewport animation. */
  stopFollowing: () => void
  /** Returns the followed client ID, or null when not following anyone. */
  getFollowedClientId: () => number | null
  /** Re-reads and broadcasts the local viewport immediately or throttled. */
  refresh: () => void
  /** Removes listeners and clears this client's transient viewport fields. */
  dispose: () => void
}

/**
 * Publishes a local viewport through awareness and optionally mirrors another
 * client's viewport. Viewport state is transient presence data, not document
 * state, so it never enters graph synchronization or undo history.
 * Following is local-only. Any local viewport change stops following, a peer
 * that disappears also stops following, and a rejected navigation context
 * prevents the peer's viewport from being applied.
 */
export function createViewportPresence(
  options: ViewportPresenceOptions
): ViewportPresenceController {
  const authorField = options.authorField ?? 'author'
  const viewportField = options.viewportField ?? 'viewport'
  const throttleMilliseconds = options.throttleMilliseconds ?? 100
  let lastBroadcast = 0
  let pendingViewport: ViewportState | null = null
  let timer: number | null = null
  let followedClientId: number | null = null
  let applyingRemoteViewport = false
  let applyingRemoteNavigation = false
  let activeViewportAnimationToken: object | null = null
  let lastAppliedFollowedViewport: ViewportState | null = null
  let lastAppliedFollowedNavigationRootId: string | null = null

  const resetFollowedViewport = (): void => {
    lastAppliedFollowedViewport = null
    lastAppliedFollowedNavigationRootId = null
  }

  const isSameViewport = (left: ViewportState, right: ViewportState): boolean =>
    left.centerX === right.centerX && left.centerY === right.centerY && left.zoom === right.zoom

  const isValidViewport = (value: unknown): value is ViewportState => {
    if (!value || typeof value !== 'object') return false
    const viewport = value as Partial<ViewportState>
    return (
      typeof viewport.centerX === 'number' &&
      Number.isFinite(viewport.centerX) &&
      typeof viewport.centerY === 'number' &&
      Number.isFinite(viewport.centerY) &&
      typeof viewport.zoom === 'number' &&
      Number.isFinite(viewport.zoom) &&
      viewport.zoom > 0
    )
  }

  const broadcast = (viewport: ViewportState): void => {
    lastBroadcast = Date.now()
    options.awareness.setLocalStateField(viewportField, viewport)
    if (options.getNavigationRootId) {
      options.awareness.setLocalStateField('navigationRootId', options.getNavigationRootId())
    }
    pendingViewport = null
  }

  const scheduleBroadcast = (): void => {
    const viewport = options.getViewport()
    const now = Date.now()
    if (now - lastBroadcast >= throttleMilliseconds) {
      broadcast(viewport)
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      return
    }

    pendingViewport = viewport
    if (timer === null) {
      timer = window.setTimeout(
        () => {
          timer = null
          if (pendingViewport) broadcast(pendingViewport)
        },
        throttleMilliseconds - (now - lastBroadcast)
      )
    }
  }

  const getPeers = (): ViewportPeer[] => {
    const peers: ViewportPeer[] = []
    options.awareness.getStates().forEach((state, clientId) => {
      if (clientId === options.awareness.clientID) return
      const viewport = state[viewportField]
      if (!isValidViewport(viewport)) return
      const navigationRootId = state.navigationRootId
      peers.push({
        clientId,
        author: typeof state[authorField] === 'string' ? state[authorField] : `User ${clientId}`,
        viewport,
        navigationRootId:
          typeof navigationRootId === 'string' || navigationRootId === null
            ? navigationRootId
            : null
      })
    })
    return peers.sort((left, right) => left.author.localeCompare(right.author))
  }

  const applyFollowedViewport = (): void => {
    if (followedClientId === null) return
    const peer = getPeers().find(({ clientId }) => clientId === followedClientId)
    if (!peer) {
      cancelViewportAnimation()
      followedClientId = null
      resetFollowedViewport()
      return
    }
    if (
      lastAppliedFollowedViewport &&
      isSameViewport(lastAppliedFollowedViewport, peer.viewport) &&
      lastAppliedFollowedNavigationRootId === peer.navigationRootId
    ) {
      return
    }
    const animationToken = {}
    activeViewportAnimationToken = animationToken
    applyingRemoteViewport = true
    applyingRemoteNavigation = true
    let navigationApplied = true
    try {
      navigationApplied = options.applyNavigationRootId?.(peer.navigationRootId) !== false
    } catch {
      navigationApplied = false
    } finally {
      applyingRemoteNavigation = false
    }
    if (!navigationApplied) {
      cancelViewportAnimation()
      followedClientId = null
      resetFollowedViewport()
      applyingRemoteViewport = false
      return
    }
    const animation = options.applyViewport(peer.viewport)
    lastAppliedFollowedViewport = { ...peer.viewport }
    lastAppliedFollowedNavigationRootId = peer.navigationRootId
    if (animation) {
      void animation
        .catch(() => undefined)
        .finally(() => {
          if (activeViewportAnimationToken === animationToken) {
            activeViewportAnimationToken = null
            applyingRemoteViewport = false
          }
        })
    } else {
      activeViewportAnimationToken = null
      applyingRemoteViewport = false
    }
  }

  const cancelViewportAnimation = (): void => {
    activeViewportAnimationToken = null
    applyingRemoteViewport = true
    try {
      options.cancelViewportAnimation?.()
    } finally {
      applyingRemoteViewport = false
    }
  }

  const onViewportChanged = (): void => {
    if (applyingRemoteViewport || applyingRemoteNavigation) return
    scheduleBroadcast()
    if (followedClientId !== null) {
      followedClientId = null
      resetFollowedViewport()
    }
  }

  const onAwarenessChange = (): void => applyFollowedViewport()

  options.awareness.on('change', onAwarenessChange)
  options.awareness.setLocalStateField(viewportField, options.getViewport())
  if (options.getNavigationRootId) {
    options.awareness.setLocalStateField('navigationRootId', options.getNavigationRootId())
  }

  return {
    getPeers,
    follow: (clientId) => {
      if (!getPeers().some((peer) => peer.clientId === clientId)) return false
      followedClientId = clientId
      resetFollowedViewport()
      applyFollowedViewport()
      return true
    },
    stopFollowing: () => {
      cancelViewportAnimation()
      followedClientId = null
      resetFollowedViewport()
    },
    getFollowedClientId: () => followedClientId,
    refresh: onViewportChanged,
    dispose: () => {
      cancelViewportAnimation()
      options.awareness.off('change', onAwarenessChange)
      if (timer !== null) clearTimeout(timer)
      pendingViewport = null
      options.awareness.setLocalStateField(viewportField, null)
      if (options.getNavigationRootId)
        options.awareness.setLocalStateField('navigationRootId', null)
      followedClientId = null
      resetFollowedViewport()
    }
  }
}
