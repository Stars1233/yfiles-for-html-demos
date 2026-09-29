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
import { EdgeStyleBase, Rect, SvgVisual } from '@yfiles/yfiles'
import { ItemState } from '../EventTimelineTypes'
import { getOrCreateGradient } from './GradientUtility'

/**
 * The EvenTimelineHyperEdgeStyle extends the EdgeStyleBase to visualize a group of edges with the
 * same timestamp as a singular hyperedge.
 */
export class EventTimelineHyperEdgeStyle extends EdgeStyleBase {
  radius
  cssClass = 'event-timeline-hyper-edge'
  nodeToColorMapper
  edgeWidth
  gradients

  /**
   * Instantiates a new EventTimelineHyperEdgeStyle
   * @param radius the radius of the hyperedge's visual termini
   * @param edgeWidth the width of the hyperedge's visual
   * @param nodeToColorMapper maps a given INode to a particular color
   * @param gradientMap the collection of available color gradients in the drawing
   */
  constructor(radius, edgeWidth, nodeToColorMapper, gradientMap = new Map()) {
    super()
    this.radius = radius
    this.edgeWidth = edgeWidth
    this.nodeToColorMapper = nodeToColorMapper
    this.gradients = gradientMap
  }

  getEdges(edge) {
    return edge.lookup(ItemState)?.representedGroup?.edges ?? []
  }

  /**
   * Gets the EdgeBins of the hyperedge.
   * @private
   * @returns the EdgeBins of the hyperedge
   */
  getPortDimensions(edge) {
    const sortedByY = new Map()

    for (const currentEdge of this.getEdges(edge)) {
      const pts = [currentEdge.sourcePort.location, currentEdge.targetPort.location]
      pts.forEach((loc, idx) => {
        let group = sortedByY.get(loc.y)
        if (!group) {
          group = []
          sortedByY.set(loc.y, group)
        }
        group.push({
          pos: loc,
          color: this.nodeToColorMapper(idx === 0 ? currentEdge.sourceNode : currentEdge.targetNode)
        })
      })
    }

    return Array.from(sortedByY.entries())
      .sort(([y1], [y2]) => y1 - y2)
      .map(([y, points]) => {
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
    const state = edge.lookup(ItemState)

    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const edges = this.getEdges(edge).map((currentEdge) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.classList.add('band')

      const sourcePosition = currentEdge.sourcePort.location
      const targetPosition = currentEdge.targetPort.location
      const sourceColor = this.nodeToColorMapper(currentEdge.sourceNode)
      const targetColor = this.nodeToColorMapper(currentEdge.targetNode)

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

    hyperEdgeGroup.appendChild(edgeGroup)

    const portDimensions = this.getPortDimensions(edge)
    const ports = portDimensions.map(() => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.classList.add(this.cssClass, 'terminus')
      if (state?.highlighted) {
        rect.classList.add('highlight')
      }
      hyperEdgeGroup.appendChild(rect)
      return rect
    })

    const visual = SvgVisual.from(hyperEdgeGroup, {
      ports,
      edges,
      portAttrCache: ports.map(() => ({})),
      edgeAttrCache: edges.map(() => ({})),
      svgClass: undefined
    })

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
    const portDimensions = this.getPortDimensions(edge)
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
      const width = Math.max(2 * this.radius, xMax - xMin + 2 * this.radius)

      this.setAttrIfChanged(rect, rectCache, 'x', `${xMin - this.radius}`)
      this.setAttrIfChanged(rect, rectCache, 'y', `${y - this.radius}`)
      this.setAttrIfChanged(rect, rectCache, 'width', `${width}`)
      this.setAttrIfChanged(rect, rectCache, 'height', `${width}`)
      this.setAttrIfChanged(rect, rectCache, 'rx', `5`)
      this.setAttrIfChanged(rect, rectCache, 'ry', `5`)
      this.setAttrIfChanged(rect, rectCache, 'transform', `rotate(45 ${xMin} ${y})`)
      this.setAttrIfChanged(rect, rectCache, 'stroke', color)
    })

    edges.forEach((e, i) => {
      const rect = cache.edges[i]
      const rectCache = cache.edgeAttrCache[i]

      const sourcePosition = e.sourcePort.location
      const targetPosition = e.targetPort.location
      const yMin = Math.min(sourcePosition.y, targetPosition.y)
      const yMax = Math.max(sourcePosition.y, targetPosition.y)

      this.setAttrIfChanged(rect, rectCache, 'x', `${sourcePosition.x - this.edgeWidth / 2}`)
      this.setAttrIfChanged(rect, rectCache, 'y', `${yMin}`)
      this.setAttrIfChanged(rect, rectCache, 'width', `${this.edgeWidth}`)
      this.setAttrIfChanged(rect, rectCache, 'height', `${yMax - yMin}`)
    })

    return oldVisual
  }

  /**
   * Gets the bounds of a given IEdge object's visual
   * @param _context the visual's ICanvasContext
   * @param edge the IEdge object whose bounds are to be determined
   * @returns the bounds of the given IEdge
   */
  getBounds(_context, edge) {
    let combinedBounds = Rect.EMPTY

    for (const e of this.getEdges(edge)) {
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

  setAttrIfChanged(element, cache, name, value) {
    if (cache[name] !== value) {
      element.setAttribute(name, value)
      cache[name] = value
    }
  }
}
