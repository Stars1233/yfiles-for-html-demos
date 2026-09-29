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
import { ObjectRendererBase, Rect, SvgVisual } from '@yfiles/yfiles'

/**
 * A marquee selection rectangle object
 */
export class MarqueeRectangleRenderer extends ObjectRendererBase {
  cssClass = 'marquee-rectangle'
  isTimescaleDrag

  constructor() {
    super()
    this.isTimescaleDrag = false
  }

  /**
   * Instantiates a new MarqueeRectangleRenderer
   * @param context The render context
   * @param renderTag The MarqueeRenderTag
   * @protected
   * @returns a new rectangular SVG Visual
   */
  createVisual(context, renderTag) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.classList.add(this.cssClass)
    rect.setAttribute('fill', 'var(--yfiles-event-timeline-marquee-fill-color, #d9bb7d)')
    rect.setAttribute('fill-opacity', '0.2')
    rect.setAttribute('stroke', 'var(--yfiles-event-timeline-marquee-stroke-color, #d9bb7d)')
    rect.setAttribute('stroke-width', '1')

    this.updateBounds(rect, context, renderTag)
    return new SvgVisual(rect)
  }

  /**
   * Update the existing visual.
   * @param context The render context.
   * @param oldVisual The old SVGVisual to be updated.
   * @param renderTag The MarqueeRenderTag.
   * @protected
   * @returns The updated oldVisual.
   */
  updateVisual(context, oldVisual, renderTag) {
    this.updateBounds(oldVisual.svgElement, context, renderTag)
    return oldVisual
  }

  /**
   * Updates the bounds of the SVG rectangle.
   */
  updateBounds(rect, context, renderTag) {
    let bounds = renderTag.selectionRectangle
    if (this.isTimescaleDrag) {
      const viewport = context.canvasComponent.viewport
      bounds = new Rect(bounds.x, viewport.y - 10, bounds.width, viewport.height + 10)
    }
    MarqueeRectangleRenderer.setBounds(rect, bounds)
  }

  /**
   * Sets the bounds of the created SVG rectangle.
   * @param rect The SVG rectangle whose bounds are to be updated.
   * @param bounds The new bounds of the SVG rectangle.
   * @private
   */
  static setBounds(rect, bounds) {
    rect.setAttribute('x', String(bounds.x))
    rect.setAttribute('y', String(bounds.y))
    rect.setAttribute('width', String(bounds.width))
    rect.setAttribute('height', String(bounds.height))
  }
}
