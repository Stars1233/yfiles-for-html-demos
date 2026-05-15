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
  Animator,
  type CanvasComponent,
  type GradientStop,
  GraphBuilder,
  type GraphComponent,
  GraphEditorInputMode,
  HeatMapRenderer,
  type IEdge,
  type IEnumerable,
  type IEnumerableConvertible,
  type IGraph,
  type INode,
  LayoutExecutor,
  OrganicLayout,
  PolylineEdgeStyle,
  ShapeNodeStyle,
  TimeSpan
} from '@yfiles/yfiles'

import graphData from './graph-data.json'
import { gradients } from './heat-gradients'
import { demoApp, graphComponent } from '@yfiles/demo-app/init'

type GraphData = {
  nodes: { id: number }[]
  edges: { id: number; source: number; target: number }[]
}

type ItemTag = { getHeat: (elapsedMilliseconds: number) => number }

initializeInteraction(graphComponent)

// configures default styles for newly created graph elements
initializeStyles(graphComponent.graph)

// build the graph from the given data set
buildGraph(graphComponent.graph, graphData)

// layout and center the graph
LayoutExecutor.ensure()
graphComponent.graph.applyLayout(new OrganicLayout())

graphComponent.updateContentBounds()
graphComponent.zoomTo(graphComponent.contentBounds.getEnlarged(100))

// enable undo after the initial graph was populated since we don't want to allow undoing that
graphComponent.graph.undoEngineEnabled = true

// initialize the heat map and start the animation
const getElapsedTime = startAnimation(graphComponent)
const heatProvider = createHeatProvider(getElapsedTime)
const heatMapRenderer = initializeHeatMap(heatProvider, gradients[0].value)

// add drop-downs
initializeUI(heatMapRenderer)

/**
 * Starts an infinite animation and returns a function that returns the elapsed time in milliseconds.
 */
function startAnimation(canvasComponent: CanvasComponent): () => number {
  const startTimeMilliseconds = Date.now()
  let elapsedMilliseconds = 0
  const updateElapsedMilliseconds = (): void => {
    elapsedMilliseconds = Date.now() - startTimeMilliseconds
  }

  const animator = new Animator({ canvasComponent, allowUserInteraction: true })
  void animator.animate(updateElapsedMilliseconds, TimeSpan.MAX_VALUE)

  return () => elapsedMilliseconds
}

/**
 * Creates the heat function that returns the heat value for a given item at a given time.
 */
function createHeatProvider(getElapsedTime: () => number) {
  return (item: INode | IEdge) => {
    const tag = item.tag as ItemTag | null
    return tag?.getHeat(getElapsedTime()) ?? 0
  }
}

/**
 * Initializes the {@link HeatMapRenderer} and adds it to the background group of the render tree.
 */
function initializeHeatMap(
  heatProvider: (item: INode | IEdge) => number,
  gradient: IEnumerable<GradientStop> | IEnumerableConvertible<GradientStop>
): HeatMapRenderer {
  const renderTree = graphComponent.renderTree
  const heatMapRenderer = new HeatMapRenderer({
    nodeHeatProvider: heatProvider,
    edgeHeatProvider: heatProvider,
    gradient
  })
  renderTree.createElement(renderTree.backgroundGroup, graphComponent.graph, heatMapRenderer)
  return heatMapRenderer
}

/**
 * Creates a tag with a random oscillator function for the heat map.
 */
function createRandomItemTag(): ItemTag {
  return { getHeat: createRandomOscillator() }
}

/**
 * Creates a random oscillator function that oscillates between 0 and 1.
 */
function createRandomOscillator(): (elapsedMilliseconds: number) => number {
  const period = 500 + Math.random() * 2000
  const amplitude = 0.8 + Math.random() * 0.2
  const phase = Math.random() * 2500
  return (elapsedMilliseconds: number) =>
    Math.max(0, amplitude * Math.sin((elapsedMilliseconds + phase) / period))
}

/**
 * Initializes the UI elements for the demo.
 */
function initializeUI(heatMapRenderer: HeatMapRenderer): void {
  demoApp.toolbar.addSeparator()
  demoApp.toolbar.addSelect('Heat Map Colors', gradients, (gradient) => {
    heatMapRenderer.gradient = gradient
  })

  const backgroundColors = [
    { label: 'White', value: 'white' },
    { label: 'Light Gray', value: '#cccccc' },
    { label: 'Dark Gray', value: '#777777' },
    { label: 'Black', value: 'black' }
  ]
  demoApp.toolbar.addSelect('Background', backgroundColors, (color) => {
    graphComponent.htmlElement.style.background = color
  })
}

/**
 * Creates nodes and edges according to the given data and adds the heat providers to the tags.
 */
function buildGraph(graph: IGraph, graphData: GraphData): void {
  const graphBuilder = new GraphBuilder(graph)

  graphBuilder.createNodesSource({
    data: graphData.nodes,
    id: (item) => item.id,
    tag: createRandomItemTag
  })

  graphBuilder.createEdgesSource({
    data: graphData.edges,
    sourceId: (item) => item.source,
    targetId: (item) => item.target,
    tag: createRandomItemTag
  })

  graphBuilder.buildGraph()
}

/**
 * Initializes the defaults for the styling in this demo.
 */
function initializeStyles(graph: IGraph): void {
  const fill = '#c1c1c1'
  const stroke = '1.5px #4d4d4d'

  graph.nodeDefaults.style = new ShapeNodeStyle({ shape: 'ellipse', fill, stroke })
  graph.edgeDefaults.style = new PolylineEdgeStyle({ stroke })
}

/**
 * Adds event listeners to node and edge creation that add a heat function to the tag of the created item.
 */
function initializeInteraction(graphComponent: GraphComponent): void {
  const graphEditorInputMode = new GraphEditorInputMode()
  graphComponent.inputMode = graphEditorInputMode

  graphEditorInputMode.addEventListener('node-created', (evt) => {
    evt.item.tag = createRandomItemTag()
  })
  graphEditorInputMode.createEdgeInputMode.addEventListener('edge-created', (evt) => {
    evt.item.tag = createRandomItemTag()
  })
}
