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
import { Point, PopoverUpdateReason } from '@yfiles/yfiles'

/**
 * Configures tooltips to appear centered at the bottom of the viewport.
 * @param evt The tooltip event.
 */
export function configureViewportBottomCenterTooltip(evt) {
  const graphComponent = evt.context.canvasComponent

  // place the tooltip centered at the bottom of the viewport
  evt.popover.anchor = graphComponent.viewToWorldCoordinates(
    new Point(graphComponent.innerSize.width * 0.5, graphComponent.innerSize.height)
  )
  // move the reference point on the tooltip content to the bottom center
  evt.popover.ratios = new Point(0.5, 1)
  evt.popover.offset = new Point(0, -30)

  // when the viewport changes (e.g., zooming while the tooltip is opened), reposition the tooltip
  evt.popover.addEventListener('update', (updateArgs) => {
    if (!updateArgs.handled && updateArgs.reason === PopoverUpdateReason.VIEWPORT_CHANGED) {
      evt.popover.anchor = graphComponent.viewToWorldCoordinates(
        new Point(graphComponent.innerSize.width * 0.5, graphComponent.innerSize.height)
      )
    }
  })
}
