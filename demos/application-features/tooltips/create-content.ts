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
import { type GraphComponent, type IModelItem, INode, type PopoverDescriptor } from '@yfiles/yfiles'

/**
 * The tooltip may either be a plain string or it can also be a rich HTML element. In this case, we
 * show the latter. We just extract the last label text from the given node and show it as
 * a tooltip.
 *
 * Basic tooltip styling can be done using the `.yfiles-tooltip` CSS class (see index.html).
 */
export function createTooltipContent(item: IModelItem | null): HTMLElement | null {
  if (!item) {
    return null
  }

  const title = document.createElement('h4')
  title.innerText = 'Node Tooltip'

  // extract the first label from the item
  let label = ''
  if (item instanceof INode && item.labels.size > 0) {
    label = item.labels.last()!.text
  }
  const text = document.createElement('p')
  text.innerText = label

  // build the tooltip container
  const tooltip = document.createElement('div')
  tooltip.classList.add('tooltip-content')
  tooltip.appendChild(title)
  tooltip.appendChild(text)
  return tooltip
}

/**
 * Creates interactive popover content for demonstration.
 *
 * @param graphComponent The {@link GraphComponent} in which the popover is displayed.
 * @param popoverDescriptor The descriptor to which the popover is attached.
 * @param item The node for which the popover is created.
 * @returns An interactive popover.
 */
export function createPopoverContent(
  graphComponent: GraphComponent,
  popoverDescriptor: PopoverDescriptor,
  item: INode
): HTMLDivElement {
  const popup = document.createElement('div')
  const label = item.labels.last()?.text ?? '&lt;no label&gt;'

  popup.innerHTML = `
    <div class="interactive-popover">
      <h4>Popover</h4>
      <p>${label}</p>
      <button class="delete-node">Delete Node</button>
      <button class="close-button">&times;</button>
    </div>
  `

  popup.querySelector('.delete-node')!.addEventListener('click', () => {
    popoverDescriptor.close()
    graphComponent.graph.remove(item)
  })
  popup.querySelector('.close-button')!.addEventListener('click', () => {
    popoverDescriptor.close()
  })

  return popup
}
