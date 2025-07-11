/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) by yWorks GmbH, Vor dem Kreuzberg 28,
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
  BaseClass,
  type IRenderContext,
  IVisualCreator,
  type Rect,
  SvgVisual,
  type Visual
} from '@yfiles/yfiles'

/**
 * Creates a visual for the demo's background image.
 */
export class ImageVisualCreator extends BaseClass(IVisualCreator) {
  /**
   * Initializes a new instance of <code>ImageVisualCreator</code>.
   * @param imageRect The rectangle that defines the location and the size of the image.
   */
  constructor(private imageRect: Rect) {
    super()
  }

  /**
   * Creates a visual for the demo's background image.
   */
  createVisual(context: IRenderContext): SvgVisual {
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    image.x.baseVal.value = this.imageRect.x
    image.y.baseVal.value = this.imageRect.y
    image.width.baseVal.value = this.imageRect.width
    image.height.baseVal.value = this.imageRect.height
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'resources/earth-layers.svg')
    return new SvgVisual(image)
  }

  /**
   * Delegates the call to the {@link createVisual} method.
   */
  updateVisual(context: IRenderContext, oldVisual: Visual): Visual {
    return oldVisual
  }
}
