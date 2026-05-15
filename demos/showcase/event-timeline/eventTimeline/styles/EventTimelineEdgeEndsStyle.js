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
  colorA
  colorB
  cssClass
  cssVarPrefix = 'yfiles-event-timeline'
  nodeToColorMapper

  /**
   * Creates a new EventTimelineEdgeVisual instance.
   * @param thickness the thickness of the edge.
   * @param markerRadius the radius of the circles attached to the end of the edge.
   * @param nodeToColorMapper a function mapping an INode to a corresponding color.
   * @param cssVarPrefix a prefix for the CSS variables used by this instance.
   * @param cssClass the CSS class to be assigned to the edge.
   */
  constructor(
    thickness,
    markerRadius,
    nodeToColorMapper = (node) => undefined,
    cssVarPrefix,
    cssClass = 'event-timeline-edge'
  ) {
    super()
    this.thickness = thickness
    this.markerRadius = markerRadius
    this.nodeToColorMapper = nodeToColorMapper
    this.cssVarPrefix = cssVarPrefix
    this.cssClass = cssClass
  }

  /**
   * Creates an edge visual
   * @param context the IRenderContext
   * @param edge the IEdge object to be rendered
   * @returns the EventTimelineEdgeVisual that makes up the edge visual
   * @protected
   */
  createVisual(context, edge) {
    // Create SVG Group within which to store all subsequently created SVG visuals
    const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svgGroup.id = `edge-${edge.tag.id}`
    const colorA = this.nodeToColorMapper(edge.sourceNode)
    const colorB = this.nodeToColorMapper(edge.targetNode)
    // Create Circle at Source Node Location
    const sourceCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    sourceCircle.classList.add('event-timeline-edge-circle')
    svgGroup.appendChild(sourceCircle)
    if (colorA) {
      sourceCircle.style.fill = `color-mix(in oklab, ${colorA} var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
    } else {
      sourceCircle.style.fill = `color-mix(in oklab, var(--${this.cssVarPrefix}-edge-color, #aaaaaa) var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
    }

    // Create Circle at Target Node Location
    const targetCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    targetCircle.classList.add('event-timeline-edge-circle')
    svgGroup.appendChild(targetCircle)
    if (colorA && !colorB) {
      targetCircle.style.fill = `color-mix(in oklab, ${colorA} var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
    } else if (colorB) {
      targetCircle.style.fill = `color-mix(in oklab, ${colorB} var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
    } else {
      targetCircle.style.fill = `color-mix(in oklab, var(--${this.cssVarPrefix}-edge-color, #aaaaaa) var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
    }

    // Create SVG Visual from Group
    const svgVisual = SvgVisual.from(svgGroup, {
      sourceCircle: sourceCircle,
      targetCircle: targetCircle
    })

    // Return the updated visual
    return this.updateVisual(context, svgVisual, edge)
  }

  /**
   * Updates the created EventTimelineEdgeStyle visual
   * @param context the IRender context
   * @param oldVisual the old SVG visual
   * @param edge the IEdge object whose visual is to be updated
   * @returns the (updated) old EventTimelineEdgeVisual visual
   * @protected
   */
  updateVisual(context, oldVisual, edge) {
    // Specify target and source points of the edge
    const source = edge.sourcePort.location
    const target = edge.targetPort.location

    // Extract the SVG elements that make up the edge
    const { sourceCircle, targetCircle } = oldVisual.tag

    // Copy the CSS Class
    oldVisual.svgElement.classList = this.cssClass

    // Update the source circle's x and y positions
    sourceCircle.cy.baseVal.value = source.y
    sourceCircle.cx.baseVal.value = source.x
    sourceCircle.r.baseVal.value = this.markerRadius

    // Update the target circle's x and y positions
    targetCircle.cy.baseVal.value = target.y
    targetCircle.cx.baseVal.value = target.x
    targetCircle.r.baseVal.value = this.markerRadius

    // return the (updated) old visual
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
}
