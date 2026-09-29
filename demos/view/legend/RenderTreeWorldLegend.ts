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
  type Visual
} from '@yfiles/yfiles'
import { LegendBase } from './LegendBase'
import type { NodeTypeId } from './node-types'
import {
  RenderTreeLegendMoveInputMode,
  RenderTreeLegendPosition
} from './RenderTreeLegendMoveInputMode'

type WorldLegendRenderTag = { legendVisual: SVGGElement; bounds: Rect }

/**
 * Legend built from an SVG export of a graph, added to the render tree of the graph component.
 */
export class RenderTreeWorldLegend extends LegendBase {
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
        false
      )
    )
  }

  protected override onHide(): void {
    if (this.legendElement) {
      this.graphComponent.renderTree.remove(this.legendElement)
      this.graphComponent.updateContentBounds()
      this.legendElement = null
    }
  }

  protected override refreshCore(visibleTypes: ReadonlySet<NodeTypeId>): void {
    if (this.legendElement) {
      // remove the old legend from the render tree and reset the content bounds
      this.graphComponent.renderTree.remove(this.legendElement)
      this.graphComponent.updateContentBounds()
    }

    // calculate the position of the legend (top right or bottom left)
    const legendAnchor = this.horizontal
      ? this.graphComponent.contentBounds.bottomLeft
      : this.graphComponent.contentBounds.topRight
    const LEGEND_OFFSET = 60
    const position = this.legendPosition.setDefaultPosition(
      new Point(
        this.horizontal ? legendAnchor.x : legendAnchor.x + LEGEND_OFFSET,
        this.horizontal ? legendAnchor.y + LEGEND_OFFSET : legendAnchor.y
      )
    )

    // create the SVG visual
    const { legendVisual, size } = this.createLegendVisual(visibleTypes)
    legendVisual.setAttribute('data-legend-type', 'world')
    // position the legend at the desired location in world coordinates
    SvgVisual.setTranslate(legendVisual, position.x, position.y)

    const renderTag: WorldLegendRenderTag = { legendVisual, bounds: new Rect(position, size) }

    // Add the visual to the content group where the graph lives too. This way its bounds are
    // considered in fitGraphBounds.
    this.legendElement = this.graphComponent.renderTree.createElement(
      this.graphComponent.renderTree.contentGroup,
      renderTag,
      new WorldCoordinatesLegendRenderer()
    )
    // Update to include the legend visual in the content bounds
    this.graphComponent.updateContentBounds()
  }

  /**
   * Returns the bounds of the legend used for hit testing in the move input mode.
   */
  private getLegendBounds = (): Rect | null => {
    const renderTag = this.legendElement?.tag as WorldLegendRenderTag | undefined
    return renderTag?.bounds ?? null
  }

  /**
   * Updates the legend position and invalidates the graph component.
   */
  private updateLegendPosition = (position: Point): void => {
    if (!this.legendElement) {
      return
    }

    const renderTag = this.legendElement.tag as WorldLegendRenderTag
    SvgVisual.setTranslate(renderTag.legendVisual, position.x, position.y)
    this.legendElement.tag = {
      ...renderTag,
      bounds: new Rect(position, new Size(renderTag.bounds.width, renderTag.bounds.height))
    }
    this.graphComponent.invalidate()
  }
}

class WorldCoordinatesLegendRenderer extends BaseClass(
  IObjectRenderer,
  IVisualCreator,
  IBoundsProvider
) {
  private renderTag: WorldLegendRenderTag | null = null

  createVisual(_context: IRenderContext): Visual | null {
    return this.renderTag ? new SvgVisual(this.renderTag.legendVisual) : null
  }

  updateVisual(_context: IRenderContext, oldVisual: Visual | null): Visual | null {
    return oldVisual instanceof SvgVisual ? oldVisual : this.createVisual(_context)
  }

  getBoundsProvider(renderTag: WorldLegendRenderTag): IBoundsProvider {
    this.renderTag = renderTag
    return this
  }

  getHitTestable(_renderTag: WorldLegendRenderTag): IHitTestable {
    return IHitTestable.NEVER
  }

  getVisibilityTestable(_renderTag: WorldLegendRenderTag): IVisibilityTestable {
    return IVisibilityTestable.ALWAYS
  }

  getVisualCreator(renderTag: WorldLegendRenderTag): IVisualCreator {
    this.renderTag = renderTag
    return this
  }

  getBounds(_context: ICanvasContext): Rect {
    return this.renderTag?.bounds ?? Rect.EMPTY
  }
}
