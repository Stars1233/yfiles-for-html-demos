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
  DelegatingLabelStyle,
  FreeLabelModel,
  IEdge,
  IEdgeStyle,
  INode,
  Insets,
  OrientedRectangle,
  PolylineEdgeStyle,
  SimpleLabel
} from '@yfiles/yfiles'

/**
 * A label style which keeps its labels within the viewport as long as the edge/node it is
 * attached to is still in view. The style keeps track of three things, i.e.,
 * - direction: a string describing whether the label is 'horizontal' or 'vertical'
 * - wrappedStyle: the base style to be kept in the viewport
 * - cssClass: the (optional) cssClass of the label
 * - padding: the padding insets around the text of the label
 */
export class ViewportLockedLabelStyle extends DelegatingLabelStyle {
  wrappedStyle
  direction
  padding = new Insets(10)
  standInLabel
  dynamicLayout

  /**
   * Creates a new label style instance
   * @param wrappedStyle the base style to be kept in the viewport
   * @param direction a string describing whether the label is 'horizontal' or 'vertical'
   */
  constructor(wrappedStyle, direction) {
    super()
    const dynamicLayout = new OrientedRectangle()
    this.dynamicLayout = dynamicLayout
    this.standInLabel = new SimpleLabel(null, '', new FreeLabelModel().createDynamic(dynamicLayout))
    this.direction = direction
    this.wrappedStyle = wrappedStyle
  }

  /**
   * Gets the style's wrapped style
   * @param _ the graph model-level label object
   * @returns the wrapped style
   * @protected
   */
  getStyle(_) {
    return this.wrappedStyle
  }

  /**
   * Gets the stand-in ILabel of a given label.
   * @param label the ILabel whose stand-in is to be returned
   * @protected
   * @returns the stand-in ILabel object
   */
  getLabel(label) {
    this.standInLabel.style = label.style
    this.standInLabel.text = label.text
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.standInLabel.tag = label.tag
    this.standInLabel.owner = label.owner
    return this.standInLabel
  }

  /**
   * Creates a mew Visual for the given ILabel object.
   * @param context fhe IRenderContext of the given label
   * @param label the ILabel object to be visualized
   * @protected
   * @returns the newly created Visual
   */
  createVisual(context, label) {
    this.updateOffset(context, label)
    return super.createVisual(context, label)
  }

  /**
   * Updates the current label's visual
   * @param context the visualization's IRenderContext
   * @param g the SVGVisualGroup to update
   * @param label the graph model-level label object
   * @protected
   * @returns the updated Visual.
   */
  updateVisual(context, g, label) {
    this.updateOffset(context, label)
    return super.updateVisual(context, g, label)
  }

  /**
   * Calculates the offset of the label based on the viewport's position and size
   * @param context the visualization's IRenderContext
   * @param label the graph model-level label object
   */
  updateOffset(context, label) {
    const viewport = context.canvasComponent.viewport.getReduced(this.padding)
    const wrappedStyle = this.getStyle(label)
    const labelBounds = wrappedStyle.renderer
      .getBoundsProvider(label, wrappedStyle)
      .getBounds(context)
    let dx = 0,
      dy = 0
    if (this.direction === 'horizontal') {
      if (labelBounds.x < viewport.x) {
        dx = viewport.x - labelBounds.x
      } else if (labelBounds.maxX > viewport.maxX) {
        dx = viewport.maxX - labelBounds.maxX
      }
    } else {
      if (labelBounds.y < viewport.y) {
        dy = viewport.y - labelBounds.y
      } else if (labelBounds.maxY > viewport.maxY) {
        dy = viewport.maxY - labelBounds.maxY
      }
    }
    this.dynamicLayout.setShape(label.layout)
    this.dynamicLayout.x += dx
    this.dynamicLayout.y += dy
  }

  /**
   * Gets the bounds of the given label
   * @param context the ICanvasContext of the given label
   * @param label the given ILabel object
   * @protected
   * @returns the bounds of the given label.
   */
  getBounds(context, label) {
    this.dynamicLayout.setShape(label.layout)
    return super.getBounds(context, label)
  }

  /**
   * Check whether the label is visible or not
   * @param context the visualization's IRenderContext
   * @param rectangle the rectangle describing the bounds of the screen
   * @param label the graph model-level label object
   * @returns a boolean flag indicating whether the label is visible or not
   * @protected
   */
  isVisible(context, rectangle, label) {
    const owner = label.owner
    if (owner instanceof INode) {
      return (
        // we are visible if the original layout is in the viewport
        owner.style.renderer
          .getVisibilityTestable(owner, owner.style)
          .isVisible(context, rectangle) ||
        // or the original, unmodified location is in the viewport
        label.layout.bounds.intersects(rectangle)
      )
    } else if (owner instanceof IEdge) {
      let style = owner.style
      if (style === IEdgeStyle.VOID_EDGE_STYLE) {
        style = new PolylineEdgeStyle()
      }
      return (
        // we are visible if the original layout is in the viewport
        style.renderer.getVisibilityTestable(owner, style).isVisible(context, rectangle) ||
        // or the original, unmodified location is in the viewport
        label.layout.bounds.intersects(rectangle)
      )
    }
    return false
  }
}
