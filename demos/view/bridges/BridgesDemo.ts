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
  BridgeCrossingPolicy,
  BridgeCrossingStyle,
  BridgeManager,
  BridgeOrientationStyle,
  GraphComponent,
  GraphEditorInputMode,
  GraphObstacleProvider,
  HierarchicalNestingPolicy,
  Insets,
  License,
  Point,
  Rect
} from '@yfiles/yfiles'

import { CustomCallback, GroupNodeObstacleProvider } from './BridgeHelper'
import { initDemoStyles } from '@yfiles/demo-app/demo-styles'
import licenseData from '../../../lib/license.json'
import { addNavigationButtons } from '@yfiles/demo-app/modern/element-utils'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'

/**
 * Holds the graphComponent.
 */
let graphComponent: GraphComponent

/**
 * Holds the bridgeManager.
 */
let bridgeManager: BridgeManager

/**
 * Runs the demo.
 */
async function run(): Promise<void> {
  License.value = licenseData
  graphComponent = new GraphComponent('graphComponent')
  const graph = graphComponent.graph

  // draw edges in front, so that group nodes don't hide the bridges
  graphComponent.graphModelManager.edgeGroup.toFront()
  graphComponent.graphModelManager.hierarchicalNestingPolicy = HierarchicalNestingPolicy.NODES

  initDemoStyles(graph)

  graphComponent.inputMode = new GraphEditorInputMode()

  configureBridges()

  initializeToolBarElements()

  createSampleGraph()
}

/**
 * Adds and configures the {@link BridgeManager}.
 */
function configureBridges(): void {
  bridgeManager = new BridgeManager()

  // We would like to change the custom bridge rendering default,
  // this can be done by decorating the existing default callback
  bridgeManager.defaultBridgeCreator = new CustomCallback(bridgeManager.defaultBridgeCreator)

  // Convenience class that just queries all model item
  const provider = new GraphObstacleProvider()

  // We also want to query nodes for potential obstacles (disabled by default)
  provider.queryNodes = true

  // Register an IObstacleProvider, bridgeManager will query all registered obstacle providers
  // to determine if a bridge must be created
  bridgeManager.addObstacleProvider(provider)
  // Bind the bridge manager to the GraphComponent...
  bridgeManager.canvasComponent = graphComponent

  // We register a custom obstacle provider in the node's lookup of group nodes
  // that can be used by bridgeManager (through provider...)
  graphComponent.graph.decorator.nodes.obstacleProvider.addFactory(
    (node) => graphComponent.graph.isGroupNode(node),
    (node) => new GroupNodeObstacleProvider(node)
  )
}

/**
 * Initializes the combo boxes and the text-boxes of the toolbar.
 */
function initializeToolBarElements(): void {
  const crossingStylesComboBox = document.querySelector<HTMLSelectElement>('#crossing-styles')!
  addNavigationButtons(crossingStylesComboBox, 'Style:').addEventListener('change', () => {
    bridgeManager.defaultBridgeCrossingStyle = getValueFromComboBox('#crossing-styles')
    graphComponent.invalidate()
  })
  const crossingStylesElements = [
    { text: 'Arc', value: BridgeCrossingStyle.ARC },
    { text: 'Gap', value: BridgeCrossingStyle.GAP },
    { text: 'TwoSidesScaled', value: BridgeCrossingStyle.TWO_SIDES_SCALED },
    { text: 'TwoSides', value: BridgeCrossingStyle.TWO_SIDES },
    { text: 'Custom', value: BridgeCrossingStyle.CUSTOM },
    { text: 'Rectangle', value: BridgeCrossingStyle.RECTANGLE },
    { text: 'RectangleScaled', value: BridgeCrossingStyle.RECTANGLE_SCALED },
    { text: 'ArcScaled', value: BridgeCrossingStyle.ARC_SCALED }
  ]
  fillComboBox(crossingStylesComboBox, crossingStylesElements)

  const crossingPolicyComboBox = document.querySelector<HTMLSelectElement>('#crossing-policies')!
  addNavigationButtons(crossingPolicyComboBox, 'Crossing Policy:').addEventListener(
    'change',
    () => {
      bridgeManager.bridgeCrossingPolicy = getValueFromComboBox('#crossing-policies')
      graphComponent.invalidate()
    }
  )
  const crossingDeterminationElements = [
    { text: 'HorizontalBridgesVertical', value: BridgeCrossingPolicy.HORIZONTAL_BRIDGES_VERTICAL },
    { text: 'VerticalBridgesHorizontal', value: BridgeCrossingPolicy.VERTICAL_BRIDGES_HORIZONTAL },
    {
      text: 'MoreHorizontalBridgesLessHorizontal',
      value: BridgeCrossingPolicy.MORE_HORIZONTAL_BRIDGES_LESS_HORIZONTAL
    },
    {
      text: 'MoreVerticalBridgesLessVertical',
      value: BridgeCrossingPolicy.MORE_VERTICAL_BRIDGES_LESS_VERTICAL
    }
  ]
  fillComboBox(crossingPolicyComboBox, crossingDeterminationElements)

  const bridgeOrientationComboBox =
    document.querySelector<HTMLSelectElement>('#bridge-orientations')!
  addNavigationButtons(bridgeOrientationComboBox, 'Orientation: ').addEventListener(
    'change',
    () => {
      bridgeManager.defaultBridgeOrientationStyle = getValueFromComboBox('#bridge-orientations')
      graphComponent.invalidate()
    }
  )
  const bridgeOrientationElements = [
    { text: 'Up', value: BridgeOrientationStyle.UP },
    { text: 'Down', value: BridgeOrientationStyle.DOWN },
    { text: 'Left', value: BridgeOrientationStyle.LEFT },
    { text: 'Right', value: BridgeOrientationStyle.RIGHT },
    { text: 'FlowRight', value: BridgeOrientationStyle.FLOW_RIGHT },
    { text: 'Positive', value: BridgeOrientationStyle.POSITIVE },
    { text: 'Negative', value: BridgeOrientationStyle.NEGATIVE },
    { text: 'FlowLeft', value: BridgeOrientationStyle.FLOW_LEFT }
  ]
  fillComboBox(bridgeOrientationComboBox, bridgeOrientationElements)

  const sliders = [
    {
      sliderId: '#bridge-width-slider',
      labelId: 'bridge-width-label',
      defaultValue: bridgeManager.defaultBridgeWidth,
      updateValue: (value: number) => {
        bridgeManager.defaultBridgeWidth = value
      }
    },
    {
      sliderId: '#bridge-height-slider',
      labelId: 'bridge-height-label',
      defaultValue: bridgeManager.defaultBridgeHeight,
      updateValue: (value: number) => {
        bridgeManager.defaultBridgeHeight = value
      }
    },
    {
      sliderId: '#bridge-max-width-slider',
      labelId: 'bridge-max-width-label',
      defaultValue: bridgeManager.maximumBridgeWidth,
      updateValue: (value: number) => {
        bridgeManager.maximumBridgeWidth = value
      }
    }
  ]
  sliders.forEach((slider) => {
    const sliderElement = document.querySelector<HTMLInputElement>(slider.sliderId)!
    const labelElement = document.getElementById(slider.labelId)!
    sliderElement.value = slider.defaultValue.toString()
    labelElement.textContent = slider.defaultValue.toString()
    sliderElement.addEventListener('input', (evt) => {
      const value = (evt.target as HTMLInputElement).value
      slider.updateValue(parseInt(value))
      graphComponent.invalidate()
      labelElement.textContent = value
    })
  })
}

/**
 * Fills the given combo box with the given values.
 * @param comboBox The combo box to be filled
 * @param content The values to be used
 */
function fillComboBox(
  comboBox: HTMLElement | null,
  content: { text: string; value: number }[]
): void {
  if (!comboBox) {
    return
  }
  for (let i = 0; i < content.length; i++) {
    const el = document.createElement('option')
    el.textContent = content[i].text
    el.value = content[i].value.toString()
    comboBox.appendChild(el)
  }
}

/**
 * Returns the integer value of the currently-selected element in the combo box
 * with the given ID.
 * @param selector The ID of the combo box.
 */
function getValueFromComboBox(selector: string): number {
  const comboBox = document.querySelector<HTMLSelectElement>(selector)!
  return parseInt((comboBox[comboBox.selectedIndex] as HTMLOptionElement).value)
}

/**
 * Creates the sample graph.
 */
function createSampleGraph(): void {
  const graph = graphComponent.graph

  const gridSize = 4
  const nodeDist = 40
  for (let i = 1; i <= gridSize; i++) {
    // create a vertical and a horizontal node pair
    for (let dimension = 0; dimension < 2; dimension++) {
      const isVertical = dimension % 2 == 0
      const location1 = isVertical ? new Point(nodeDist * i, 0) : new Point(0, nodeDist * i)
      const location2 = isVertical
        ? new Point(nodeDist * i, (gridSize + 1) * nodeDist)
        : new Point((gridSize + 1) * nodeDist, nodeDist * i)
      const n1 = graph.createNodeAt(location1)
      const n2 = graph.createNodeAt(location2)

      // create edge with alternating direction
      const even = i % 2 == 0
      const source1 = even ? n1 : n2
      const target1 = even ? n2 : n1
      graph.createEdge(source1, target1)
    }
  }

  // create a second edge between node 0 and 1
  const p1 = graph.addPortAt(graph.nodes.get(1), new Point(0, 0))
  graph.setRelativePortLocation(p1, new Point(5, 0))
  const p2 = graph.addPortAt(graph.nodes.get(0), new Point(0, 0))
  graph.setRelativePortLocation(p2, new Point(5, 0))
  graph.createEdge(p1, p2)

  // label nodes with their index
  for (let i = 0; i < graph.nodes.size; i++) {
    graph.addLabel(graph.nodes.get(i), i.toString())
  }

  // create edges with different angles
  const n3 = graph.createNodeAt(new Point(300, 50))
  const n4 = graph.createNodeAt(new Point(750, 50))
  graph.createEdge(n3, n4)
  const n5 = graph.createNodeAt(new Point(350, 0))
  for (let i = 0; i < 6; i++) {
    const n = graph.createNodeAt(new Point(350 + i * 70, 100))
    graph.createEdge(n5, n)
  }

  const n6 = graph.createNodeAt(new Point(300, 200))
  const n7 = graph.createNodeAt(new Point(400, 200))
  const n8 = graph.createNodeAt(new Point(500, 200))
  graph.createEdge(n6, n8)

  // create a group node to show the effect of the custom GroupNodeObstacleProvider
  const groupNode = graph.createGroupNode()
  graph.addLabel(groupNode, 'Group Node')
  graph.setParent(n7, groupNode)
  graph.adjustGroupNodeLayout(groupNode)
  graph.setNodeLayout(groupNode, groupNode.layout.toRect().getEnlarged(new Insets(15, 0, 15, 0)))

  graphComponent.fitGraphBounds()
}

run().then(finishLoading)
