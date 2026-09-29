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
  GraphBuilder,
  GraphComponent,
  GraphViewerInputMode,
  HierarchicalLayout,
  type IGraph,
  type INodeStyle,
  LabelStyle,
  LayoutExecutor,
  License,
  NodeStyleIndicatorRenderer,
  ShapeNodeStyle,
  Size,
  ViewportLimitingPolicy
} from '@yfiles/yfiles'

import { createDemoEdgeStyle } from '@yfiles/demo-app/demo-styles'
import { addNavigationButtons } from '@yfiles/demo-app/modern/element-utils'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import licenseData from '../../../lib/license.json'
import graphData from './graph-data.json'

import { HTMLLegend } from './HTMLLegend'
import type { JSONGraph } from '@yfiles/demo-utils/json-model'
import { createNodeStyleForType, type NodeTypeId } from './node-types'
import { RenderTreeWorldLegend } from './RenderTreeWorldLegend'
import type { LegendBase } from './LegendBase'
import { RenderTreeViewLegend } from './RenderTreeViewLegend'
import { GraphComponentLegend } from './GraphComponentLegend'

export type LegendType = 'html' | 'world' | 'view' | 'gc'

const mainContainer = document.querySelector<HTMLElement>('#main-container')!
let graphComponent: GraphComponent
let htmlLegend: HTMLLegend
let renderTreeWorldLegend: RenderTreeWorldLegend
let renderTreeViewLegend: RenderTreeViewLegend
let graphComponentLegend: GraphComponentLegend
let legends: Record<LegendType, LegendBase>
let currentLegend: LegendBase

async function run(): Promise<void> {
  License.value = licenseData

  // initialize the graph component
  graphComponent = new GraphComponent('#graphComponent')

  // disable the viewport limiter
  graphComponent.viewportLimiter.policy = ViewportLimitingPolicy.UNRESTRICTED

  // disable editing for this demo
  const graphViewerInputMode = new GraphViewerInputMode({
    selectableItems: 'none',
    focusableItems: 'none'
  })
  graphComponent.inputMode = graphViewerInputMode

  // create different types of legends
  htmlLegend = new HTMLLegend(graphComponent)
  renderTreeWorldLegend = new RenderTreeWorldLegend(graphComponent, graphViewerInputMode)
  renderTreeViewLegend = new RenderTreeViewLegend(graphComponent, graphViewerInputMode)
  graphComponentLegend = new GraphComponentLegend(graphComponent)
  legends = {
    html: htmlLegend,
    world: renderTreeWorldLegend,
    view: renderTreeViewLegend,
    gc: graphComponentLegend
  }

  // set graph defaults
  initializeGraph(graphComponent.graph)

  // build the graph from the given data set
  buildGraph(graphComponent.graph, graphData)

  // apply a hierarchical layout
  LayoutExecutor.ensure()
  graphComponent.graph.applyLayout(
    new HierarchicalLayout({
      minimumLayerDistance: 80,
      nodeDistance: 40,
      layoutOrientation: 'left-to-right'
    })
  )

  // make sure the graph is centered in the view
  graphComponent.contentMargins = 70
  await graphComponent.fitGraphBounds()

  // start with the html legend
  currentLegend = htmlLegend
  currentLegend.show()

  // bind the buttons to their functionality
  initializeUI()
}

/**
 * Sets graph defaults like style and a highlight decorator.
 */
function initializeGraph(graph: IGraph): void {
  graph.nodeDefaults.size = new Size(120, 36)
  graph.nodeDefaults.shareStyleInstance = false
  graph.nodeDefaults.labels.style = new LabelStyle({ textFill: 'white' })
  graph.edgeDefaults.style = createDemoEdgeStyle({ showTargetArrow: true })

  // define a highlight renderer that uses the shape of the node
  graph.decorator.nodes.highlightRenderer.addFactory(
    (node) =>
      new NodeStyleIndicatorRenderer({
        nodeStyle: new ShapeNodeStyle({
          shape: (node.style as ShapeNodeStyle).shape,
          fill: 'transparent',
          stroke: '3px #0b7189'
        }),
        margins: 4
      })
  )
}

/**
 * Builds a graph from the given data.
 * @param graph the graph to build.
 * @param graphData the JSON data to build the graph from.
 */
export function buildGraph(graph: IGraph, graphData: JSONGraph): void {
  const graphBuilder = new GraphBuilder(graph)

  // style the nodes based on their tag
  graphBuilder.createNodesSource({
    data: graphData.nodeList,
    id: 'id',
    labels: [{ text: 'label' }],
    // labels: [{ text: 'label', style: (node) => createLabelStyleForType(node.tag as NodeTypeId) }],
    tag: 'tag',
    style: (node): INodeStyle => createNodeStyleForType(node.tag as NodeTypeId)
  })

  graphBuilder.createEdgesSource({
    data: graphData.edgeList,
    sourceId: 'source',
    targetId: 'target'
  })

  graphBuilder.buildGraph()
}

/**
 * Binds the buttons in the toolbar to their functionality.
 */
function initializeUI(): void {
  const typeSelect = document.querySelector<HTMLSelectElement>('#legend-type-select')!
  const legendVisibilityToggle = document.querySelector<HTMLInputElement>(
    '#legend-visibility-toggle'
  )!
  const orientationToggle = document.querySelector<HTMLInputElement>('#legend-orientation-toggle')!
  const viewportFilterToggle = document.querySelector<HTMLInputElement>('#viewport-filter-toggle')!

  addNavigationButtons(typeSelect, 'Legend type:').addEventListener('change', (evt): void => {
    // hide current legend
    currentLegend.hide()

    const newLegendId = (evt.target as HTMLSelectElement).value as LegendType
    currentLegend = legends[newLegendId]

    // sync the legend settings
    currentLegend.setHorizontal(orientationToggle.checked)
    currentLegend.setShowOnlyVisible(viewportFilterToggle.checked)

    // show the new legend if legends are enabled
    if (legendVisibilityToggle.checked) {
      currentLegend.show()
    }
  })
  typeSelect.selectedIndex = 0

  legendVisibilityToggle.addEventListener('change', (): void => {
    if (legendVisibilityToggle.checked) {
      currentLegend.show()
    } else {
      currentLegend.hide()
    }
  })
  legendVisibilityToggle.checked = true

  orientationToggle.addEventListener('change', (): void => {
    mainContainer.classList.toggle('horizontal', orientationToggle.checked)
    currentLegend.setHorizontal(orientationToggle.checked)
    currentLegend.refresh()
  })
  orientationToggle.checked = false

  const updateViewportFilter = (): void => {
    currentLegend.setShowOnlyVisible(viewportFilterToggle.checked)
    currentLegend.refresh()

    if (viewportFilterToggle.checked) {
      // we need to refresh the legend on every viewport change because node types might need to be added
      // or removed from the legend
      graphComponent.addEventListener('viewport-changed', refreshCurrentLegend)
    } else {
      graphComponent.removeEventListener('viewport-changed', refreshCurrentLegend)
    }
  }
  viewportFilterToggle.addEventListener('change', updateViewportFilter)
  viewportFilterToggle.checked = false
  updateViewportFilter()
}

function refreshCurrentLegend(): void {
  currentLegend.refresh()
}

void run().then(finishLoading)
