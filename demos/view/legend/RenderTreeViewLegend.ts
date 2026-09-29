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
  BaseClass,
  type GraphComponent,
  type GraphViewerInputMode,
  IBoundsProvider,
  type ICanvasContext,
  IHitTestable,
  IObjectRenderer,
  type IRenderContext,
  type IRenderTreeElement,
  IVisibilityTestable,
  IVisualCreator,
  Point,
  Rect,
  Size,
  SvgVisual,
  SvgVisualGroup,
  type Visual
} from '@yfiles/yfiles'
import type { NodeTypeId } from './node-types'
import { LegendBase } from './LegendBase'
import {
  RenderTreeLegendMoveInputMode,
  RenderTreeLegendPosition
} from './RenderTreeLegendMoveInputMode'

const LEGEND_MARGIN = 16
const MIN_LEGEND_SCALE = 0.5
type ViewLegendRenderTag = {
  legendVisual: SVGGElement
  size: Size
  position: Point
  scale: number
  hasCustomPosition: boolean
}

/**
 * Legend built from an SVG export of a graph, added to the render tree of the graph component,
 * rendered in view coordinates.
 */
export class RenderTreeViewLegend extends LegendBase {
  private legendElement: IRenderTreeElement | null = null
  private readonly legendPosition: RenderTreeLegendPosition

  constructor(graphComponent: GraphComponent, inputMode: GraphViewerInputMode) {
    super(graphComponent)
    // create a custom position handler used for dragging the legend
    this.legendPosition = new RenderTreeLegendPosition(this.updateLegendPosition)
    // add a custom legend move input mode to the main input mode
    inputMode.add(
      new RenderTreeLegendMoveInputMode(
        graphComponent,
        this.getLegendBounds,
        this.legendPosition.getPosition,
        this.legendPosition.setPosition,
        true
      )
    )
  }

  protected override onHide(): void {
    if (this.legendElement) {
      this.graphComponent.renderTree.remove(this.legendElement)
      this.legendElement = null
    }
  }

  protected override refreshCore(visibleTypes: ReadonlySet<NodeTypeId>): void {
    // create the SVG visual
    const { legendVisual, size } = this.createLegendVisual(visibleTypes)
    legendVisual.setAttribute('data-legend-type', 'view')
    const layout = this.calculateLegendLayout(size)
    const position = this.legendPosition.setDefaultPosition(layout.position)
    const renderTag: ViewLegendRenderTag = {
      legendVisual,
      size,
      position,
      scale: layout.scale,
      hasCustomPosition: this.legendPosition.isManualPosition!
    }

    if (!this.legendElement) {
      // if there is no render tree element yet, add one with its dedicated renderer
      this.legendElement = this.graphComponent.renderTree.createElement(
        this.graphComponent.renderTree.foregroundGroup,
        renderTag,
        new ViewCoordinatesLegendRenderer(this.updateLegendLayout)
      )
    } else {
      // if there is already a render tree element, update its tag and invalidate the graph component
      // to trigger a redrawing
      this.legendElement.tag = renderTag
      this.graphComponent.invalidate()
    }
  }

  /**
   * Returns the render tag of the legend including its visual, size, position, and scale.
   */
  private getRenderTag(): ViewLegendRenderTag | null {
    return (this.legendElement?.tag as ViewLegendRenderTag | undefined) ?? null
  }

  /**
   * Returns the bounds of the legend used for hit testing in the move input mode.
   */
  private getLegendBounds = (): Rect | null => {
    const renderTag = this.getRenderTag()
    if (!renderTag) {
      return null
    }
    return new Rect(
      renderTag.position,
      new Size(renderTag.size.width * renderTag.scale, renderTag.size.height * renderTag.scale)
    )
  }

  /**
   * Updates the legend position and invalidates the graph component.
   */
  private updateLegendPosition = (position: Point): void => {
    if (this.legendElement) {
      this.legendElement.tag = { ...this.getRenderTag()!, position }
      this.graphComponent.invalidate()
    }
  }

  /**
   * Updates the legend layout when the graph component size changes.
   */
  private updateLegendLayout = (renderTag: ViewLegendRenderTag): void => {
    const layout = this.calculateLegendLayout(renderTag.size)
    renderTag.position = this.legendPosition.setDefaultPosition(layout.position)
    renderTag.scale = layout.scale
  }

  /**
   * Calculates the legend size and position considering the current orientation.
   * Potentially scales the legend down to fit inside the graph component.
   */
  private calculateLegendLayout(size: Size): { position: Point; scale: number } {
    const { width: gcWidth, height: gcHeight } = this.graphComponent.size
    const legendWidth = size.width
    const legendHeight = size.height
    const availableWidth = this.horizontal ? gcWidth - 2 * LEGEND_MARGIN : gcWidth - LEGEND_MARGIN
    const availableHeight = this.horizontal
      ? gcHeight - LEGEND_MARGIN
      : gcHeight - 2 * LEGEND_MARGIN
    const scale = Math.max(
      MIN_LEGEND_SCALE,
      Math.min(1, availableWidth / legendWidth, availableHeight / legendHeight)
    )
    const scaledWidth = legendWidth * scale
    const scaledHeight = legendHeight * scale
    const defaultPosition = new Point(
      this.horizontal ? (gcWidth - scaledWidth) / 2 : gcWidth - scaledWidth - LEGEND_MARGIN,
      this.horizontal ? gcHeight - scaledHeight - LEGEND_MARGIN : (gcHeight - scaledHeight) / 2
    )

    return { position: defaultPosition, scale }
  }
}

class ViewCoordinatesLegendRenderer extends BaseClass(
  IObjectRenderer,
  IVisualCreator,
  IBoundsProvider
) {
  private renderTag: ViewLegendRenderTag | null = null
  private readonly updateLegendLayout: (renderTag: ViewLegendRenderTag) => void

  constructor(updateLegendLayout: (renderTag: ViewLegendRenderTag) => void) {
    super()
    this.updateLegendLayout = updateLegendLayout
  }

  createVisual(context: IRenderContext): Visual | null {
    if (!this.renderTag) {
      return null
    }

    // set a view transform
    const group = new SvgVisualGroup()
    group.transform = context.viewTransform

    const visual = new SvgVisual(this.renderTag.legendVisual)
    this.updateLegendPosition(context, visual, this.renderTag)
    group.add(visual)

    return group
  }

  updateVisual(context: IRenderContext, oldVisual: Visual | null): Visual | null {
    if (this.renderTag && oldVisual instanceof SvgVisualGroup && oldVisual.children.size > 0) {
      oldVisual.transform = context.viewTransform
      const visual = oldVisual.children.get(0) as SvgVisual
      if (visual.svgElement === this.renderTag.legendVisual) {
        this.updateLegendPosition(context, visual, this.renderTag)
        return oldVisual
      }
    }

    return this.createVisual(context)
  }

  /**
   * Positions the given SVG visual at the location stored in the render tag.
   */
  private updateLegendPosition(
    _context: IRenderContext,
    visual: SvgVisual,
    renderTag: ViewLegendRenderTag
  ): void {
    const svgGroup = visual.svgElement as SVGGElement
    if (renderTag.size.width <= 0 || renderTag.size.height <= 0) {
      return
    }
    if (!renderTag.hasCustomPosition) {
      this.updateLegendLayout(renderTag)
    }
    svgGroup.setAttribute(
      'transform',
      `translate(${renderTag.position.x} ${renderTag.position.y}) scale(${renderTag.scale})`
    )
  }

  getBoundsProvider(renderTag: ViewLegendRenderTag): IBoundsProvider {
    this.renderTag = renderTag
    return this
  }

  getHitTestable(_renderTag: ViewLegendRenderTag): IHitTestable {
    return IHitTestable.NEVER
  }

  getVisibilityTestable(_renderTag: ViewLegendRenderTag): IVisibilityTestable {
    return IVisibilityTestable.ALWAYS
  }

  getVisualCreator(renderTag: ViewLegendRenderTag): IVisualCreator {
    this.renderTag = renderTag
    return this
  }

  getBounds(_context: ICanvasContext): Rect {
    if (!this.renderTag) {
      return Rect.EMPTY
    }
    return Rect.INFINITE
  }
}
