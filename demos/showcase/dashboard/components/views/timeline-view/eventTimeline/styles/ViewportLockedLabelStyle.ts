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
  type GraphComponent,
  type ICanvasContext,
  IEdge,
  IEdgeStyle,
  type IInputModeContext,
  type ILabel,
  type ILabelStyle,
  INode,
  Insets,
  type IRenderContext,
  OrientedRectangle,
  type Point,
  PolylineEdgeStyle,
  type Rect,
  SimpleLabel,
  type Visual
} from '@yfiles/yfiles'
import type { SubgraphTag } from '../EventTimelineTypes'

type LockingOrientation = 'horizontal' | 'vertical'

/**
 * A label style which keeps its labels within the viewport as long as the edge/node it is
 * attached to is still in view. The style keeps track of three things, i.e.,
 * - direction: a string describing whether the label is 'horizontal' or 'vertical'
 * - wrappedStyle: the base style to be kept in the viewport
 * - cssClass: the (optional) cssClass of the label
 * - padding: the padding insets around the text of the label
 */
export class ViewportLockedLabelStyle extends DelegatingLabelStyle {
  readonly wrappedStyle: ILabelStyle
  readonly direction: LockingOrientation
  private readonly padding: Insets
  private readonly standInLabel: SimpleLabel
  private readonly dynamicLayout: OrientedRectangle

  /**
   * Creates a new label style instance
   * @param wrappedStyle the base style to be kept in the viewport
   * @param direction a string describing whether the label is 'horizontal' or 'vertical'
   * @param padding the padding insets around the viewport to place the labels at
   */
  constructor(
    wrappedStyle: ILabelStyle,
    direction: LockingOrientation,
    padding: Insets = new Insets(10)
  ) {
    super()
    const dynamicLayout = new OrientedRectangle()
    this.dynamicLayout = dynamicLayout
    this.standInLabel = new SimpleLabel(null, '', new FreeLabelModel().createDynamic(dynamicLayout))
    this.direction = direction
    this.wrappedStyle = wrappedStyle
    this.padding = padding
  }

  /**
   * Gets the style's wrapped style
   * @param _ the graph model-level label object
   * @returns the wrapped style
   * @protected
   */
  protected getStyle(_: ILabel): ILabelStyle {
    return this.wrappedStyle
  }

  /**
   * Gets the stand-in ILabel of a given label.
   * @param label the ILabel whose stand-in is to be returned
   * @protected
   * @returns the stand-in ILabel object
   */
  protected override getLabel(label: ILabel): ILabel {
    this.standInLabel.style = label.style
    this.standInLabel.text = label.text
    this.standInLabel.tag = label.tag as unknown
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
  protected override createVisual(context: IRenderContext, label: ILabel): Visual | null {
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
  protected override updateVisual(
    context: IRenderContext,
    g: Visual,
    label: ILabel
  ): Visual | null {
    this.updateOffset(context, label)
    return super.updateVisual(context, g, label)
  }

  /**
   * Calculates the offset of the label based on the viewport's position and size
   * @param context the visualization's IRenderContext
   * @param label the graph model-level label object
   */
  private updateOffset(context: ICanvasContext, label: ILabel): void {
    const graph = (context.canvasComponent as GraphComponent).graph
    const isSubgraph = !!graph.tag && (graph.tag as SubgraphTag).subgraph
    const padding = isSubgraph ? new Insets(10) : this.padding
    const viewport = context.canvasComponent.viewport.getReduced(padding)
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
  protected getBounds(context: ICanvasContext, label: ILabel): Rect {
    this.updateOffset(context, label)
    return super.getBounds(context, label)
  }

  /**
   * Uses the same viewport-adjusted layout for hit testing as for rendering.
   * @param context the input mode context of the hit test
   * @param location the world coordinate to test
   * @param label the graph model-level label object
   * @protected
   * @returns whether the label visual is hit at the given location
   */
  protected isHit(context: IInputModeContext, location: Point, label: ILabel): boolean {
    this.updateOffset(context, label)
    return super.isHit(context, location, label)
  }

  /**
   * Check whether the label is visible or not
   * @param context the visualization's IRenderContext
   * @param rectangle the rectangle describing the bounds of the screen
   * @param label the graph model-level label object
   * @returns a boolean flag indicating whether the label is visible or not
   * @protected
   */
  protected isVisible(context: ICanvasContext, rectangle: Rect, label: ILabel): boolean {
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
