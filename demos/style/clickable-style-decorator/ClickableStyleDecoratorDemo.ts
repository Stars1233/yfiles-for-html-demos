/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML 2.6.
 ** Copyright (c) 2000-2023 by yWorks GmbH, Vor dem Kreuzberg 28,
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
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EdgePathLabelModel,
  EdgeSides,
  ExteriorLabelModel,
  GraphComponent,
  GraphEditorInputMode,
  IGraph,
  IModelItem,
  INode,
  ItemClickedEventArgs,
  License,
  Point,
  Size
} from 'yfiles'

import NodeStyleDecorator from './NodeStyleDecorator'
import { applyDemoTheme, initDemoStyles } from 'demo-resources/demo-styles'
import { fetchLicense } from 'demo-resources/fetch-license'
import { finishLoading } from 'demo-resources/demo-page'

let graphComponent: GraphComponent

/**
 * A cancelable timer to control the toast fadeout animation.
 */
let hideTimer: any = null

/**
 * Bootstraps the demo.
 */
async function run(): Promise<void> {
  License.value = await fetchLicense()
  // initialize graph component
  graphComponent = new GraphComponent('#graphComponent')
  applyDemoTheme(graphComponent)
  graphComponent.inputMode = new GraphEditorInputMode({
    allowGroupingOperations: true
  })
  graphComponent.graph.undoEngineEnabled = true

  // configures default styles for newly created graph elements
  initTutorialDefaults(graphComponent.graph)

  // register a click listener that handles clicks on the decorator
  initializeDecorationClickListener()

  // add a sample graph
  createGraph()
}

/**
 * Registers a click listener that handles clicks on a specific node area. In this case, we listen for clicks
 * on the decorator icon.
 */
function initializeDecorationClickListener(): void {
  ;(graphComponent.inputMode as GraphEditorInputMode).addItemClickedListener(
    (src: object, args: ItemClickedEventArgs<IModelItem>): void => {
      if (!INode.isInstance(args.item)) {
        return
      }
      const node = args.item
      if (
        !(node.style instanceof NodeStyleDecorator) ||
        !node.style.getDecorationLayout(node.layout).contains(args.location)
      ) {
        return
      }

      // The decorator was clicked.
      // Handle the click if it should do nothing else than what is defined in the decorator click listener.
      // Otherwise the click will be handled by other input modes, too. For instance, a node may be created or the
      // clicked node may be selected.
      args.handled = true

      // Shows a toast to indicate the successful click, and hides it again.
      clearTimeout(hideTimer)
      const toast = document.getElementById('toast') as HTMLElement
      toast.style.bottom = '40px'
      hideTimer = setTimeout((): void => {
        toast.style.bottom = '-50px'
      }, 2000)
    }
  )
}

/**
 * Initializes the defaults for the styling in this tutorial.
 *
 * @param graph The graph.
 */
function initTutorialDefaults(graph: IGraph): void {
  // set styles that are the same for all tutorials
  initDemoStyles(graph)

  // set sizes and locations specific for this tutorial
  graph.nodeDefaults.size = new Size(40, 40)
  graph.nodeDefaults.labels.layoutParameter = new ExteriorLabelModel({
    insets: 5
  }).createParameter('south')
  graph.edgeDefaults.labels.layoutParameter = new EdgePathLabelModel({
    distance: 5,
    autoRotation: true
  }).createRatioParameter({ sideOfEdge: EdgeSides.BELOW_EDGE })
}

/**
 * Creates a simple sample graph.
 */
function createGraph(): void {
  const graph = graphComponent.graph

  const node1 = graph.createNodeAt([110, 20])
  const node2 = graph.createNodeAt({
    location: [145, 95],
    style: new NodeStyleDecorator(graph.nodeDefaults.getStyleInstance(), 'resources/printer.svg')
  })
  const node3 = graph.createNodeAt({
    location: [75, 95],
    style: new NodeStyleDecorator(graph.nodeDefaults.getStyleInstance(), 'resources/switch.svg')
  })
  const node4 = graph.createNodeAt({
    location: [30, 175],
    style: new NodeStyleDecorator(graph.nodeDefaults.getStyleInstance(), 'resources/scanner.svg')
  })
  const node5 = graph.createNodeAt({
    location: [100, 175],
    style: new NodeStyleDecorator(
      graph.nodeDefaults.getStyleInstance(),
      'resources/workstation.svg'
    )
  })

  const edge1 = graph.createEdge(node1, node2)
  const edge2 = graph.createEdge(node1, node3)
  const edge3 = graph.createEdge(node3, node4)
  const edge4 = graph.createEdge(node3, node5)
  const edge5 = graph.createEdge(node1, node5)
  graph.setPortLocation(edge1.sourcePort!, new Point(123.33, 40))
  graph.setPortLocation(edge1.targetPort!, new Point(145, 75))
  graph.setPortLocation(edge2.sourcePort!, new Point(96.67, 40))
  graph.setPortLocation(edge2.targetPort!, new Point(75, 75))
  graph.setPortLocation(edge3.sourcePort!, new Point(65, 115))
  graph.setPortLocation(edge3.targetPort!, new Point(30, 155))
  graph.setPortLocation(edge4.sourcePort!, new Point(85, 115))
  graph.setPortLocation(edge4.targetPort!, new Point(90, 155))
  graph.setPortLocation(edge5.sourcePort!, new Point(110, 40))
  graph.setPortLocation(edge5.targetPort!, new Point(110, 155))
  graph.addBends(edge1, [new Point(123.33, 55), new Point(145, 55)])
  graph.addBends(edge2, [new Point(96.67, 55), new Point(75, 55)])
  graph.addBends(edge3, [new Point(65, 130), new Point(30, 130)])
  graph.addBends(edge4, [new Point(85, 130), new Point(90, 130)])

  graphComponent.fitGraphBounds()
  graph.undoEngine!.clear()
}

run().then(finishLoading)
