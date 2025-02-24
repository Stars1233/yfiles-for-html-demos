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
  Arrow,
  type ArrowTypeStringValues,
  FreeEdgeLabelModel,
  GraphComponent,
  GraphEditorInputMode,
  type INode,
  License,
  PolylineEdgeStyle,
  ShapeNodeStyle,
  SimpleEdge,
  Stroke
} from '@yfiles/yfiles'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { finishLoading } from '@yfiles/demo-resources/demo-page'
import {
  colorSets,
  createDemoEdgeLabelStyle,
  type ColorSetName
} from '@yfiles/demo-resources/demo-styles'

/**
 * Bootstraps the demo.
 */
async function run(): Promise<void> {
  License.value = await fetchLicense()
  const graphComponent = new GraphComponent('graphComponent')

  // create nodes, edges and arrows to demonstrate all arrow types
  initializeGraph(graphComponent)

  initializeUI(graphComponent)
  initializeInteraction(graphComponent)
  await graphComponent.fitGraphBounds()
}

/**
 * Creates a new edge style with the provided arrow type and color.
 */
function createEdgeStyleWithArrow(
  arrowType: ArrowTypeStringValues,
  colorSet: ColorSetName
): PolylineEdgeStyle {
  // create a new arrow
  const arrow = new Arrow({
    stroke: new Stroke(colorSets[colorSet].fill, 4),
    fill: null,
    lengthScale: 2,
    widthScale: 2,
    type: arrowType
  })

  // create a new edge style with the above arrow
  return new PolylineEdgeStyle({
    stroke: new Stroke(colorSets[colorSet].fill, 4),
    targetArrow: arrow
  })
}

/**
 * Creates nodes, edges, and arrows to demonstrate all arrow types.
 * @param graphComponent The graph in which to create nodes.
 */
function initializeGraph(graphComponent: GraphComponent): void {
  graphComponent.graph.nodeDefaults.style = new ShapeNodeStyle({
    fill: colorSets['demo-blue'].edgeLabelFill,
    stroke: null
  })

  // all available arrow types
  const arrowTypes: ArrowTypeStringValues[] = [
    'chevron',
    'cross',
    'deltoid',
    'diamond',
    'ellipse',
    'kite',
    'open',
    'stealth',
    'triangle'
  ]

  const colorSetNames: ColorSetName[] = [
    'demo-orange',
    'demo-blue',
    'demo-red',
    'demo-green',
    'demo-purple',
    'demo-lightblue',
    'demo-palette-22',
    'demo-palette-12',
    'demo-palette-14'
  ]

  /* iterate over all available arrows types and create arrows */
  let x = 0
  let y = 0
  let i = 1
  let lastNode: INode | null = null
  let currNode: INode | null = null
  const width = 80
  const height = 80
  while (arrowTypes.length > 0) {
    lastNode = currNode
    currNode = graphComponent.graph.createNode({ layout: [x, y, width, height] })
    // create an edge with the current arrow type
    if (i % 4 !== 1) {
      const arrowType = arrowTypes.pop()!
      const color = colorSetNames.pop()!
      const edge = graphComponent.graph.createEdge({
        source: lastNode!,
        target: currNode!,
        // crate edge style with the current arrow type
        style: createEdgeStyleWithArrow(arrowType, color)
      })
      // add arrow type text as edge label
      graphComponent.graph.addLabel(
        edge,
        arrowType,
        new FreeEdgeLabelModel().createParameter({ distance: 40 }),
        createDemoEdgeLabelStyle(color)
      )
    }
    // display 4 nodes (3 edges) in every row
    if (i % 4 === 0) {
      x = 0
      y += width + 150
    } else {
      x += height + 150
    }
    i++
  }
}

/**
 * Updates the edge thickness and arrow scale of all edges in the graph.
 */
function updateEdgeThickness(thickness: number, graphComponent: GraphComponent): void {
  graphComponent.graph.edges.forEach((edge) => {
    // obtain the current edge style and target arrow
    const edgeStyle = edge.style as PolylineEdgeStyle
    const arrow = edgeStyle.targetArrow as Arrow
    // update edge thickness, arrow stroke and scale
    graphComponent.graph.setStyle(
      edge,
      new PolylineEdgeStyle({
        stroke: new Stroke(edgeStyle.stroke!.fill!, thickness),
        targetArrow: new Arrow({
          lengthScale: Math.max(thickness / 2, 1),
          widthScale: Math.max(thickness / 2, 1),
          fill: arrow.fill,
          stroke: new Stroke(arrow.stroke!.fill!, thickness),
          type: arrow.type
        })
      })
    )
  })
}

/**
 * Updates the fill of all arrows in the graph.
 */
function updateArrowStyle(filled: number, graphComponent: GraphComponent): void {
  graphComponent.graph.edges.forEach((edge) => {
    // obtain the current edge style, stroke and target arrow
    const edgeStyle = edge.style as PolylineEdgeStyle
    const arrow = edgeStyle.targetArrow as Arrow
    const stroke = edgeStyle.stroke!
    // update the arrow fill
    graphComponent.graph.setStyle(
      edge,
      new PolylineEdgeStyle({
        stroke: stroke,
        targetArrow: new Arrow({
          fill: filled ? stroke.fill : null,
          lengthScale: arrow.lengthScale,
          widthScale: arrow.widthScale,
          stroke: stroke,
          type: arrow.type
        })
      })
    )
  })
}

/**
 * Registers event listeners to the toolbar editor.
 */
function initializeUI(graphComponent: GraphComponent): void {
  const slider = document.querySelector<HTMLInputElement>('#edge-thickness')!
  slider.addEventListener('input', () =>
    updateEdgeThickness(parseInt(slider.value), graphComponent)
  )
  const selector = document.querySelector<HTMLSelectElement>('#arrowStyle')!
  selector.addEventListener('change', () => {
    updateArrowStyle(selector.selectedIndex, graphComponent)
  })
}

/**
 * Sets up an input mode that assigns a random existing edge style to newly created edges.
 */
function initializeInteraction(graphComponent: GraphComponent): void {
  const inputMode = new GraphEditorInputMode({
    allowCreateNode: false,
    selectableItems: 'none',
    moveUnselectedItemsInputMode: { enabled: false }
  })
  inputMode.createEdgeInputMode.addEventListener('edge-creation-started', (evt) => {
    const edge = evt.item as SimpleEdge
    const numEdges = graphComponent.graph.edges.size
    const randomEdgeStyle = graphComponent.graph.edges.get(
      Math.floor(Math.random() * numEdges)
    ).style
    edge.style = randomEdgeStyle
  })
  graphComponent.inputMode = inputMode
}

run().then(finishLoading)
