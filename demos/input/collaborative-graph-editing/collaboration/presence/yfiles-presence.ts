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
import {
  type AwarenessLike,
  createCursorPresence,
  type CursorPresenceController
} from './cursor-presence'
import {
  createYFilesViewportPresenceBinding,
  type YFilesViewportPresenceBinding
} from './yfiles-viewport-presence'

export type YFilesPresenceOptions = {
  component: GraphComponent
  awareness: AwarenessLike
  nodeById: Map<string, INode>
  foldingView?: ReturnType<FoldingManager['createFoldingView']>
  navigationInputMode?: GraphEditorInputMode['navigationInputMode']
  /** Optional author name stored in the shared `author` awareness field. */
  author?: string
  colorForClient?: (clientId: number) => string
  fallbackAuthor?: (clientId: number) => string
}

export type YFilesPresence = {
  cursor: CursorPresenceController
  viewport: YFilesViewportPresenceBinding
  dispose: () => void
}

/**
 * Connects cursor and viewport presence to a yFiles graph component. UI such
 * as follow-user controls belongs to the consuming application. The
 * lower-level presence primitives remain available when an application needs
 * different coordinate behavior. The component's world coordinates are used
 * for cursor and viewport state, while remote cursors are rendered relative to
 * the component element. Disposal removes presence listeners and transient
 * cursor/viewport state and also disposes of the generated overlay.
 */
export function createYFilesPresence(options: YFilesPresenceOptions): YFilesPresence {
  const {
    component,
    awareness,
    nodeById,
    foldingView,
    navigationInputMode,
    author,
    colorForClient = () => '#3b82f6',
    fallbackAuthor = (clientId) => `User ${clientId}`
  } = options

  if (author) awareness.setLocalStateField('author', author)
  const cursor = createCursorPresence(awareness, {
    container: component.htmlElement,
    getPoint: (event) => {
      const rect = component.htmlElement.getBoundingClientRect()
      const viewPoint = new Point(event.clientX - rect.left, event.clientY - rect.top)
      const worldPoint = component.viewToWorldCoordinates(viewPoint)
      return { x: worldPoint.x, y: worldPoint.y }
    },
    toViewPoint: (point) => {
      const viewPoint = component.worldToViewCoordinates(new Point(point.x, point.y))
      return { x: viewPoint.x, y: viewPoint.y }
    },
    colorForClient,
    fallbackAuthor
  })
  const onViewportChanged = (): void => cursor.refresh()
  component.addEventListener('viewport-changed', onViewportChanged)

  const viewport = createYFilesViewportPresenceBinding(
    component,
    awareness,
    nodeById,
    foldingView,
    navigationInputMode
  )
  return {
    cursor,
    viewport,
    dispose: () => {
      component.removeEventListener('viewport-changed', onViewportChanged)
      viewport.dispose()
      cursor.dispose()
    }
  }
}
