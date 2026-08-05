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
import {
  EdgePathLabelModel,
  EdgeSides,
  ExteriorNodeLabelModel,
  GraphBuilder,
  GraphComponent,
  GraphEditorInputMode,
  GroupNodeLabelModel,
  GroupNodeStyle,
  HierarchicalLayout,
  LabelStyle,
  LayoutExecutor,
  License,
  ShapeNodeShape,
  SimpleNode,
  Size
} from '@yfiles/yfiles'

import { createDemoShapeNodeStyle, initDemoStyles } from '@yfiles/demo-app/demo-styles'
import licenseData from '../../../lib/license.json'
import graphData from './graph-data.json'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import { NativeDragAndDropPanel } from './NativeDragAndDropPanel'

/**
 * Bootstraps the demo.
 */
async function run() {
  License.value = licenseData

  // initialize graph component
  const graphComponent = new GraphComponent('#graphComponent')
  graphComponent.inputMode = new GraphEditorInputMode()

  // configures default styles for newly created graph elements
  initializeGraph(graphComponent.graph)

  // build the graph from the given data set
  buildGraph(graphComponent.graph, graphData)

  // layout and center the graph
  LayoutExecutor.ensure()
  graphComponent.graph.applyLayout(new HierarchicalLayout({ minimumLayerDistance: 35 }))
  await graphComponent.fitGraphBounds()

  // enable the undo engine now to prevent undoing of the graph creation
  graphComponent.graph.undoEngineEnabled = true

  // configure drag and drop
  configureDragAndDrop(graphComponent)
}

/**
 * Creates nodes and edges according to the given data.
 */
function buildGraph(graph, graphData) {
  const graphBuilder = new GraphBuilder(graph)

  graphBuilder.createNodesSource({
    data: graphData.nodeList.filter((item) => !item.isGroup),
    id: (item) => item.id,
    parentId: (item) => item.parent
  })

  graphBuilder
    .createGroupNodesSource({
      data: graphData.nodeList.filter((item) => item.isGroup),
      id: (item) => item.id
    })
    .nodeCreator.createLabelBinding((item) => item.label)

  graphBuilder.createEdgesSource({
    data: graphData.edgeList,
    sourceId: (item) => item.source,
    targetId: (item) => item.target
  })

  graphBuilder.buildGraph()
}

/**
 * Configures drag and drop for this demo.
 */
function configureDragAndDrop(graphComponent) {
  // Get the input mode for handling dropped nodes from the GraphEditorInputMode.
  const inputMode = graphComponent.inputMode
  const nodeDropInputMode = inputMode.nodeDropInputMode
  // By default, the mode available in GraphEditorInputMode is disabled, so first enable it.
  nodeDropInputMode.enabled = true
  // Certain nodes should be created as group nodes. In this case, we distinguish them by their style.
  nodeDropInputMode.isGroupNodePredicate = (draggedNode) =>
    draggedNode.style instanceof GroupNodeStyle
  // When dragging the node within the GraphComponent, we want to show a preview of that node.
  nodeDropInputMode.showPreview = true

  initializeDragAndDropPanel(graphComponent)
}

/**
 * Initializes the palette of nodes that can be dragged to the graph component.
 */
function initializeDragAndDropPanel(graphComponent) {
  // retrieve the panel element
  const panel = document.querySelector('#native-dnd-panel')

  // prepare nodes for the palette
  const defaultNodeStyle = graphComponent.graph.nodeDefaults.style
  const otherNodeStyle = createDemoShapeNodeStyle(ShapeNodeShape.ELLIPSE)
  const defaultGroupNodeStyle = graphComponent.graph.groupNodeDefaults.style

  const nodeStyles = [
    {
      modelItem: new SimpleNode({ style: defaultNodeStyle, layout: [0, 0, 40, 40] }),
      tooltip: 'Rectangle'
    },
    {
      modelItem: new SimpleNode({ style: otherNodeStyle, layout: [0, 0, 40, 40] }),
      tooltip: 'Ellipse'
    },
    {
      modelItem: new SimpleNode({ style: defaultGroupNodeStyle, layout: [0, 0, 40, 40] }),
      tooltip: 'Group'
    }
  ]

  // create the drag-and-drop panel with draggable elements
  const nativeDragAndDropPanel = new NativeDragAndDropPanel(panel)
  nativeDragAndDropPanel.initialize(nodeStyles, graphComponent.inputMode)
}

/**
 * Initializes the defaults for the styling in this demo.
 */
function initializeGraph(graph) {
  // set styles for this demo
  initDemoStyles(graph)

  // set the style, label and label parameter for group nodes
  graph.groupNodeDefaults.style = new GroupNodeStyle({
    tabFill: '#46a8d5',
    tabPosition: 'top-leading',
    contentAreaFill: '#b5dcee'
  })
  graph.groupNodeDefaults.labels.style = new LabelStyle({
    horizontalTextAlignment: 'left',
    textFill: '#eee'
  })
  graph.groupNodeDefaults.labels.layoutParameter = new GroupNodeLabelModel().createTabParameter()

  // set sizes and locations specific for this demo
  graph.nodeDefaults.size = new Size(40, 40)
  graph.nodeDefaults.labels.layoutParameter = new ExteriorNodeLabelModel({
    margins: 5
  }).createParameter('bottom')
  graph.edgeDefaults.labels.layoutParameter = new EdgePathLabelModel({
    distance: 5,
    autoRotation: true
  }).createRatioParameter({ sideOfEdge: EdgeSides.BELOW_EDGE })
}

void run().then(finishLoading)
