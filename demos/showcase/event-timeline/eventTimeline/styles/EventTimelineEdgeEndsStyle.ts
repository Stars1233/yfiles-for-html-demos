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
  type ICanvasContext,
  type IEdge,
  type INode,
  type IRenderContext,
  type Point,
  type Rect,
  SvgVisual,
  type TaggedSvgVisual
} from '@yfiles/yfiles'

import type { EventTimelineEdgeTag } from '../EventTimelineTypes'

type ElementAttrCache = { cx?: string; cy?: string; r?: string; fill?: string; class?: string }

type EventTimelineEdgeCache = {
  sourceCircle: SVGCircleElement
  targetCircle: SVGCircleElement
  sourceCircleCache: ElementAttrCache
  targetCircleCache: ElementAttrCache
  svgClass?: string
}

type EventTimelineEdgeVisual = TaggedSvgVisual<SVGGElement, EventTimelineEdgeCache>

/**
 * The event timeline's edge style which governs the rendering of each edge in the event timeline
 */
export class EventTimelineEdgeEndsStyle extends EdgeStyleBase {
  readonly thickness: number
  readonly markerRadius: number
  private readonly cssClass: string = 'event-timeline-edge'
  private readonly nodeToColorMapper: (node: INode) => string | undefined

  /**
   * Creates a new EventTimelineEdgeVisual instance.
   * @param thickness the thickness of the edge.
   * @param markerRadius the radius of the circles attached to the end of the edge.
   * @param nodeToColorMapper a function mapping an INode to a corresponding color.
   */
  constructor(
    thickness: number,
    markerRadius: number,
    nodeToColorMapper: (node: INode) => string | undefined = (_node: INode) => undefined
  ) {
    super()
    this.thickness = thickness
    this.markerRadius = markerRadius
    this.nodeToColorMapper = nodeToColorMapper
  }

  /**
   * Creates an edge visual
   * @param context the IRenderContext
   * @param edge the IEdge object to be rendered
   * @returns the EventTimelineEdgeVisual that makes up the edge visual
   * @protected
   */
  protected createVisual(context: IRenderContext, edge: IEdge): EventTimelineEdgeVisual | null {
    const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svgGroup.id = `edge-${(edge.tag as EventTimelineEdgeTag).id}`

    const colorA = this.nodeToColorMapper(edge.sourceNode!)
    const colorB = this.nodeToColorMapper(edge.targetNode!)

    const sourceCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    sourceCircle.classList.add('event-timeline-edge-circle')
    svgGroup.appendChild(sourceCircle)

    const sourceFill = this.getFillColor(colorA)
    sourceCircle.setAttribute('fill', sourceFill)

    const targetCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    targetCircle.classList.add('event-timeline-edge-circle')
    svgGroup.appendChild(targetCircle)

    const targetFill = this.getFillColor(colorB ?? colorA)
    targetCircle.setAttribute('fill', targetFill)

    const svgVisual = SvgVisual.from(svgGroup, {
      sourceCircle,
      targetCircle,
      sourceCircleCache: {},
      targetCircleCache: {},
      svgClass: undefined
    }) as EventTimelineEdgeVisual

    return this.updateVisual(context, svgVisual, edge)
  }

  /**
   * Updates the created EventTimelineEdgeStyle visual
   * @param _context the IRender context
   * @param oldVisual the old SVG visual
   * @param edge the IEdge object whose visual is to be updated
   * @returns the (updated) old EventTimelineEdgeVisual visual
   * @protected
   */
  protected updateVisual(
    _context: IRenderContext,
    oldVisual: EventTimelineEdgeVisual,
    edge: IEdge
  ): EventTimelineEdgeVisual | null {
    const source: Point = edge.sourcePort.location
    const target: Point = edge.targetPort.location
    const { sourceCircle, targetCircle } = oldVisual.tag

    const newClass = this.cssClass
    if (oldVisual.tag.svgClass !== newClass) {
      oldVisual.svgElement.setAttribute('class', newClass)
      oldVisual.tag.svgClass = newClass
    }

    this.setAttrIfChanged(sourceCircle, oldVisual.tag.sourceCircleCache, 'cx', `${source.x}`)
    this.setAttrIfChanged(sourceCircle, oldVisual.tag.sourceCircleCache, 'cy', `${source.y}`)
    this.setAttrIfChanged(
      sourceCircle,
      oldVisual.tag.sourceCircleCache,
      'r',
      `${this.markerRadius}`
    )

    this.setAttrIfChanged(targetCircle, oldVisual.tag.targetCircleCache, 'cx', `${target.x}`)
    this.setAttrIfChanged(targetCircle, oldVisual.tag.targetCircleCache, 'cy', `${target.y}`)
    this.setAttrIfChanged(
      targetCircle,
      oldVisual.tag.targetCircleCache,
      'r',
      `${this.markerRadius}`
    )

    return oldVisual
  }

  /**
   * Gets the rectangular bounds of the edge
   * @param context the IRenderContext
   * @param edge the IEdge whose visualization's rectangular bound is to be determined
   * @returns a rectangle describing the edge's bounding box
   * @protected
   */
  protected getBounds(context: ICanvasContext, edge: IEdge): Rect {
    return super.getBounds(context, edge).getEnlarged(Math.max(this.thickness, this.markerRadius))
  }

  private getFillColor(color?: string): string {
    if (color) {
      return `color-mix(in oklab, ${color} var(--yfiles-event-timeline-edge-color-value, 100%), var(--yfiles-event-timeline-background-color, #ffffff) var(--yfiles-event-timeline-background-color-value, 0%))`
    }

    return `color-mix(in oklab, var(--yfiles-event-timeline-edge-color, #dfdee3) var(--yfiles-event-timeline-edge-color-value, 100%), var(--yfiles-event-timeline-background-color, #ffffff) var(--yfiles-event-timeline-background-color-value, 0%))`
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
