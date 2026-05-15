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
  type INode,
  type IRenderContext,
  NodeStyleBase,
  SvgVisual,
  type TaggedSvgVisual
} from '@yfiles/yfiles'

import type { NodeTag } from '../EventTimelineTypes'

/**
 * The ViewportWidthNodeStyleCache contains the three SVG elements that make up the
 * ViewportWidthNodeStyleVisual, i.e., three rectangles.
 */
type ViewportWidthNodeStyleCache = {
  mainRect: SVGRectElement
  leftRect: SVGRectElement
  rightRect: SVGRectElement
}

/**
 * The ViewportWidthNodeStyleVisual stores the ViewportWidthNodeStyleCache as a TaggedSvgVisual.
 */
type ViewportWidthNodeStyleVisual = TaggedSvgVisual<SVGGElement, ViewportWidthNodeStyleCache>

/**
 * The ViewportWidthNodeStyle extends the NodeStyleBase to visually represent a node as a rectangle
 * that spans the width of the viewport. More specifically, the node is visualized as three
 * rectangles, namely the
 * - mainRect: contains to which all its incident edges connect
 * - leftRect: extends from the left of the mainRect to the edge of the viewport
 * - rightRect: extends from the right of the mainRect to the edge of the viewport
 */
export class ViewportWidthNodeStyle extends NodeStyleBase {
  cssClass: string = 'viewport-width-node-style'

  /**
   * Instantiates a new ViewportWidthNodeStyle object.
   * @param cssClass The CSS class to be assigned to node object.
   */
  constructor(cssClass?: string) {
    super()
    if (cssClass) {
      this.cssClass = cssClass
    }
  }

  /**
   * Updates the SVG rectangle visuals
   * @param context The IRenderContext of the SVGVisual
   * @param oldVisual the ViewportWidthNodeStyleVisual to be updated
   * @param node the INode object associated with the ViewportWidthNodeStyleVisual
   */
  updateVisual(
    context: IRenderContext,
    oldVisual: ViewportWidthNodeStyleVisual,
    node: INode
  ): ViewportWidthNodeStyleVisual {
    const viewportXmin = context.canvasComponent.viewport.x
    const viewportXmax = viewportXmin + context.canvasComponent.viewport.width
    const { mainRect, leftRect, rightRect } = oldVisual.tag
    const radius = node.layout.height * 0.5
    leftRect.x.baseVal.value = viewportXmin - 10
    leftRect.width.baseVal.value = node.layout.x - viewportXmin
    leftRect.height.baseVal.value = node.layout.height
    leftRect.y.baseVal.value = node.layout.y
    leftRect.rx.baseVal.value = radius
    leftRect.ry.baseVal.value = radius

    rightRect.x.baseVal.value = node.layout.x + node.layout.width
    rightRect.width.baseVal.value = viewportXmax - (node.layout.x + node.layout.width)
    rightRect.height.baseVal.value = node.layout.height
    rightRect.y.baseVal.value = node.layout.y
    rightRect.rx.baseVal.value = radius
    rightRect.ry.baseVal.value = radius

    mainRect.x.baseVal.value = node.layout.x
    mainRect.width.baseVal.value = node.layout.width
    mainRect.height.baseVal.value = node.layout.height
    mainRect.y.baseVal.value = node.layout.y
    mainRect.rx.baseVal.value = radius
    mainRect.ry.baseVal.value = radius

    if ((node.tag as NodeTag).highlightedAdjacent) {
      mainRect.classList.add('highlighted-adjacent')
    } else {
      mainRect.classList.remove('highlighted-adjacent')
    }

    return oldVisual
  }

  /**
   * Creates a new ViewportWidthNodeStyleVisual
   * @param context The IRenderContext of the SVGVisual
   * @param node the INode to be associated with the ViewportWidthNodeStyleVisual.
   */
  createVisual(context: IRenderContext, node: INode): ViewportWidthNodeStyleVisual | null {
    // we create a circular Element
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.classList = this.cssClass
    const mainRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')

    const leftRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')

    leftRect.classList.add('ancillary-node')
    const rightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')

    rightRect.classList.add('ancillary-node')

    group.appendChild(mainRect)
    group.appendChild(leftRect)
    group.appendChild(rightRect)

    const visual = SvgVisual.from(group, { mainRect, leftRect, rightRect })

    return this.updateVisual(context, visual, node)
  }
}
