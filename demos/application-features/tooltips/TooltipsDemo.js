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
  ExteriorNodeLabelModel,
  Font,
  FontStyle,
  GraphComponent,
  GraphItemTypes,
  GraphViewerInputMode,
  INode,
  InteriorNodeLabelModel,
  LabelStyle,
  License,
  Point
} from '@yfiles/yfiles'

import { createDemoNodeLabelStyle, createDemoNodeStyle } from '@yfiles/demo-app/demo-styles'
import licenseData from '../../../lib/license.json'
import { configureFollowPointerTooltip } from './configure-follow-pointer-tooltip'
import { configureAboveNodeTooltip } from './configure-fixed-tooltip'
import { configureViewportBottomCenterTooltip } from './configure-viewport-tooltip'
import { configureLightDismissablePopover } from './configure-auto-popover'
import { configureManualPopover } from './configure-manual-popover'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import { createTooltipContent } from './create-content'

async function run() {
  License.value = licenseData

  // initialize graph component
  const graphComponent = new GraphComponent('#graphComponent')

  // disable interactive graph editing
  const inputMode = new GraphViewerInputMode()
  graphComponent.inputMode = inputMode

  // configure tooltips and popovers
  initializeTooltips(inputMode)
  initializePopovers(inputMode)

  // build a sample graph to demonstrate the different tooltips and popovers
  buildGraph(graphComponent)
}

/**
 * Initializes tooltips that show when hovering an item.
 */
function initializeTooltips(inputMode) {
  // the demo shows only node tooltips, but it works the same for any graph item
  inputMode.toolTipItems = GraphItemTypes.NODE

  // register a listener for when a tooltip should be shown
  inputMode.addEventListener('query-item-tool-tip', (evt) => {
    if (evt.handled) {
      // tooltip content has already been assigned -> nothing to do
      return
    }

    // this is a node because of the chosen toolTipItems above
    const node = evt.item

    // by default, the tooltip is opened at the pointer and stays open until the element is exited
    evt.toolTip = createTooltipContent(node)

    // depending on the node, the demo illustrates different tooltip behaviors on different nodes
    const labelTexts = node.labels.map((l) => l.text)
    if (labelTexts.includes('Above Node')) {
      configureAboveNodeTooltip(evt)
    } else if (labelTexts.includes('Follow Pointer')) {
      configureFollowPointerTooltip(evt)
    } else if (labelTexts.includes('Viewport Bottom Center')) {
      configureViewportBottomCenterTooltip(evt)
    }

    // indicate that the tooltip content has been set
    evt.handled = true
  })
}

/**
 * Initializes popovers that open on node click.
 */
function initializePopovers(inputMode) {
  inputMode.addEventListener('item-clicked', (evt, sender) => {
    if (!(evt.item instanceof INode)) {
      return
    }

    // depending on the node, the demo illustrates different popover behaviors
    const labelTexts = evt.item.labels.map((l) => l.text)
    if (labelTexts.includes('Light-dismissable Popover')) {
      configureLightDismissablePopover(evt, sender)
    } else if (labelTexts.includes('Manual Popover')) {
      configureManualPopover(evt, sender)
    }
  })
}

/**
 * Creates a sample graph.
 */
function buildGraph(graphComponent) {
  const graph = graphComponent.graph
  graph.nodeDefaults.size = [100, 100]
  graph.nodeDefaults.labels.layoutParameter = InteriorNodeLabelModel.CENTER
  graph.nodeDefaults.labels.style = new LabelStyle({
    textFill: '#fff',
    font: new Font({ fontSize: 12, fontStyle: FontStyle.ITALIC })
  })

  createStyledNode(graph, new Point(0, 0), 'Hover', 'Default Behavior', 'demo-palette-91')
  createStyledNode(graph, new Point(200, 0), 'Hover', 'Above Node', 'demo-palette-92')
  createStyledNode(graph, new Point(400, 0), 'Hover', 'Follow Pointer', 'demo-palette-93')
  createStyledNode(graph, new Point(600, 0), 'Hover', 'Viewport Bottom Center', 'demo-palette-94')

  // light-dismissable popovers
  createStyledNode(
    graph,
    new Point(800, -200),
    'Click',
    'Light-dismissable Popover',
    'demo-palette-95'
  )
  createStyledNode(
    graph,
    new Point(800, 0),
    'Click',
    'Light-dismissable Popover',
    'demo-palette-95'
  )
  createStyledNode(
    graph,
    new Point(800, 200),
    'Click',
    'Light-dismissable Popover',
    'demo-palette-95'
  )

  // manual popovers
  createStyledNode(graph, new Point(1000, -200), 'Click', 'Manual Popover', 'demo-palette-96')
  createStyledNode(graph, new Point(1000, 0), 'Click', 'Manual Popover', 'demo-palette-96')
  createStyledNode(graph, new Point(1000, 200), 'Click', 'Manual Popover', 'demo-palette-96')

  void graphComponent.fitGraphBounds()
}

/**
 * Creates a styled node with given labels.
 */
function createStyledNode(graph, location, centerText, bottomText, colorSetName) {
  graph.createNodeAt({
    location,
    style: createDemoNodeStyle(colorSetName),
    labels: [
      { text: centerText },
      {
        text: bottomText,
        layoutParameter: ExteriorNodeLabelModel.BOTTOM,
        style: createDemoNodeLabelStyle(colorSetName)
      }
    ]
  })
}

run().then(finishLoading)
