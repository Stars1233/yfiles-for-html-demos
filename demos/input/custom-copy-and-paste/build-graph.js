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
  createDemoEdgeLabelStyle,
  createDemoEdgeStyle,
  createDemoNodeLabelStyle,
  createDemoNodeStyle
} from '@yfiles/demo-app/demo-styles'
import {
  EdgeSegmentLabelModel,
  EdgeSides,
  ExteriorNodeLabelModel,
  GraphBuilder,
  InteriorNodeLabelModel,
  Rect
} from '@yfiles/yfiles'

/**
 * Builds a graph from the given data.
 * @param graph the graph to build.
 * @param graphData the JSON data to build the graph from.
 */
export function buildGraph(graph, graphData) {
  // set some default label models (different from the ones set by the graph builder)
  graph.nodeDefaults.labels.layoutParameter = ExteriorNodeLabelModel.TOP
  graph.edgeDefaults.labels.layoutParameter = new EdgeSegmentLabelModel().createParameterFromCenter(
    { sideOfEdge: EdgeSides.ABOVE_EDGE }
  )

  const graphBuilder = new GraphBuilder(graph)

  graphBuilder.createNodesSource({
    data: graphData.nodes,
    id: 'id',
    tag: 'tag',
    // make raw material nodes slightly larger than other nodes
    layout: (node) => new Rect(0, 0, 120, node.tag === 'raw-material' ? 60 : 30),
    style: (node) => createDemoNodeStyle(getItemColor(node.tag)),
    labels: [
      {
        text: 'label',
        style: (node) => createDemoNodeLabelStyle(getItemColor(node.tag)),
        layoutParameter: () => InteriorNodeLabelModel.CENTER
      }
    ]
  })

  graphBuilder.createEdgesSource({
    data: graphData.edges,
    sourceId: 'source',
    targetId: 'target',
    tag: 'tag',
    style: (edge) => {
      const edgeStyle = createDemoEdgeStyle({
        colorSetName: getItemColor(graphData.nodes.find((n) => n.id === edge.target).tag)
      })
      if (edge.label === 'refine') {
        // make refine edges slightly thicker than other edges
        const clonedStroke = edgeStyle.stroke.cloneCurrentValue()
        clonedStroke.thickness = 3
        edgeStyle.stroke = clonedStroke
      }
      return edgeStyle
    },
    labels: [
      {
        text: 'label',
        style: (edge) =>
          createDemoEdgeLabelStyle(
            getItemColor(graphData.nodes.find((n) => n.id === edge.target).tag)
          ),
        layoutParameter: () => new EdgeSegmentLabelModel().createParameterFromCenter()
      }
    ]
  })

  graphBuilder.buildGraph()

  // reset the style of some graph items to whom style can be copied
  graph.nodes
    .filter((node) => ['Bauxite', 'Aluminum', 'Housing'].includes(node.labels.first().text))
    .forEach((node) => {
      graph.setNodeLayout(node, Rect.fromCenter(node.layout.center, graph.nodeDefaults.size))
      graph.setStyle(node, graph.nodeDefaults.style)
      const nodeLabel = node.labels.first()
      graph.setStyle(nodeLabel, graph.nodeDefaults.labels.style)
      graph.setLabelLayoutParameter(nodeLabel, graph.nodeDefaults.labels.layoutParameter)
      graph.outEdgesAt(node).forEach((edge) => {
        graph.setStyle(edge, graph.edgeDefaults.style)
        const edgeLabel = edge.labels.first()
        graph.setStyle(edgeLabel, graph.edgeDefaults.labels.style)
        graph.setLabelLayoutParameter(edgeLabel, graph.edgeDefaults.labels.layoutParameter)
      })
    })
}

/**
 * Returns different colors for different categories.
 * @param category the category to get the color for.
 */
function getItemColor(category) {
  switch (category) {
    case 'raw-material':
      return 'demo-orange'
    case 'refined-material':
      return 'demo-lightblue'
    case 'intermediate-components':
      return 'demo-blue'
    case 'product':
      return 'demo-green'
    default:
      return null
  }
}
