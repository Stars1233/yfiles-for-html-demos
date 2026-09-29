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
  type GraphComponent,
  type ICanvasContext,
  type IEdge,
  type IGraph,
  type IInputModeContext,
  type INode,
  type IRenderContext,
  type LinearGradient,
  type Point,
  Rect,
  SvgVisual,
  type TaggedSvgVisual
} from '@yfiles/yfiles'
import { ItemState } from '../EventTimelineTypes'
import { getOrCreateGradient } from './GradientUtility'

type ElementAttrCache = {
  x?: string
  y?: string
  width?: string
  height?: string
  rx?: string
  ry?: string
  fill?: string
  stroke?: string
  display?: string
}

type EventTimelineAggregateEdgeCache = {
  ports: SVGRectElement[]
  edges: SVGRectElement[]
  bounds: SVGRectElement
  portAttrCache: ElementAttrCache[]
  edgeAttrCache: ElementAttrCache[]
  boundsAttrCache: ElementAttrCache
  svgClass?: string
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
  readonly radius: number
  private cssClass: string = 'event-timeline-aggregate-edge'
  private readonly nodeToColorMapper: (node: INode) => string
  private readonly edgeWidth: number
  private gradients: Map<string, LinearGradient>

  /**
   * Instantiates a new EventTimelineAggregatedEdgesStyle
   * @param radius the radius of the EventTimelineAggregatedEdgesStyle's termini
   * @param edgeWidth the width of the EventTimelineAggregatedEdgesStyle's visual
   * @param nodeToColorMapper maps a given INode to a particular color
   * @param gradientMap a collection of all color gradients in the drawing
   */
  constructor(
    radius: number,
    edgeWidth: number,
    nodeToColorMapper: (node: INode) => string,
    gradientMap: Map<string, LinearGradient> = new Map()
  ) {
    super()
    this.radius = radius
    this.edgeWidth = edgeWidth
    this.nodeToColorMapper = nodeToColorMapper
    this.gradients = gradientMap
  }

  private getEdges(edge: IEdge): IEdge[] {
    return edge.lookup(ItemState)?.representedGroup?.edges ?? []
  }

  /**
   * Gets the EdgeBins of the aggregated edge
   * @private
   * @returns the EdgeBins of the aggregated edge
   */
  private getPortDimensions(edge: IEdge, graph?: IGraph): EdgeBins[] {
    const sortedByY = new Map<number, { pos: Point; color: string }[]>()

    for (const currentEdge of this.getEdges(edge)) {
      if (graph && !graph.contains(currentEdge)) {
        continue
      }

      const pts = [currentEdge.sourcePort!.location, currentEdge.targetPort!.location]
      pts.forEach((loc, idx) => {
        let group = sortedByY.get(loc.y)
        if (!group) {
          group = []
          sortedByY.set(loc.y, group)
        }

        group.push({
          pos: loc,
          color: this.nodeToColorMapper(
            idx === 0 ? currentEdge.sourceNode! : currentEdge.targetNode!
          )
        })
      })
    }

    return Array.from(sortedByY.entries())
      .sort(([y1], [y2]) => y1 - y2)
      .map(([y, points]) => {
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
    const state = edge.lookup(ItemState)

    // 1. Background / bounds overlay
    const bounds = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bounds.setAttribute('fill', 'var(--yfiles-event-timeline-aggregate-background-color, #808080)')
    bounds.setAttribute('opacity', '0.4')
    bounds.setAttribute('rx', '10')
    bounds.setAttribute('ry', '10')
    bounds.classList.add(this.cssClass, 'background')
    if (state?.highlighted) {
      bounds.classList.add('highlight')
    }
    aggregateGroup.appendChild(bounds)

    // 2. Edge elements
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const graph = (context.canvasComponent as GraphComponent).graph

    const edges = this.getEdges(edge).map((currentEdge) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.classList.add('band')

      if (!graph.contains(currentEdge)) {
        rect.setAttribute('display', 'none')
        edgeGroup.appendChild(rect)
        return rect
      }

      const sourcePosition = currentEdge.sourcePort!.location
      const targetPosition = currentEdge.targetPort!.location
      const sourceColor = this.nodeToColorMapper(currentEdge.sourceNode!)
      const targetColor = this.nodeToColorMapper(currentEdge.targetNode!)

      if (sourceColor !== targetColor) {
        const linearGradient = getOrCreateGradient(
          this.gradients,
          sourceColor,
          targetColor,
          sourcePosition.y,
          targetPosition.y
        )
        linearGradient.applyTo(rect, context)
      } else {
        rect.setAttribute('fill', sourceColor || 'var(--yfiles-event-timeline-edge-color, #dfdee3)')
      }

      rect.setAttribute('stroke', 'none')
      edgeGroup.appendChild(rect)
      return rect
    })

    aggregateGroup.appendChild(edgeGroup)

    // 3. Port elements
    const portDimensions = this.getPortDimensions(edge, graph)
    const ports = portDimensions.map(() => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      aggregateGroup.appendChild(rect)
      return rect
    })

    const visual = SvgVisual.from(aggregateGroup, {
      ports,
      edges,
      bounds,
      portAttrCache: ports.map(() => ({})),
      edgeAttrCache: edges.map(() => ({})),
      boundsAttrCache: {},
      svgClass: undefined
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
    const graph = (context.canvasComponent as GraphComponent).graph
    const portDimensions = this.getPortDimensions(edge, graph)
    const edges = this.getEdges(edge)
    const state = edge.lookup(ItemState)

    if (cache.ports.length !== portDimensions.length || cache.edges.length !== edges.length) {
      return this.createVisual(context, edge)
    }

    const newClass = this.cssClass + (state?.highlighted ? ' highlight' : '')
    if (cache.svgClass !== newClass) {
      oldVisual.svgElement.setAttribute('class', newClass)
      cache.svgClass = newClass
    }

    portDimensions.forEach(({ xMin, xMax, y, color }, i) => {
      const rect = cache.ports[i]
      const rectCache = cache.portAttrCache[i]
      const width = Math.max(2 * this.radius, xMax - xMin)

      this.setAttrIfChanged(rect, rectCache, 'x', `${xMin}`)
      this.setAttrIfChanged(rect, rectCache, 'y', `${y - this.radius}`)
      this.setAttrIfChanged(rect, rectCache, 'width', `${width}`)
      this.setAttrIfChanged(rect, rectCache, 'height', `${this.radius * 2}`)
      this.setAttrIfChanged(rect, rectCache, 'rx', `${this.radius}`)
      this.setAttrIfChanged(rect, rectCache, 'ry', `${this.radius}`)
      this.setAttrIfChanged(rect, rectCache, 'fill', color)
    })

    edges.forEach((e, i) => {
      const rect = cache.edges[i]
      const rectCache = cache.edgeAttrCache[i]

      if (!graph.contains(e)) {
        this.setAttrIfChanged(rect, rectCache, 'display', 'none')
        return
      }

      if (rectCache.display !== undefined) {
        rect.removeAttribute('display')
        delete rectCache.display
      }

      const sourcePosition = e.sourcePort!.location
      const targetPosition = e.targetPort!.location
      const yMin = Math.min(sourcePosition.y, targetPosition.y)
      const yMax = Math.max(sourcePosition.y, targetPosition.y)

      this.setAttrIfChanged(rect, rectCache, 'x', `${sourcePosition.x - this.edgeWidth / 2}`)
      this.setAttrIfChanged(rect, rectCache, 'y', `${yMin}`)
      this.setAttrIfChanged(rect, rectCache, 'width', `${this.edgeWidth}`)
      this.setAttrIfChanged(rect, rectCache, 'height', `${yMax - yMin}`)
    })

    const b = this.getBounds(context, edge)
    this.setAttrIfChanged(cache.bounds, cache.boundsAttrCache, 'x', `${b.x}`)
    this.setAttrIfChanged(cache.bounds, cache.boundsAttrCache, 'y', `${b.y}`)
    this.setAttrIfChanged(cache.bounds, cache.boundsAttrCache, 'width', `${b.width}`)
    this.setAttrIfChanged(cache.bounds, cache.boundsAttrCache, 'height', `${b.height}`)

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
    const graph = (context.canvasComponent as GraphComponent).graph

    for (const e of this.getEdges(edge)) {
      if (!graph.contains(e)) {
        continue
      }

      const s = e.sourcePort.location
      const t = e.targetPort.location
      const yMin = Math.min(s.y, t.y)
      const yMax = Math.max(s.y, t.y)

      combinedBounds = Rect.add(
        combinedBounds,
        new Rect(s.x - this.edgeWidth / 2, yMin, this.edgeWidth, yMax - yMin)
      )
    }

    return combinedBounds.isEmpty ? Rect.EMPTY : combinedBounds.getEnlarged(this.radius * 2)
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

  private setAttrIfChanged(
    element: SVGElement,
    cache: ElementAttrCache,
    name: keyof ElementAttrCache,
    value: string
  ): void {
    if (cache[name] !== value) {
      element.setAttribute(name, value)
      cache[name] = value
    }
  }
}
