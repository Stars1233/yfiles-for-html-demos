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
import { GraphItemTypes, IEdge, INode } from '@yfiles/yfiles'

/**
 * Creates the tooltip content for the given node.
 */
function createNodeTooltip(item, imageProvider) {
  const data = item.tag
  const dateString = data.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const levelPercent = `${data.level * 100}%`

  const tooltip = document.createElement('div')
  tooltip.classList.add('graph-tooltip')
  tooltip.innerHTML = `
    <div class="title">
      <img src="${imageProvider(data.image)}" alt=""/>
      <span>${data.name}</span>
    </div>
    <div class="data-rows">
      <div>
        <span>Date: ${dateString}</span>
      </div>
    </div>
    <div>Contamination Level:</div>
    <div class="progress-row">
      <div class="progress">
        <div class="progress-bar" style="width: ${levelPercent}"></div>
      </div>
      <span class="progress-percent">${levelPercent}</span>
    </div>
  `
  return tooltip
}

/**
 * Creates the tooltip content for the given edge.
 */
function createEdgeTooltip(item, imageProvider) {
  const sourceHTML = createNodeTooltip(item.sourceNode, imageProvider).outerHTML
  const targetHTML = createNodeTooltip(item.targetNode, imageProvider).outerHTML

  const tooltip = document.createElement('div')
  tooltip.classList.add('graph-tooltip', 'edge-tooltip')
  tooltip.innerHTML = `
    ${sourceHTML}
    <div>
      <span class="icon-inline link-icon">keyboard_arrow_right</span>
    </div>
    ${targetHTML}
  `
  return tooltip
}

/**
 * Enables tooltips for the given input mode.
 */
export function enableToolTips(inputMode, imageProvider) {
  inputMode.toolTipItems = GraphItemTypes.NODE | GraphItemTypes.EDGE
  inputMode.addEventListener('query-item-tool-tip', (args) => {
    if (args.handled) {
      return
    }
    if (args.item instanceof INode) {
      args.toolTip = createNodeTooltip(args.item, imageProvider)
    } else if (args.item instanceof IEdge) {
      args.toolTip = createEdgeTooltip(args.item, imageProvider)
    }
    args.handled = true
  })
}
