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
  EdgeStyleBase,
  GradientStop,
  type ICanvasContext,
  type IEdge,
  type IInputModeContext,
  type INode,
  type IRenderContext,
  LinearGradient,
  type Point,
  Rect,
  SvgVisual,
  type TaggedSvgVisual
} from '@yfiles/yfiles'

/**
 * The EventTimelineAggregateEdgeCache
 */
type EventTimelineAggregateEdgeCache = {
  ports: SVGRectElement[]
  edges: SVGRectElement[]
  bounds: SVGRectElement
}

/**
 * The EventTimelineAggregateEdgeVisual is a tagged SVG visual which maps a particular
 * SVG g element to an EventTimelineAggregateEdgeCache
 */
type EventTimelineAggregateEdgeVisual = TaggedSvgVisual<
  SVGGElement,
  EventTimelineAggregateEdgeCache
>

/**
 * The details of the edge set described a singular aggregated edge, i.e., the first edge's
 * x-coordinate (xMin), the last edge's x-coordinate (xMax), the hyperedge's y-coordinate (y),
 * and its color.
 */
type EdgeBins = { xMin: number; xMax: number; y: number; color: string }

/**
 * The EventTimelineAggregatedEdgeStyle extends the EdgeStyleBase to visualize a set of edges
 * (which form a connected component and are close enough to one-another in 2D space) as a
 * grouped edge visual.
 */
export class EventTimelineAggregatedEdgesStyle extends EdgeStyleBase {
  readonly edges: IEdge[]
  readonly radius: number
  cssClass: string
  private readonly nodeToColorMapper: (node: INode) => string
  private readonly edgeWidth: number
  private gradients: Map<string, LinearGradient>

  /**
   * Instantiates a new EventTimelineAggregatedEdgesStyle
   * @param edges the edges to form an EventTimelineAggregatedEdgesStyle
   * @param radius the radius of the EventTimelineAggregatedEdgesStyle's termini
   * @param edgeWidth the width of the EventTimelineAggregatedEdgesStyle's visual
   * @param nodeToColorMapper maps a given INode to a particular color
   * @param gradientMap a collection of all color gradients in the drawing
   * @param cssClass the CSS class to be associated with the edge visual
   */
  constructor(
    edges: IEdge[],
    radius: number,
    edgeWidth: number,
    nodeToColorMapper: (node: INode) => string,
    gradientMap: Map<string, LinearGradient> = new Map(),
    cssClass: string = 'event-timeline-aggregate-edge'
  ) {
    super()
    this.edges = edges
    this.radius = radius
    this.edgeWidth = edgeWidth
    this.nodeToColorMapper = nodeToColorMapper
    this.gradients = gradientMap
    this.cssClass = cssClass
  }

  /**
   * Gets the EdgeBins of the aggregated edge
   * @private
   * @returns the EdgeBins of the aggregated edge
   */
  private getPortDimensions(): EdgeBins[] {
    const sortedByY = new Map<number, { pos: Point; color: string }[]>()
    for (const edge of this.edges) {
      const pts = [edge.sourcePort!.location, edge.targetPort!.location]
      pts.forEach((loc, idx) => {
        let group = sortedByY.get(loc.y)
        if (!group) {
          group = []
          sortedByY.set(loc.y, group)
        }
        group.push({
          pos: loc,
          color: this.nodeToColorMapper(idx === 0 ? edge.sourceNode! : edge.targetNode!)
        })
      })
    }
    return Array.from(sortedByY.entries()).map(([y, points]) => {
      const xCoords = points.map((p) => p.pos.x)
      return {
        xMin: Math.min(...xCoords) - this.edgeWidth / 2,
        xMax: Math.max(...xCoords) + this.edgeWidth / 2,
        y,
        color: points[0].color
      }
    })
  }

  /**
   * Creates a new EventTimelineAggregateEdgeVisual
   * @param context the IRenderContext
   * @param edge the IEdge to be rendered as a EventTimelineAggregateEdgeVisual
   * @protected
   * @returns a newly created EventTimelineAggregateEdgeVisual
   */
  protected createVisual(context: IRenderContext, edge: IEdge): EventTimelineAggregateEdgeVisual {
    const aggregateGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // 1. Create Background
    const bounds = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    Object.assign(bounds.style, { fill: 'grey' })
    bounds.classList = this.cssClass + ' background'
    bounds.rx.baseVal.value = 10
    bounds.ry.baseVal.value = 10
    aggregateGroup.appendChild(bounds)

    // 2. Create Edge elements
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const edges = this.edges.map((edge) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      const sourcePosition = edge.sourcePort!.location
      const targetPosition = edge.targetPort!.location
      const sourceColor = this.nodeToColorMapper(edge.sourceNode!)
      const targetColor = this.nodeToColorMapper(edge.targetNode!)
      if (sourceColor !== targetColor) {
        let linearGradient = this.gradients.get(
          sourcePosition.y < targetPosition.y
            ? sourceColor + targetColor
            : targetColor + sourceColor
        )
        if (!linearGradient) {
          linearGradient = new LinearGradient({
            startPoint: [0, sourcePosition.y < targetPosition.y ? 0 : 1],
            endPoint: [0, sourcePosition.y < targetPosition.y ? 1 : 0],
            gradientStops: [
              new GradientStop({ offset: 0, color: sourceColor }),
              new GradientStop({ offset: 1, color: targetColor })
            ]
          })
          this.gradients.set(
            sourcePosition.y < targetPosition.y
              ? sourceColor + targetColor
              : targetColor + sourceColor,
            linearGradient
          )
        }
        linearGradient.applyTo(rect, context)
      } else {
        rect.style.fill = sourceColor
      }
      edgeGroup.appendChild(rect)
      return rect
    })
    aggregateGroup.appendChild(edgeGroup)

    // 3. Create Port elements
    const portDimensions = this.getPortDimensions()
    const ports = portDimensions.map(() => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      aggregateGroup.appendChild(rect)
      return rect
    })

    const visual = SvgVisual.from(aggregateGroup, {
      ports,
      edges,
      bounds
    }) as EventTimelineAggregateEdgeVisual

    return this.updateVisual(context, visual, edge)
  }

  /**
   * Updates a given EventTimelineAggregateEdgeVisual
   * @param context the IRenderContext of the given EventTimelineAggregateEdgeVisual
   * @param oldVisual the EventTimelineAggregateEdgeVisual to be updated
   * @param edge the IEdge associated with the given EventTimelineAggregateEdgeVisual
   * @protected
   * @returns an updated EventTimelineAggregateEdgeVisual
   */
  protected updateVisual(
    context: IRenderContext,
    oldVisual: EventTimelineAggregateEdgeVisual,
    edge: IEdge
  ): EventTimelineAggregateEdgeVisual {
    const cache = oldVisual.tag
    const portDimensions = this.getPortDimensions()

    // Structural synchronization check
    if (cache.ports.length !== portDimensions.length || cache.edges.length !== this.edges.length) {
      return this.createVisual(context, edge)
    }
    if (this.cssClass) {
      oldVisual.svgElement.classList = this.cssClass
    } // 1. Update Horizontal Port Bars
    portDimensions.forEach(({ xMin, xMax, y, color }, i) => {
      const rect = cache.ports[i]
      const width = Math.max(2 * this.radius, xMax - xMin)
      rect.setAttribute('x', `${xMin}`)
      rect.setAttribute('y', `${y - this.radius}`)
      rect.setAttribute('width', `${width}`)
      rect.setAttribute('height', `${this.radius * 2}`)
      rect.setAttribute('rx', `${this.radius}`)
      rect.setAttribute('ry', `${this.radius}`)
      rect.style.fill = color
    })

    // 2. Update Vertical Edge Lines
    this.edges.forEach((e, i) => {
      const sourcePosition = e.sourcePort!.location
      const targetPosition = e.targetPort!.location
      const yMin = Math.min(sourcePosition.y, targetPosition.y)
      const yMax = Math.max(sourcePosition.y, targetPosition.y)
      const rect = cache.edges[i]

      rect.setAttribute('x', `${sourcePosition.x - this.edgeWidth / 2}`)
      rect.setAttribute('y', `${yMin}`)
      rect.setAttribute('width', `${this.edgeWidth}`)
      rect.setAttribute('height', `${yMax - yMin}`)
    })

    // 3. Update Bounds Overlay
    const b = this.getBounds(context, edge)
    cache.bounds.setAttribute('x', `${b.x}`)
    cache.bounds.setAttribute('y', `${b.y}`)
    cache.bounds.setAttribute('width', `${b.width}`)
    cache.bounds.setAttribute('height', `${b.height}`)

    return oldVisual
  }

  /**
   * Gets the bounds of the EventTimelineAggregateEdgeVisual
   * @param context the ICanvasContext attached to the EventTimelineAggregateEdgeVisual
   * @param edge the IEdge whose bounds are to be determined
   * @returns the bounds of the EventTimelineAggregateEdgeVisual
   */
  getBounds(context: ICanvasContext, edge: IEdge): Rect {
    let combinedBounds = Rect.EMPTY
    for (const e of this.edges) {
      const s = e.sourcePort!.location
      const t = e.targetPort!.location
      const yMin = Math.min(s.y, t.y)
      const yMax = Math.max(s.y, t.y)
      combinedBounds = Rect.add(
        combinedBounds,
        new Rect(s.x - this.edgeWidth / 2, yMin, this.edgeWidth, yMax - yMin)
      )
    }
    return combinedBounds.getEnlarged(this.radius * 2)
  }

  /**
   * Checks whether a given point falls within the EventTimelineAggregateEdgeVisual
   * @param context the EventTimelineAggregateEdgeVisual's IInputModeContext
   * @param location the point to be tested
   * @param edge the IEdge associated with the EventTimelineAggregateEdgeVisual
   * @protected
   * @returns a boolean indicating whether the given point falls within the bounds of the
   * EventTimelineAggregateEdgeVisual
   */
  protected isHit(context: IInputModeContext, location: Point, edge: IEdge): boolean {
    return this.getBounds(context, edge).contains(location)
  }

  /**
   * Checks whether the bounds of the EventTimelineAggregateEdgeVisual fall within a given
   * rectangle's bounds
   * @param context the EventTimelineAggregateEdgeVisual's ICanvasContext
   * @param rectangle the rectangle which determines visibility
   * @param edge the IEdge whose visibility is to be checked
   * @protected
   */
  protected isVisible(context: ICanvasContext, rectangle: Rect, edge: IEdge): boolean {
    return rectangle.intersects(this.getBounds(context, edge))
  }
}
