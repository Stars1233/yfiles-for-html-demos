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
import { INode, Point, PopoverBehavior, PopoverDescriptor } from '@yfiles/yfiles'
import { createPopoverContent } from './create-content'

/**
 * Configures an exclusive, light-dismissable, detail popover when a node is clicked, alongside the default tooltip
 * behavior.
 *
 * Note that the {@link PopoverBehavior.AUTO} causes automatic closing of any other {@link PopoverBehavior.AUTO}
 * popover, while still allowing tooltips that use {@link PopoverBehavior.HINT}.
 *
 * {@link PopoverBehavior.AUTO} also causes the popover to be light-dismissable. So pressing ESC or clicking outside the
 * popover also closes it automatically.
 *
 * @param evt The item clicked event.
 * @param sender The input mode that triggered the click event.
 */
export function configureLightDismissablePopover(evt, sender) {
  if (evt.item instanceof INode) {
    // indicate that the event opened a popover, so the event won't cause the selection of the node
    evt.handled = true

    const layout = evt.item.layout

    // the descriptor manages the popover's behavior and placement
    const popoverDescriptor = new PopoverDescriptor({
      // place it above the node
      anchor: new Point(layout.x + layout.width * 0.5, layout.y),
      ratios: new Point(0.5, 1),
      offset: new Point(0, -10),

      // make this popover exclusive and light-dismissable
      behavior: PopoverBehavior.AUTO
    })

    // assign the content to the popover descriptor
    popoverDescriptor.content = createPopoverContent(
      evt.context.canvasComponent,
      popoverDescriptor,
      evt.item
    )

    // open the popover
    void sender.popoverManager.open(popoverDescriptor)

    // focus the node delete button in the popover
    popoverDescriptor.contentContainer?.querySelector('button')?.focus()
  }
}
