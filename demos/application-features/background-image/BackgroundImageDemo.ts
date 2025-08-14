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
  EdgePathLabelModel,
  EdgeSides,
  ExteriorNodeLabelModel,
  GraphBuilder,
  GraphComponent,
  GraphEditorInputMode,
  GroupNodeLabelModel,
  GroupNodeStyle,
  HierarchicalLayout,
  IGraph,
  IRenderTreeElement,
  LabelStyle,
  LayoutExecutor,
  License,
  Size
} from '@yfiles/yfiles'

import { RectangleVisualCreator } from './RectangleVisualCreator'
import { ImageVisualCreator } from './ImageVisualCreator'
import { initDemoStyles } from '@yfiles/demo-resources/demo-styles'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { finishLoading } from '@yfiles/demo-resources/demo-page'
import type { JSONGraph } from '@yfiles/demo-utils/json-model'
import graphData from './graph-data.json'

// Ensure that the LayoutExecutor class is not removed by build optimizers
// It is needed for the 'applyLayoutAnimated' method in this demo.
LayoutExecutor.ensure()

/**
 * Application Features - Add an image or colored rectangle to the background of the graph
 */
let graphComponent: GraphComponent = null!

/**
 * The canvas object that stores the background visualization. This can be used to remove the background image.
 */
let background: IRenderTreeElement = null!

async function run(): Promise<void> {
  License.value = await fetchLicense()
  graphComponent = new GraphComponent('#graphComponent')
  graphComponent.inputMode = new GraphEditorInputMode()

  const graph = graphComponent.graph

  // configures default styles for newly created graph elements
  initializeGraph(graph)

  // build the graph from the given data set
  buildGraph(graph, graphData)

  // layout and center the graph
  graph.applyLayout(new HierarchicalLayout({ minimumLayerDistance: 35 }))
  await graphComponent.fitGraphBounds()

  // enable now the undo engine to prevent undoing of the graph creation
  graph.undoEngineEnabled = true

  // set initial background
  displayImage()

  // bind the buttons to their functionality
  initializeUI()
}

/**
 * Creates nodes and edges according to the given data.
 */
function buildGraph(graph: IGraph, graphData: JSONGraph): void {
  const graphBuilder = new GraphBuilder(graph)

  graphBuilder.createNodesSource({
    data: graphData.nodeList.filter((item) => !item.isGroup),
    id: (item) => item.id,
    parentId: (item) => item.parentId
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
 * Creates the image and puts it in the background of the graph.
 */
function displayImage(): void {
  const renderTree = graphComponent.renderTree
  // delete what is already displayed in the background
  if (background !== null) {
    renderTree.remove(background)
  }
  // create the image and display it
  background = renderTree.createElement(renderTree.backgroundGroup, new ImageVisualCreator())
}

/**
 * Creates a colored rectangle and puts it in the background of the graph.
 */
function displayRectangle(): void {
  const renderTree = graphComponent.renderTree
  // delete what is already displayed in the background
  if (background !== null) {
    renderTree.remove(background)
  }
  // create the rectangle and display it
  background = renderTree.createElement(renderTree.backgroundGroup, new RectangleVisualCreator())
}

/**
 * Initializes the defaults for the styling in this demo.
 *
 * @param graph The graph.
 */
function initializeGraph(graph: IGraph): void {
  // set styles for this demo
  initDemoStyles(graph)

  // set the style, label and label parameter for group nodes
  graph.groupNodeDefaults.style = new GroupNodeStyle({
    tabFill: 'darkgray',
    tabWidth: 60,
    tabPosition: 'top-trailing',
    contentAreaFill: 'white'
  })
  graph.groupNodeDefaults.labels.style = new LabelStyle({
    horizontalTextAlignment: 'right',
    textFill: 'black'
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

/**
 * Binds the buttons in the toolbar to their functionality.
 */
function initializeUI(): void {
  const imageButton = document.querySelector<HTMLButtonElement>('#image')!
  const rectangleButton = document.querySelector<HTMLButtonElement>('#rectangle')!

  imageButton.addEventListener('click', (): void => {
    // display Image in the background
    displayImage()
    // enable the rectangle button
    rectangleButton.disabled = false
    // disabled the image button
    imageButton.disabled = true
  })

  rectangleButton.addEventListener('click', (): void => {
    // display colored rectangle in the background
    displayRectangle()
    // disable the rectangle button
    rectangleButton.disabled = true
    // enable the image button
    imageButton.disabled = false
  })
}

run().then(finishLoading)
