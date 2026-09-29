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
  IBoundsProvider,
  IHitTestable,
  IObjectRenderer,
  IVisibilityTestable,
  IVisualCreator,
  Point,
  Rect,
  Size,
  SvgVisual,
  SvgVisualGroup
} from '@yfiles/yfiles'
import { LegendBase } from './LegendBase'
import {
  RenderTreeLegendMoveInputMode,
  RenderTreeLegendPosition
} from './RenderTreeLegendMoveInputMode'

const LEGEND_MARGIN = 16
const MIN_LEGEND_SCALE = 0.5

/**
 * Legend built from an SVG export of a graph, added to the render tree of the graph component,
 * rendered in view coordinates.
 */
export class RenderTreeViewLegend extends LegendBase {
  legendElement = null
  legendPosition

  constructor(graphComponent, inputMode) {
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

  onHide() {
    if (this.legendElement) {
      this.graphComponent.renderTree.remove(this.legendElement)
      this.legendElement = null
    }
  }

  refreshCore(visibleTypes) {
    // create the SVG visual
    const { legendVisual, size } = this.createLegendVisual(visibleTypes)
    legendVisual.setAttribute('data-legend-type', 'view')
    const layout = this.calculateLegendLayout(size)
    const position = this.legendPosition.setDefaultPosition(layout.position)
    const renderTag = {
      legendVisual,
      size,
      position,
      scale: layout.scale,
      hasCustomPosition: this.legendPosition.isManualPosition
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
  getRenderTag() {
    return this.legendElement?.tag ?? null
  }

  /**
   * Returns the bounds of the legend used for hit testing in the move input mode.
   */
  getLegendBounds = () => {
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
  updateLegendPosition = (position) => {
    if (this.legendElement) {
      this.legendElement.tag = { ...this.getRenderTag(), position }
      this.graphComponent.invalidate()
    }
  }

  /**
   * Updates the legend layout when the graph component size changes.
   */
  updateLegendLayout = (renderTag) => {
    const layout = this.calculateLegendLayout(renderTag.size)
    renderTag.position = this.legendPosition.setDefaultPosition(layout.position)
    renderTag.scale = layout.scale
  }

  /**
   * Calculates the legend size and position considering the current orientation.
   * Potentially scales the legend down to fit inside the graph component.
   */
  calculateLegendLayout(size) {
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
  renderTag = null
  updateLegendLayout

  constructor(updateLegendLayout) {
    super()
    this.updateLegendLayout = updateLegendLayout
  }

  createVisual(context) {
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

  updateVisual(context, oldVisual) {
    if (this.renderTag && oldVisual instanceof SvgVisualGroup && oldVisual.children.size > 0) {
      oldVisual.transform = context.viewTransform
      const visual = oldVisual.children.get(0)
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
  updateLegendPosition(_context, visual, renderTag) {
    const svgGroup = visual.svgElement
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

  getBoundsProvider(renderTag) {
    this.renderTag = renderTag
    return this
  }

  getHitTestable(_renderTag) {
    return IHitTestable.NEVER
  }

  getVisibilityTestable(_renderTag) {
    return IVisibilityTestable.ALWAYS
  }

  getVisualCreator(renderTag) {
    this.renderTag = renderTag
    return this
  }

  getBounds(_context) {
    if (!this.renderTag) {
      return Rect.EMPTY
    }
    return Rect.INFINITE
  }
}
