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
import { BaseClass, IVisualCreator, SvgVisual } from '@yfiles/yfiles'

/**
 * Visual for the circle that is drawn around the nodes in the centric graph mode.
 * The circle is drawn around the nodes that are placed in the same radius with the CSS class 'centric-circle'.
 * The radius is calculated by the layout algorithm.
 * The circle is not rendered if the graph is not in the centric graph mode.
 */
class CircleVisual extends BaseClass(IVisualCreator) {
  placementProvider

  constructor(placementProvider) {
    super()
    this.placementProvider = placementProvider
  }

  createVisual(context) {
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    const circleSpec = this.getCircleSpec(context)

    for (const radius of circleSpec.radii) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', String(circleSpec.center.x))
      circle.setAttribute('cy', String(circleSpec.center.y))
      circle.setAttribute('r', radius.toString())
      circle.setAttribute('class', 'centric-circle')
      container.appendChild(circle)
    }

    return SvgVisual.from(container, circleSpec)
  }

  updateVisual(context, oldVisual) {
    const previousCircleSpec = oldVisual.tag
    const circleSpec = this.getCircleSpec(context)
    if (
      previousCircleSpec.center === circleSpec.center &&
      equalsArray(previousCircleSpec.radii, circleSpec.radii)
    ) {
      return oldVisual
    }
    return this.createVisual(context)
  }

  /**
   * Determines the circle information.
   * The center and radii of the circles are calculated from the layout information of the nodes.
   */
  getCircleSpec(context) {
    const graph = context.canvasComponent.graph

    let center = null
    const radii = new Set()
    for (const node of graph.nodes) {
      const placement = this.placementProvider(node)
      if (placement === null) {
        continue
      }
      if (center === null) {
        // only calculate the center once
        center = node.layout.center.subtract(placement.centerOffset)
      }
      radii.add(placement.radius)
    }
    return { center: center, radii: Array.from(radii).sort() }
  }
}

export default CircleVisual

/**
 * Checks if the two arrays are equal.
 */
function equalsArray(array1, array2) {
  if (array1 === array2) {
    return true
  }
  if (array1 == null || array2 == null) {
    return false
  }
  if (array1.length !== array2.length) {
    return false
  }

  // the radii in the arrays are sorted
  for (let i = 0; i < array1.length; ++i) {
    if (array1[i] !== array2[i]) {
      return false
    }
  }
  return true
}
