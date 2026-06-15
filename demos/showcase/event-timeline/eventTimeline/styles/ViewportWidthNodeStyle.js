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
import { NodeStyleBase, SvgVisual } from '@yfiles/yfiles'
import { ItemState } from '../EventTimelineTypes'

/**
 * The ViewportWidthNodeStyle extends the NodeStyleBase to visually represent a node as a rectangle
 * that spans the width of the viewport. More specifically, the node is visualized as three
 * rectangles, namely the
 * - mainRect: contains to which all its incident edges connect
 * - leftRect: extends from the left of the mainRect to the edge of the viewport
 * - rightRect: extends from the right of the mainRect to the edge of the viewport
 */
export class ViewportWidthNodeStyle extends NodeStyleBase {
  highlight
  constructor(highlight = false) {
    super()
    this.highlight = highlight
  }

  /**
   * Creates a new ViewportWidthNodeStyleVisual
   * @param context The IRenderContext of the SVGVisual
   * @param node the INode to be associated with the ViewportWidthNodeStyleVisual.
   */
  createVisual(context, node) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.classList.add('event-timeline-node')
    if (this.highlight) {
      group.classList.add('highlight')
    }

    const mainRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    const leftRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    leftRect.classList.add('ancillary-node')
    const rightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rightRect.classList.add('ancillary-node')

    group.appendChild(mainRect)
    group.appendChild(leftRect)
    group.appendChild(rightRect)

    const visual = SvgVisual.from(group, {
      mainRect,
      leftRect,
      rightRect,
      mainRectCache: {},
      leftRectCache: {},
      rightRectCache: {},
      highlightedAdjacent: undefined
    })

    return this.updateVisual(context, visual, node)
  }

  /**
   * Updates the SVG rectangle visuals
   * @param context The IRenderContext of the SVGVisual
   * @param oldVisual the ViewportWidthNodeStyleVisual to be updated
   * @param node the INode object associated with the ViewportWidthNodeStyleVisual
   */
  updateVisual(context, oldVisual, node) {
    const cache = oldVisual.tag
    const viewportXmin = context.canvasComponent.viewport.x
    const viewportXmax = viewportXmin + context.canvasComponent.viewport.width
    const { mainRect, leftRect, rightRect } = cache
    const radius = node.layout.height * 0.5

    const leftX = `${viewportXmin - 10}`
    const leftWidth = `${Math.max(0, node.layout.x - viewportXmin)}`
    const height = `${node.layout.height}`
    const y = `${node.layout.y}`
    const rx = `${radius}`
    const ry = `${radius}`

    const rightX = `${node.layout.x + node.layout.width}`
    const rightWidth = `${Math.max(0, viewportXmax - (node.layout.x + node.layout.width))}`

    const mainX = `${node.layout.x}`
    const mainWidth = `${node.layout.width}`

    this.setAttrIfChanged(leftRect, cache.leftRectCache, 'x', leftX)
    this.setAttrIfChanged(leftRect, cache.leftRectCache, 'width', leftWidth)
    this.setAttrIfChanged(leftRect, cache.leftRectCache, 'height', height)
    this.setAttrIfChanged(leftRect, cache.leftRectCache, 'y', y)
    this.setAttrIfChanged(leftRect, cache.leftRectCache, 'rx', rx)
    this.setAttrIfChanged(leftRect, cache.leftRectCache, 'ry', ry)

    this.setAttrIfChanged(rightRect, cache.rightRectCache, 'x', rightX)
    this.setAttrIfChanged(rightRect, cache.rightRectCache, 'width', rightWidth)
    this.setAttrIfChanged(rightRect, cache.rightRectCache, 'height', height)
    this.setAttrIfChanged(rightRect, cache.rightRectCache, 'y', y)
    this.setAttrIfChanged(rightRect, cache.rightRectCache, 'rx', rx)
    this.setAttrIfChanged(rightRect, cache.rightRectCache, 'ry', ry)

    this.setAttrIfChanged(mainRect, cache.mainRectCache, 'x', mainX)
    this.setAttrIfChanged(mainRect, cache.mainRectCache, 'width', mainWidth)
    this.setAttrIfChanged(mainRect, cache.mainRectCache, 'height', height)
    this.setAttrIfChanged(mainRect, cache.mainRectCache, 'y', y)
    this.setAttrIfChanged(mainRect, cache.mainRectCache, 'rx', rx)
    this.setAttrIfChanged(mainRect, cache.mainRectCache, 'ry', ry)
    this.setAttrIfChanged(mainRect, cache.mainRectCache, 'strokeWidth', '1')

    const highlightedAdjacent = node.lookup(ItemState)?.highlightedAdjacent ?? false
    if (cache.highlightedAdjacent !== highlightedAdjacent) {
      if (highlightedAdjacent) {
        mainRect.classList.add('highlighted-adjacent')
      } else {
        mainRect.classList.remove('highlighted-adjacent')
      }
      cache.highlightedAdjacent = highlightedAdjacent
    }

    return oldVisual
  }

  setAttrIfChanged(element, cache, name, value) {
    if (cache[name] !== value) {
      element.setAttribute(name, value)
      cache[name] = value
    }
  }
}
