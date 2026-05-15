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
import { DelegatingEdgeStyle, GradientStop, LinearGradient, SvgVisual } from '@yfiles/yfiles'

/**
 * The SimpleGradientDelegatingEdgeStyle extends the DelegatingEdgeStyle to visualize an edge
 * with a color gradient.
 */
export class SimpleGradientDelegatingEdgeStyle extends DelegatingEdgeStyle {
  wrappedStyle
  nodeToColorMapper
  cssClass
  cssVarPrefix = 'yfiles-gdes'
  gradients

  /**
   * Instantiates a new SimpleGradientDelegatingEdgeStyle.
   * @param wrappedStyle the IEdgeStyle around which the SimpleGradientDelegatingEdgeStyle wraps
   * @param nodeToColorMapper maps a particular INode to a particular color
   * @param gradientMap the general map of gradients in the drawing
   * @param cssVarPrefix the prefix of the CSS variables in the visualization
   */
  constructor(wrappedStyle, nodeToColorMapper, gradientMap = new Map(), cssVarPrefix) {
    super()
    this.wrappedStyle = wrappedStyle
    this.nodeToColorMapper = nodeToColorMapper
    this.cssClass = cssVarPrefix
    // get the cssClass from the wrappedStyle
    if ('cssClass' in this.wrappedStyle) {
      this.cssClass = this.wrappedStyle.cssClass
    }
    this.gradients = gradientMap
    this.cssVarPrefix = cssVarPrefix
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

    const sourceColor = this.nodeToColorMapper(edge.sourceNode)
    const targetColor = this.nodeToColorMapper(edge.targetNode)
    if (sourceColor !== targetColor) {
      let linearGradient = this.gradients.get(
        source.y < target.y ? sourceColor + targetColor : targetColor + sourceColor
      )
      if (!linearGradient) {
        linearGradient = new LinearGradient({
          startPoint: [0, source.y < target.y ? 0 : 1],
          endPoint: [0, source.y < target.y ? 1 : 0],
          gradientStops: [
            new GradientStop({ offset: 0, color: sourceColor }),
            new GradientStop({ offset: 1, color: targetColor })
          ]
        })
        this.gradients.set(
          source.y < target.y ? sourceColor + targetColor : targetColor + sourceColor,
          linearGradient
        )
      }
      linearGradient.applyTo(rect, context)
    } else {
      rect.style.fill = sourceColor
    }

    return this.updateVisual(context, SvgVisual.from(rect), edge)
  }

  /**
   * Updates a given SVGVisual
   * @param context the IRenderContext of the given SVGVisual
   * @param oldVisual the SVGVisual to be updated
   * @param edge the associated IEdge object
   * @protected
   * @returns an updated SVGVisual
   */
  updateVisual(context, oldVisual, edge) {
    const source = edge.sourcePort.location
    const target = edge.targetPort.location
    const rect = oldVisual.svgElement
    const upperPort = source.y < target.y ? source : target
    const lowerPort = source.y < target.y ? target : source
    const width = this.wrappedStyle.stroke?.thickness ?? 10
    rect.setAttribute('x', `${upperPort.x - width / 2}`)
    rect.setAttribute('y', `${upperPort.y}`)
    rect.setAttribute('width', `${width}`)
    rect.setAttribute('height', `${lowerPort.y - upperPort.y}`)
    return oldVisual
  }

  /**
   * Gets the style of a given IEdge object
   * @param edge the given IEdge object
   * @protected
   * @returns the style around which the SimpleGradientDelegatingEdgeStyle is wrapped
   */
  getStyle(edge) {
    return this.wrappedStyle
  }
}
