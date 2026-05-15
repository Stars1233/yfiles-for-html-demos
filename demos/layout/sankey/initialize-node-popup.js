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
import { INode, Point, PopoverDescriptor, PopoverBehavior } from '@yfiles/yfiles'
import './NodePopupComponent'

/**
 * Registers an item clicked listener that shows a popup when a node is clicked.
 */
export function initializeNodePopup(graphComponent) {
  const inputMode = graphComponent.inputMode
  // configures the input mode to show the popup when a node is clicked
  inputMode.addEventListener('item-clicked', (evt) => {
    if (evt.item instanceof INode) {
      const node = evt.item
      const toolbar = document.createElement('node-popup-component')
      toolbar.graphComponent = graphComponent
      toolbar.currentItem = node
      const descriptor = new PopoverDescriptor({
        behavior: PopoverBehavior.AUTO,
        content: toolbar,
        anchor: new Point(
          node.layout.x + node.layout.width,
          node.layout.y + node.layout.height / 2
        ),
        offset: new Point(10, 0),
        ratios: new Point(0, 0.5)
      })
      void inputMode.popoverManager.open(descriptor)
    }
  })
}
