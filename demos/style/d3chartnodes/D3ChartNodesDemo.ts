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
  ExteriorNodeLabelModel,
  GraphBuilder,
  GraphComponent,
  GraphEditorInputMode,
  LabelStyle,
  License,
  PolylineEdgeStyle,
  Rect
} from '@yfiles/yfiles'
import SampleData from './D3ChartNodesData'
import { D3ChartNodeStyle } from './D3ChartNodeStyle'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { finishLoading } from '@yfiles/demo-resources/demo-page'

let graphComponent: GraphComponent

async function run(): Promise<void> {
  License.value = await fetchLicense()

  // create a new graph component
  graphComponent = new GraphComponent('graphComponent')
  // load an initial graph
  loadSampleGraph()

  // initialize the input mode
  const graphEditorInputMode = new GraphEditorInputMode()
  graphEditorInputMode.addEventListener('node-created', (evt) => {
    // put random data in tag of created node
    evt.item.tag = createRandomSparklineData()
  })
  graphComponent.inputMode = graphEditorInputMode

  // set an interval to randomly change the sparkline data of some nodes
  setInterval(modifyData, 500)
}

/**
 * Continuously modifies the node data used as the input for the
 * sparkline visualization to simulate updating data from a server.
 */
function modifyData(): void {
  graphComponent.graph.nodes
    .filter(() => Math.random() < 0.1)
    .forEach((node) => {
      node.tag = createRandomSparklineData()
    })
  // make the graphComponent repaint it's content
  graphComponent.invalidate()
}

/**
 * Creates an array with random data.
 */
function createRandomSparklineData(): number[] {
  return Array.from({ length: 10 + Math.floor(Math.random() * 5) }, () => Math.random() * 10 + 1)
}

/**
 * Creates the initial sample graph.
 */
function loadSampleGraph(): void {
  // initialize the graph defaults
  const graph = graphComponent.graph
  graph.nodeDefaults.style = new D3ChartNodeStyle()
  graph.nodeDefaults.size = [100, 50]
  graph.nodeDefaults.labels.layoutParameter = new ExteriorNodeLabelModel({
    margins: 3
  }).createParameter('top')
  graph.nodeDefaults.labels.style = new LabelStyle({
    backgroundFill: 'rgba(255, 255, 255, 0.6)',
    padding: [2, 3, 2, 3]
  })

  graph.edgeDefaults.style = new PolylineEdgeStyle()

  const defaultNodeSize = graphComponent.graph.nodeDefaults.size
  const builder = new GraphBuilder(graphComponent.graph)
  builder.createNodesSource({
    data: SampleData.nodes,
    id: 'id',
    layout: (data) => new Rect(data.x, data.y, defaultNodeSize.width, defaultNodeSize.height),
    labels: ['label'],
    // put random data in tag of each node
    tag: () => createRandomSparklineData()
  })
  builder.createEdgesSource(SampleData.edges, 'source', 'target', 'id')

  builder.buildGraph()

  graphComponent.fitGraphBounds()
}

run().then(finishLoading)
