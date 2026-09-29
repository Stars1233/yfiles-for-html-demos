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
import {
  type FoldingManager,
  type GraphComponent,
  type GraphEditorInputMode,
  type INode,
  Point
} from '@yfiles/yfiles'
import type { AwarenessLike } from './cursor-presence'
import { createViewportPresence, type ViewportPresenceController } from './viewport-presence'

export type YFilesViewportPresenceBinding = {
  /** Controller used by application follow-user controls. */
  controller: ViewportPresenceController
  /** Removes graph-component and navigation listeners and disposes the controller. */
  dispose: () => void
}

/**
 * Connects the generic viewport-presence controller to a yFiles graph view.
 * Folding navigation is included in the transient viewport state, so the following
 * user is shown in the same local group context. `nodeById` must be
 * the synchronizer's master-graph identity map when folding is enabled so a
 * published navigation-root ID can be resolved locally.
 */
export function createYFilesViewportPresenceBinding(
  component: GraphComponent,
  awareness: AwarenessLike,
  nodeById: Map<string, INode>,
  foldingView?: ReturnType<FoldingManager['createFoldingView']>,
  navigationInputMode?: GraphEditorInputMode['navigationInputMode']
): YFilesViewportPresenceBinding {
  const controller = createViewportPresence({
    awareness,
    getViewport: () => ({
      centerX: component.viewToWorldCoordinates(
        new Point(component.htmlElement.clientWidth / 2, component.htmlElement.clientHeight / 2)
      ).x,
      centerY: component.viewToWorldCoordinates(
        new Point(component.htmlElement.clientWidth / 2, component.htmlElement.clientHeight / 2)
      ).y,
      zoom: component.zoom
    }),
    applyViewport: (viewport) =>
      component.zoomToAnimated(viewport.zoom, new Point(viewport.centerX, viewport.centerY)),
    getNavigationRootId: () => {
      const root = foldingView?.localRoot
      if (!root) return null
      const tag = root.tag as { id?: unknown } | undefined
      return typeof tag?.id === 'string' ? tag.id : null
    },
    applyNavigationRootId: (rootId): boolean => {
      if (!foldingView || !navigationInputMode) return true
      if (rootId === null) {
        while (foldingView.localRoot) {
          navigationInputMode.exitGroup()
        }
        return true
      }
      const root = nodeById.get(rootId)
      if (!root) return false
      if (foldingView.localRoot !== root) navigationInputMode.enterGroup(root)
      return foldingView.localRoot === root
    },
    cancelViewportAnimation: () => {
      const currentViewPoint = component.viewPoint
      // Cancel the zoom animation by setting the zoom to the current zoom value.
      component.zoom = component.zoom
      component.viewPoint = new Point(currentViewPoint.x, currentViewPoint.y)
    }
  })

  const onViewportChanged = (): void => controller.refresh()
  component.addEventListener('viewport-changed', onViewportChanged)

  const refreshNavigationPresence = (): void => controller.refresh()
  navigationInputMode?.addEventListener('group-entered', refreshNavigationPresence)
  navigationInputMode?.addEventListener('group-exited', refreshNavigationPresence)

  return {
    controller,
    dispose: () => {
      component.removeEventListener('viewport-changed', onViewportChanged)
      navigationInputMode?.removeEventListener('group-entered', refreshNavigationPresence)
      navigationInputMode?.removeEventListener('group-exited', refreshNavigationPresence)
      controller.dispose()
    }
  }
}
