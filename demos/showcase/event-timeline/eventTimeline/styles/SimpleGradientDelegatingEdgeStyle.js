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
import { DelegatingEdgeStyle, SvgVisual } from '@yfiles/yfiles'
import { ItemState } from '../EventTimelineTypes'
import { getOrCreateGradient } from './GradientUtility'

export class SimpleGradientDelegatingEdgeStyle extends DelegatingEdgeStyle {
  wrappedStyle
  nodeToColorMapper
  useItemStateColors
  gradients

  /**
   * Instantiates a new SimpleGradientDelegatingEdgeStyle.
   * @param wrappedStyle the IEdgeStyle around which the SimpleGradientDelegatingEdgeStyle wraps
   * @param nodeToColorMapper maps a particular INode to a particular color
   * @param gradientMap the general map of gradients in the drawing
   * @param useItemStateColors whether to prefer colors stored in ItemState over the mapper
   */
  constructor(wrappedStyle, nodeToColorMapper, gradientMap = new Map(), useItemStateColors = true) {
    super()
    this.wrappedStyle = wrappedStyle
    this.nodeToColorMapper = nodeToColorMapper
    this.gradients = gradientMap
    this.useItemStateColors = useItemStateColors
  }

  /**
   * Creates a new SVGVisual object.
   * @param context the IRenderContext of the IEdge object
   * @param edge the IEdge to be visualized
   * @protected
   * @returns a newly created SVGVisual
   */
  createVisual(context, edge) {
    const source = edge.sourcePort.location
    const target = edge.targetPort.location

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    const state = edge.lookup(ItemState)

    const sourceColor =
      this.useItemStateColors && state?.edgeColorA
        ? state.edgeColorA
        : this.nodeToColorMapper(edge.sourceNode)
    const targetColor =
      this.useItemStateColors && state?.edgeColorB
        ? state.edgeColorB
        : this.nodeToColorMapper(edge.targetNode)

    if (sourceColor !== targetColor) {
      const linearGradient = getOrCreateGradient(
        this.gradients,
        sourceColor,
        targetColor,
        source.y,
        target.y
      )
      linearGradient.applyTo(rect, context)
    } else {
      rect.setAttribute('fill', sourceColor || 'var(--yfiles-event-timeline-edge-color, #dfdee3)')
    }

    rect.setAttribute('stroke', 'none')

    const visual = SvgVisual.from(rect, { rect, rectCache: {} })

    return this.updateVisual(context, visual, edge)
  }

  /**
   * Updates a given SVGVisual
   * @param _context the IRenderContext of the given SVGVisual
   * @param oldVisual the SVGVisual to be updated
   * @param edge the associated IEdge object
   * @protected
   * @returns an updated SVGVisual
   */
  updateVisual(_context, oldVisual, edge) {
    const source = edge.sourcePort.location
    const target = edge.targetPort.location
    const rect = oldVisual.svgElement
    const tag = oldVisual.tag

    const upperPort = source.y < target.y ? source : target
    const lowerPort = source.y < target.y ? target : source
    const width = this.wrappedStyle.stroke?.thickness ?? 10

    this.setAttrIfChanged(rect, tag.rectCache, 'x', `${upperPort.x - width / 2}`)
    this.setAttrIfChanged(rect, tag.rectCache, 'y', `${upperPort.y}`)
    this.setAttrIfChanged(rect, tag.rectCache, 'width', `${width}`)
    this.setAttrIfChanged(rect, tag.rectCache, 'height', `${lowerPort.y - upperPort.y}`)

    return oldVisual
  }

  /**
   * Gets the style of a given IEdge object
   * @param _edge the given IEdge object
   * @protected
   * @returns the style around which the SimpleGradientDelegatingEdgeStyle is wrapped
   */
  getStyle(_edge) {
    return this.wrappedStyle
  }

  setAttrIfChanged(element, cache, name, value) {
    if (cache[name] !== value) {
      element.setAttribute(name, value)
      cache[name] = value
    }
  }
}
