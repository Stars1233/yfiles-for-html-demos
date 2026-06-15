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
import { GraphComponent, GraphEditorInputMode, GraphItemTypes, License, Rect } from '@yfiles/yfiles'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import licenseData from '../../../lib/license.json'

async function run() {
  License.value = licenseData

  const graphComponent = new GraphComponent('#graphComponent')
  const graphEditorInputMode = new GraphEditorInputMode()

  // enable simple tooltips
  graphEditorInputMode.addEventListener('query-item-tool-tip', (evt) => {
    const div = document.createElement('div')
    div.classList.add('test-tooltip')
    div.innerText = String(GraphItemTypes[GraphItemTypes.getItemType(evt.item)])
    evt.toolTip = div
  })
  graphEditorInputMode.toolTipItems = GraphItemTypes.NODE

  // enable a context menu
  graphEditorInputMode.addEventListener('populate-item-context-menu', (evt) => {
    evt.contextMenu = [
      {
        label: 'Clear the graph',
        cssClass: 'clear-graph-menu-item',
        action: () => {
          graph.clear()
        }
      }
    ]
  })

  // register the input-mode for interactive editing
  graphComponent.inputMode = graphEditorInputMode

  // create a sample graph
  const graph = graphComponent.graph

  graph.createNode(new Rect(100, 100, 30, 30))
  graph.createNode(new Rect(200, 200, 30, 30))

  // bind UI elements
  document
    .querySelector('#create-edge')
    .addEventListener('click', () => graph.createEdge(graph.nodes.first(), graph.nodes.last()))

  document.querySelector('#clear-graph').addEventListener('click', () => graph.clear())
}

run().then(finishLoading)
