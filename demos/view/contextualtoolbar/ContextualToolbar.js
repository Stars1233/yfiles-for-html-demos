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
  IEdge,
  ILabel,
  INode,
  IOrientedRectangle,
  MutableRectangle,
  Point,
  PopoverDescriptor,
  PopoverBehavior,
  ShapeNodeStyle
} from '@yfiles/yfiles'

import './ContextualToolbarComponent'
import {} from './ContextualToolbarComponent'

/**
 * Adds a HTML panel on top of the contents of the GraphComponent that is used as a container for the contextual
 * toolbar.
 * This implementation expects the node, edge and label styles to be of
 * type {@link ShapeNodeStyle}, {@link PolylineEdgeStyle} and
 * {@link LabelStyle}.
 */
export class ContextualToolbar {
  _selectedItems
  graphComponent
  currentPopoverDescriptor = null

  dirty = false
  currentToolbarComponent = null

  /**
   * Sets the items to display the contextual toolbar for.
   * Setting this property to a value other than null shows the toolbar.
   * Setting the property to null hides the toolbar.
   */
  set selectedItems(array) {
    if (!array) {
      throw "SelectedItems can't be null. To hide the toolbar, set an empty array."
    }
    this._selectedItems = array

    if (this.currentToolbarComponent) {
      this.currentToolbarComponent.selectedItems = array
    }

    if (array.length > 0) {
      this.show()
    } else {
      this.hide()
    }
  }

  /**
   * Gets the items to display information for.
   */
  get selectedItems() {
    return this._selectedItems
  }

  /**
   * Constructs a new instance of the ContextualToolbar.
   */
  constructor(graphComponent) {
    this.graphComponent = graphComponent
    this._selectedItems = []
    this.registerUpdateListeners()
  }

  /**
   * Makes this toolbar visible near the given items.
   */
  async show() {
    if (!this.currentPopoverDescriptor) {
      const toolbar = document.createElement('contextual-toolbar-component')
      toolbar.graphComponent = this.graphComponent
      toolbar.selectedItems = this.selectedItems
      const descriptor = new PopoverDescriptor({
        behavior: PopoverBehavior.MANUAL,
        content: toolbar,
        offset: new Point(0, -20),
        ratios: new Point(0.5, 1)
      })

      this.currentToolbarComponent = toolbar
      this.currentPopoverDescriptor = descriptor

      const mode = this.graphComponent.inputMode
      await mode.popoverManager.open(this.currentPopoverDescriptor)
    }

    this.updateLocation()
  }

  /**
   * Hides this toolbar.
   */
  hide() {
    this.currentPopoverDescriptor?.close()
    this.currentPopoverDescriptor = null
    this.currentToolbarComponent = null
  }

  /**
   * Changes the location of toolbar to the location calculated by a label model parameter.
   * Depending on the selection, either an edge specific label model is used, or a node label model
   * that uses the union of all selected elements to place the toolbar above that union.
   */
  updateLocation() {
    if (this.selectedItems.length === 0) {
      return
    }

    const selectedBounds = this.getEnclosingRect()
    this.currentPopoverDescriptor.anchor = new Point(
      selectedBounds.x + selectedBounds.width / 2,
      selectedBounds.y
    )
  }

  /**
   * Returns the union rectangle of the selected nodes and labels.
   */
  getEnclosingRect() {
    const enclosingRect = new MutableRectangle()
    for (const item of this.selectedItems) {
      if (item instanceof INode || item instanceof ILabel) {
        // we need the axis-parallel bounding rectangle, thus look out for oriented rectangles of the labels
        const bounds = item.layout instanceof IOrientedRectangle ? item.layout.bounds : item.layout
        enclosingRect.add(bounds)
      } else if (item instanceof IEdge) {
        const bounds = item.style.renderer
          .getBoundsProvider(item, item.style)
          .getBounds(this.graphComponent.canvasContext)
        enclosingRect.add(bounds)
      }
    }
    return enclosingRect
  }

  /**
   * Adds listeners for graph changes to update the location or state of the toolbar accordingly.
   */
  registerUpdateListeners() {
    this.graphComponent.graph.addEventListener('node-layout-changed', () => {
      if (this.selectedItems.length > 0) {
        this.dirty = true
      }
    })
    this.graphComponent.addEventListener('updated-visual', () => {
      if (this.selectedItems.length > 0 && this.dirty) {
        this.dirty = false
        this.updateLocation()
      }
    })
    this.graphComponent.clipboard.addEventListener('items-cut', () => this.hide())
  }
}
