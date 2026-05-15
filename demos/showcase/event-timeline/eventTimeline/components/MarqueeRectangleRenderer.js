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
import { ObjectRendererBase, SvgVisual } from '@yfiles/yfiles'

/**
 * A marquee selection rectangle object
 */
export class MarqueeRectangleRenderer extends ObjectRendererBase {
  cssClass
  constructor(cssClass) {
    super()
    this.cssClass = cssClass
  }

  /**
   * Instantiates a new MarqueeRectangleRenderer
   * @param context An unused IRenderContext
   * @param renderTag The MarqueeRenderTag
   * @protected
   * @returns a new rectangular SVG Visual
   */
  createVisual(context, renderTag) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.classList.add(this.cssClass ?? 'marquee-rectangle')
    MarqueeRectangleRenderer.setBounds(rect, renderTag.selectionRectangle)
    return new SvgVisual(rect)
  }

  /**
   * Update the existing visual.
   * @param context An unused IRenderContext.
   * @param oldVisual The old SVGVisual to be updated.
   * @param renderTag The MarqueeRenderTag.
   * @protected
   * @returns The updated oldVisual.
   */
  updateVisual(context, oldVisual, renderTag) {
    MarqueeRectangleRenderer.setBounds(oldVisual.svgElement, renderTag.selectionRectangle)
    return oldVisual
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
