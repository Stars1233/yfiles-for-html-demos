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
import { EdgeStyleBase, GradientStop, LinearGradient, Rect, SvgVisual } from '@yfiles/yfiles'

/**
 * The EvenTimelineHyperEdgeStyle extends the EdgeStyleBase to visualize a group of edges with the
 * same timestamp as a singular hyperedge.
 */
export class EventTimelineHyperEdgeStyle extends EdgeStyleBase {
  edges
  radius
  cssClass
  nodeToColorMapper
  edgeWidth
  gradients

  /**
   * Instantiates a new EventTimelineHyperEdgeStyle
   * @param edges the edges to be visualized as a singular hyperedge
   * @param radius the radius of the hyperedge's visual termini
   * @param edgeWidth the width of the hyperedge's visual
   * @param nodeToColorMapper maps a given INode to a particular color
   * @param gradientMap the collection of available color gradients in the drawing
   * @param cssClass the CSS class to be associated with the hyperedge's visual
   */
  constructor(
    edges,
    radius,
    edgeWidth,
    nodeToColorMapper,
    gradientMap = new Map(),
    cssClass = 'event-timeline-aggregate-edge'
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
   * Gets the EdgeBins of the hyperedge.
   * @private
   * @returns the EdgeBins of the hyperedge
   */
  getPortDimensions() {
    const sortedByY = new Map()
    for (const edge of this.edges) {
      const pts = [edge.sourcePort.location, edge.targetPort.location]
      pts.forEach((loc, idx) => {
        let group = sortedByY.get(loc.y)
        if (!group) {
          group = []
          sortedByY.set(loc.y, group)
        }
        group.push({
          pos: loc,
          color: this.nodeToColorMapper(idx === 0 ? edge.sourceNode : edge.targetNode)
        })
      })
    }
    return Array.from(sortedByY.entries()).map(([y, points]) => {
      const xCoords = points.map((p) => p.pos.x)
      return { xMin: Math.min(...xCoords), xMax: Math.max(...xCoords), y, color: points[0].color }
    })
  }

  /**
   * Creates a new EventTimelineHyperEdgeVisual
   * @param context the IRenderContext of the to-be-created visual
   * @param edge the IEdge to be rendered
   * @protected
   * @returns a newly created EventTimelineHyperEdgeVisual
   */
  createVisual(context, edge) {
    const hyperEdgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // 2. Create Edge elements
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const edges = this.edges.map((edge) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      const sourcePosition = edge.sourcePort.location
      const targetPosition = edge.targetPort.location
      const sourceColor = this.nodeToColorMapper(edge.sourceNode)
      const targetColor = this.nodeToColorMapper(edge.targetNode)
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
      rect.classList = this.cssClass + ' band'
      edgeGroup.appendChild(rect)
      return rect
    })
    hyperEdgeGroup.appendChild(edgeGroup)
    // 3. Create Port elements
    const portDimensions = this.getPortDimensions()
    const ports = portDimensions.map(() => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.classList = this.cssClass + ' terminus'
      hyperEdgeGroup.appendChild(rect)
      return rect
    })

    const visual = SvgVisual.from(hyperEdgeGroup, { ports, edges })

    return this.updateVisual(context, visual, edge)
  }

  /**
   * Updates an EventTimelineHyperEdgeVisual
   * @param context the IRenderContext of the given EventTimelineHyperEdgeVisual
   * @param oldVisual the EventTimelineHyperEdgeVisual to be updated
   * @param edge the associated IEdge object
   * @protected
   * @returns the updated EventTimelineHyperEdgeVisual
   */
  updateVisual(context, oldVisual, edge) {
    const cache = oldVisual.tag
    const portDimensions = this.getPortDimensions()

    //
    if (cache.ports.length !== portDimensions.length || cache.edges.length !== this.edges.length) {
      return this.createVisual(context, edge)
    }
    if (this.cssClass) {
      oldVisual.svgElement.classList = this.cssClass
    }

    portDimensions.forEach(({ xMin, xMax, y, color }, i) => {
      const rect = cache.ports[i]
      const width = Math.max(2 * this.radius, xMax - xMin + 2 * this.radius)
      rect.setAttribute('x', `${xMin - this.radius}`)
      rect.setAttribute('y', `${y - this.radius}`)
      rect.setAttribute('width', `${width}`)
      rect.setAttribute('height', `${width}`)
      rect.setAttribute('rx', `5`)
      rect.setAttribute('ry', `5`)
      rect.setAttribute('transform', `rotate(45 ${xMin} ${y})`)
      rect.style.stroke = color
    })

    //
    this.edges.forEach((e, i) => {
      const sourcePosition = e.sourcePort.location
      const targetPosition = e.targetPort.location
      const yMin = Math.min(sourcePosition.y, targetPosition.y)
      const yMax = Math.max(sourcePosition.y, targetPosition.y)
      const rect = cache.edges[i]

      rect.setAttribute('x', `${sourcePosition.x - this.edgeWidth / 2}`)
      rect.setAttribute('y', `${yMin}`)
      rect.setAttribute('width', `${this.edgeWidth}`)
      rect.setAttribute('height', `${yMax - yMin}`)
    })

    return oldVisual
  }

  /**
   * Gets the bounds of a given IEdge object's visual
   * @param context the visual's ICanvasContext
   * @param edge the IEdge object whose bounds are to be determined
   * @returns the bounds of the given IEdge
   */
  getBounds(context, edge) {
    let combinedBounds = Rect.EMPTY
    for (const e of this.edges) {
      const s = e.sourcePort.location
      const t = e.targetPort.location
      const yMin = Math.min(s.y, t.y)
      const yMax = Math.max(s.y, t.y)
      combinedBounds = Rect.add(
        combinedBounds,
        new Rect(s.x - this.edgeWidth / 2, yMin, this.edgeWidth, yMax - yMin)
      )
    }
    return combinedBounds
  }

  /**
   * Checks whether a given point falls within the bounds of the hyperedge's visual
   * @param context the IInputModeContext of the EventTimelineHyperEdgeVisual
   * @param location the point to be checked
   * @param edge the IEdge object associated with the hyperedge
   * @protected
   * @returns a boolean indicating whether the given point falls within the bounds of the hyperedge
   */
  isHit(context, location, edge) {
    return this.getBounds(context, edge)
      .getEnlarged(this.radius * 2)
      .contains(location)
  }

  /**
   * Checks whether a given IEdge is visible or not given a rectangle
   * @param context the edge's ICanvasContext
   * @param rectangle the rectangle within which the hyperedge must fall to be visible
   * @param edge the IEdge object whose visibility is to be tested
   * @protected
   * @returns a boolean indicating whether the hyperedge is visible or not
   */
  isVisible(context, rectangle, edge) {
    return rectangle.intersects(this.getBounds(context, edge).getEnlarged(this.radius))
  }
}
