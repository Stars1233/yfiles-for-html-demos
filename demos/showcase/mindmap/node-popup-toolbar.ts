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
  type GraphComponent,
  type GraphEditorInputMode,
  INode,
  Point,
  PopoverDescriptor,
  PopoverBehavior
} from '@yfiles/yfiles'
import './MindMapPopupComponent'

/**
 * Creates and initializes the node popup.
 * This popup provides the means to:
 * (i) change the state icon and the color of a node,
 * (ii) create cross-reference edges
 * (iii) add a child node or remove the node itself.
 */
export function initializeNodePopups(graphComponent: GraphComponent): void {
  const inputMode = graphComponent.inputMode as GraphEditorInputMode
  graphComponent.selection.addEventListener('item-added', (evt) => {
    if (evt.item instanceof INode) {
      showToolbar(graphComponent, evt.item)
    }
  })

  inputMode.addEventListener('item-right-clicked', (evt) => {
    if (evt.item instanceof INode) {
      showToolbar(graphComponent, evt.item)
    }
  })

  inputMode.moveSelectedItemsInputMode.addEventListener('drag-started', () =>
    hidePopup(graphComponent)
  )

  graphComponent.selection.addEventListener('item-removed', () => {
    hidePopup(graphComponent)
  })
}

/**
 * Hides the popup element along with its components.
 */
export function hidePopup(graphComponent: GraphComponent): void {
  const inputMode = graphComponent.inputMode as GraphEditorInputMode
  inputMode.popoverManager.closeAll()
}

/**
 * Shows the toolbar center above the given node.
 */
function showToolbar(graphComponent: GraphComponent, node: INode): void {
  const toolbar = document.createElement('mindmap-popup-component')
  toolbar.graphComponent = graphComponent
  toolbar.currentItem = node
  const descriptor = new PopoverDescriptor({
    behavior: PopoverBehavior.AUTO,
    content: toolbar,
    anchor: new Point(node.layout.x + node.layout.width / 2, node.layout.y),
    offset: new Point(0, -10),
    ratios: new Point(0.5, 1)
  })

  const inputMode = graphComponent.inputMode as GraphEditorInputMode
  void inputMode.popoverManager.open(descriptor)
}
