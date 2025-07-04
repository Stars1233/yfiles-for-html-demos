/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) by yWorks GmbH, Vor dem Kreuzberg 28,
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
  type Constructor,
  EdgeStyleBase,
  EdgeStyleIndicatorRenderer,
  GeneralPath,
  GraphComponent,
  IArrow,
  ICanvasContext,
  IEdge,
  IInputModeContext,
  INode,
  INodeStyle,
  IRenderContext,
  ISelectionRenderer,
  Point,
  PolylineEdgeStyle,
  Rect,
  SvgVisual,
  type TaggedSvgVisual
} from '@yfiles/yfiles'

import AnimatedLinearGradient from './AnimatedLinearGradient'
import { Sample1Arrow } from './Sample1Arrow'
import { SVGNS } from './Namespaces'

/**
 * The type of the type argument of the creatVisual and updateVisual methods of the style implementation.
 */
type Sample1EdgeStyleVisual = TaggedSvgVisual<SVGGElement, EdgeRenderDataCache>

/**
 * An example of a custom edge style based on {@link EdgeStyleBase}.
 */
export class Sample1EdgeStyle extends EdgeStyleBase<Sample1EdgeStyleVisual> {
  private arrows: Sample1Arrow = new Sample1Arrow()
  pathThickness = 3

  /**
   * Creates the visual for an edge.
   * @see Overrides {@link EdgeStyleBase.createVisual}
   */
  createVisual(context: IRenderContext, edge: IEdge): Sample1EdgeStyleVisual {
    // This implementation creates a CanvasContainer and uses it for the rendering of the edge.
    const g = document.createElementNS(SVGNS, 'g')
    // Get the necessary data for rendering of the edge
    const cache = this.createRenderDataCache(context, edge)
    const visual = SvgVisual.from(g, cache)
    // Render the edge
    this.render(context, visual, edge)
    return visual
  }

  /**
   * Re-renders the edge using the old visual for performance reasons.
   * @see Overrides {@link EdgeStyleBase.updateVisual}
   */
  updateVisual(
    context: IRenderContext,
    oldVisual: Sample1EdgeStyleVisual,
    edge: IEdge
  ): Sample1EdgeStyleVisual {
    const container = oldVisual.svgElement
    // get the data with which the oldVisual was created
    const oldCache = oldVisual.tag
    // get the data for the new visual
    const newCache = this.createRenderDataCache(context, edge)

    // check if something changed
    if (!newCache.stateEquals(oldCache)) {
      // more than only the path changed - re-render the visual
      Sample1EdgeStyle.clear(container)
      oldVisual.tag = newCache
      this.render(context, oldVisual, edge)
      return oldVisual
    }

    if (!newCache.pathEquals(oldCache)) {
      oldVisual.tag = newCache
      // only the path changed - update the old visual
      this.updatePath(context, oldVisual, edge)
    }
    return oldVisual
  }

  /**
   * Creates an object containing all necessary data to create an edge visual.
   */
  private createRenderDataCache(context: IRenderContext, edge: IEdge): EdgeRenderDataCache {
    const node = edge.sourceNode
    return new EdgeRenderDataCache(
      this.pathThickness,
      Sample1EdgeStyle.isSelected(context, edge),
      Sample1EdgeStyle.getColor(node.style, node),
      this.getPath(edge)
    )
  }

  /**
   * Creates the visual appearance of an edge.
   */
  private render(context: IRenderContext, visual: Sample1EdgeStyleVisual, edge: IEdge) {
    const cache = visual.tag
    const container = visual.svgElement

    if (!cache.path) {
      return
    }

    const path = cache.path.createSvgPath()

    path.setAttribute('fill', 'none')
    path.setAttribute('stroke-width', cache.thickness.toString())
    path.setAttribute('stroke-linejoin', 'round')

    if (cache.selected) {
      // Fill for selected state
      AnimatedLinearGradient.applyToElement(context, path)
    } else {
      // Fill for non-selected state
      path.setAttribute('stroke', cache.color)
    }

    container.appendChild(path)

    // add the arrows to the container
    super.addArrows(context, container, edge, cache.path, this.arrows, this.arrows)
  }

  /**
   * Updates the edge path data as well as the arrow positions of the visuals stored in `container`.
   */
  private updatePath(
    context: IRenderContext,
    oldVisual: Sample1EdgeStyleVisual,
    edge: IEdge
  ): void {
    const container = oldVisual.svgElement
    // The first child must be a path - else re-create the container from scratch
    if (container.childNodes.length === 0 || !(container.childNodes[0] instanceof SVGPathElement)) {
      Sample1EdgeStyle.clear(container)
      this.render(context, oldVisual, edge)
      return
    }

    const cache = oldVisual.tag

    if (cache.path) {
      const path = container.childNodes[0] as Element

      const updatedPath = cache.path.createSvgPath()
      path.setAttribute('d', updatedPath.getAttribute('d')!)

      // update the arrows
      super.updateArrows(context, container, edge, cache.path, this.arrows, this.arrows)
    } else {
      Sample1EdgeStyle.clear(container)
    }
  }

  /**
   * Creates a {@link GeneralPath} from the edge's bends.
   * @param edge The edge to create the path for.
   * @returns A {@link GeneralPath} following the edge
   * @see Overrides {@link EdgeStyleBase.getPath}
   */
  getPath(edge: IEdge): GeneralPath | null {
    // Create a general path from the locations of the ports and the bends of the edge.
    const path = new GeneralPath()
    path.moveTo(edge.sourcePort.location)
    edge.bends.forEach((bend) => {
      path.lineTo(bend.location)
    })
    path.lineTo(edge.targetPort.location)

    // shorten the path in order to provide room for drawing the arrows.
    return super.cropPath(edge, this.arrows, this.arrows, path)
  }

  /**
   * Determines whether the visual representation of the edge has been hit at the given location.
   * Overridden method to include the {@link Sample1EdgeStyle.pathThickness} and the HitTestRadius specified in
   * the context in the calculation.
   * @see Overrides {@link EdgeStyleBase.isHit}
   */
  isHit(context: IInputModeContext, location: Point, edge: IEdge): boolean {
    // Use the convenience method in GeneralPath
    const path = this.getPath(edge)
    return !!path && path.pathContains(location, context.hitTestRadius + this.pathThickness * 0.5)
  }

  /**
   * Determines whether the edge is visible in the given rectangle.
   * Overridden method to improve performance of the super implementation
   * @see Overrides {@link EdgeStyleBase.isVisible}
   */
  isVisible(context: ICanvasContext, rectangle: Rect, edge: IEdge): boolean {
    // enlarge the test rectangle to include the path thickness
    const enlargedRectangle = rectangle.getEnlarged(this.pathThickness)
    // delegate to the efficient implementation of PolylineEdgeStyle
    return helperEdgeStyle.renderer
      .getVisibilityTestable(edge, helperEdgeStyle)
      .isVisible(context, enlargedRectangle)
  }

  /**
   * This implementation of the look-up provides a custom implementation of the
   * {@link ISelectionRenderer} interface that better suits to this style.
   * @see Overrides {@link EdgeStyleBase.lookup}
   */
  lookup(edge: IEdge, type: Constructor<any>): any | null {
    if (type === ISelectionRenderer) {
      return new EdgeStyleIndicatorRenderer({
        edgeStyle: new PolylineEdgeStyle({ stroke: null })
      })
    }

    return super.lookup(edge, type)
  }

  private static getColor(
    style: INodeStyle & { getNodeColor?: (node: INode) => string; wrapper?: INodeStyle },
    node: INode
  ): string {
    if (typeof style.getNodeColor !== 'undefined') {
      return style.getNodeColor(node)
    } else if (typeof style.wrapper !== 'undefined') {
      return Sample1EdgeStyle.getColor(style.wrapper, node)
    } else {
      return '#0082b4'
    }
  }

  private static clear(container: SVGGElement): void {
    while (container.lastChild) {
      container.removeChild(container.lastChild)
    }
  }

  private static isSelected(context: IRenderContext, edge: IEdge): boolean {
    const component = context.canvasComponent
    return component instanceof GraphComponent && component.selection.includes(edge)
  }
}

class EdgeRenderDataCache {
  constructor(
    public readonly thickness: number,
    public readonly selected: boolean,
    public readonly color: string,
    public readonly path: GeneralPath | null
  ) {}

  stateEquals(other?: EdgeRenderDataCache): boolean {
    return (
      !!other &&
      other.thickness === this.thickness &&
      other.selected === this.selected &&
      other.color === this.color
    )
  }

  pathEquals(other?: EdgeRenderDataCache): boolean {
    return !!other && !!other.path && !!this.path && other.path.hasSameValue(this.path)
  }
}

const helperEdgeStyle = new PolylineEdgeStyle({
  sourceArrow: IArrow.NONE,
  targetArrow: IArrow.NONE
})
