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
import { NodeStyleBase, SvgVisualGroup } from '@yfiles/yfiles'

/**
 * A wrapper for the demo node style which sets additional CSS classes on its elements.
 */
export class CssNodeStyleWrapper extends NodeStyleBase {
  wrapped

  constructor(wrapped) {
    super()
    this.wrapped = wrapped
  }

  clone() {
    return new CssNodeStyleWrapper(this.wrapped.clone())
  }

  /**
   * Creates the visual for a node and sets some additional CSS classes on it.
   */
  createVisual(context, node) {
    const wrappedVisual = this.wrapped.renderer
      .getVisualCreator(node, this.wrapped)
      .createVisual(context)

    const svgVisualGroup = new SvgVisualGroup()
    svgVisualGroup.add(wrappedVisual)

    const svgElement = svgVisualGroup.svgElement

    // the visual should fade-in upon creation, so create it with zero opacity first
    svgElement.classList.add('node-style', 'hidden')

    context.setConnectedCallback(() => {
      // trigger force reflow to avoid frame batching and reliably trigger the CSS transition
      svgElement.getBBox()
      // trigger the fade-in CSS transition
      svgVisualGroup.svgElement.classList.remove('hidden')
    })

    return svgVisualGroup
  }

  /**
   * Re-renders the node.
   */
  updateVisual(context, oldVisual, node) {
    const oldWrappedVisual = oldVisual.children.get(0)
    const newWrappedVisual = this.wrapped.renderer
      .getVisualCreator(node, this.wrapped)
      .updateVisual(context, oldWrappedVisual)
    if (oldWrappedVisual !== newWrappedVisual) {
      oldVisual.children.set(0, newWrappedVisual)
    }
    return oldVisual
  }
}
