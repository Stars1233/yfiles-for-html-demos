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
import { EdgeStyleBase, SvgVisual } from '@yfiles/yfiles'

/**
 * The event timeline's edge style which governs the rendering of each edge in the event timeline
 */
export class EventTimelineEdgeEndsStyle extends EdgeStyleBase {
  thickness
  markerRadius
  cssClass = 'event-timeline-edge'
  nodeToColorMapper

  /**
   * Creates a new EventTimelineEdgeVisual instance.
   * @param thickness the thickness of the edge.
   * @param markerRadius the radius of the circles attached to the end of the edge.
   * @param nodeToColorMapper a function mapping an INode to a corresponding color.
   */
  constructor(thickness, markerRadius, nodeToColorMapper = (_node) => undefined) {
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
  createVisual(context, edge) {
    const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svgGroup.id = `edge-${edge.tag.id}`

    const colorA = this.nodeToColorMapper(edge.sourceNode)
    const colorB = this.nodeToColorMapper(edge.targetNode)

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
    })

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
  updateVisual(_context, oldVisual, edge) {
    const source = edge.sourcePort.location
    const target = edge.targetPort.location
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
  getBounds(context, edge) {
    return super.getBounds(context, edge).getEnlarged(Math.max(this.thickness, this.markerRadius))
  }

  getFillColor(color) {
    if (color) {
      return `color-mix(in oklab, ${color} var(--yfiles-event-timeline-edge-color-value, 100%), var(--yfiles-event-timeline-background-color, #ffffff) var(--yfiles-event-timeline-background-color-value, 0%))`
    }

    return `color-mix(in oklab, var(--yfiles-event-timeline-edge-color, #dfdee3) var(--yfiles-event-timeline-edge-color-value, 100%), var(--yfiles-event-timeline-background-color, #ffffff) var(--yfiles-event-timeline-background-color-value, 0%))`
  }

  setAttrIfChanged(element, cache, name, value) {
    if (cache[name] !== value) {
      element.setAttribute(name, value)
      cache[name] = value
    }
  }
}
