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
import { GraphBuilder, GraphComponent, License } from '@yfiles/yfiles'

import licenseData from '../../../lib/license.json'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import data from './resources/traffic-data.json'
import example from './resources/example.json'
import { EventTimeline } from './eventTimeline/EventTimeline'

/**
 * Runs the demo in its totality.
 */
async function run() {
  License.value = licenseData

  const exampleGraphComponent = new GraphComponent('#exampleGraphComponent')
  const exampleSubGraphComponent = new GraphComponent('#exampleSubGraphComponent')

  buildGraph(example, exampleGraphComponent.graph)
  const exampleEventTimeline = new EventTimeline(
    exampleGraphComponent,
    exampleSubGraphComponent,
    document.querySelector('#demo-example__subgraph-component'),
    (edge) => {
      return new Date(edge.tag.time)
    },
    'demo-example__timescale',
    100
  )
  void exampleEventTimeline.resetZoom('0s').then(() => exampleEventTimeline.resetZoom('0s'))

  const graphComponent = new GraphComponent('#graphComponent')
  const subGraphComponent = new GraphComponent('#subGraphComponent')

  buildGraph(data, graphComponent.graph)
  const eventTimeline = new EventTimeline(
    graphComponent,
    subGraphComponent,
    document.querySelector('#demo-main__subgraph-component'),
    (edge) => {
      return new Date(edge.tag.time)
    },
    'demo-main__timescale',
    100
  )
  initializeUI(eventTimeline)
}

/**
 * Builds a new graph from the specified data source
 * @param data the data (of type Data) to be loaded
 * @param graph the IGraph object into which to load the specified data
 */
function buildGraph(data, graph) {
  // Clear the graph
  graph.clear()

  // Create a new graph builder
  const graphBuilder = new GraphBuilder(graph)

  // Create a new node (label) source
  const nodesSource = graphBuilder.createNodesSource({ data: data.nodes, id: (node) => node.id })
  nodesSource.nodeCreator.createLabelBinding((node) => node.label)

  // Create a new edge (label) source
  const edgesSource = graphBuilder.createEdgesSource({
    data: data.edges,
    sourceId: (edge) => edge.source,
    targetId: (edge) => edge.target,
    id: (edge) => edge.id
  })
  edgesSource.edgeCreator.createLabelBinding((edge) => edge.label)

  // Build the graph
  graphBuilder.buildGraph()
}

/**
 * Binds actions to the demo's UI controls.
 */
function initializeUI(eventTimeline) {
  document
    .getElementById('zoom-reset-button')
    .addEventListener('click', () => eventTimeline.resetZoom())
  document
    .getElementById('horizontal-increase-stretch-button')
    .addEventListener('click', () => eventTimeline.changeResolution1D(-20, 'horizontal'))
  document
    .getElementById('horizontal-decrease-stretch-button')
    .addEventListener('click', () => eventTimeline.changeResolution1D(20, 'horizontal'))
  document
    .getElementById('vertical-increase-stretch-button')
    .addEventListener('click', () => eventTimeline.changeResolution1D(-20, 'vertical'))
  document
    .getElementById('vertical-decrease-stretch-button')
    .addEventListener('click', () => eventTimeline.changeResolution1D(20, 'vertical'))
}

// Run the Demo
await run().then(finishLoading)
