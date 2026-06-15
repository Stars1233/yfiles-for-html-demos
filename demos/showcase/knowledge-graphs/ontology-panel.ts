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
  CloneTypes,
  EdgeLabelPreferredPlacement,
  FreeEdgeLabelModel,
  Graph,
  type GraphComponent,
  GraphCopier,
  type IGraph,
  type INode,
  InteriorNodeLabelModel,
  InteriorNodeLabelModelPosition,
  OrthogonalLayout,
  OrthogonalLayoutData,
  WebGLLabelStyle,
  WebGLPolylineEdgeStyle,
  WebGLShapeNodeStyle
} from '@yfiles/yfiles'
import { getEdgeTag, getNodeTag } from './types'
import { toggleComponentPanel } from './explorer-component'
import { clusterIdToColors, getNodeIcon, textColor } from './styles/graph-styles'

let ontologyGraph: IGraph

/**
 * Creates the ontology graph, i.e., the graph that visualizes the ontology triplets.
 * @param originalGraph - The original graph from which we extract the triplets
 */
export function createOntologyGraph(originalGraph: IGraph): IGraph {
  // Set some default styles for the ontology graph
  const colorTheme = clusterIdToColors.get(3)!
  const primaryColor = colorTheme.main
  const secondaryColor = colorTheme.light
  ontologyGraph = new Graph()
  ontologyGraph.nodeDefaults.style = new WebGLShapeNodeStyle({
    stroke: `2px ${primaryColor}`,
    fill: primaryColor,
    shape: 'ellipse'
  })
  ontologyGraph.nodeDefaults.size = [120, 120]
  ontologyGraph.nodeDefaults.labels.style = new WebGLLabelStyle({
    font: '60px Material Symbols Outlined, sans-serif',
    horizontalTextAlignment: 'center',
    verticalTextAlignment: 'center',
    wrapping: 'none',
    textColor
  })
  ontologyGraph.nodeDefaults.labels.layoutParameter = InteriorNodeLabelModel.TOP
  ontologyGraph.edgeDefaults.style = new WebGLPolylineEdgeStyle({
    stroke: `4px ${primaryColor}`,
    targetArrow: 'stealth'
  })
  ontologyGraph.edgeDefaults.labels.style = new WebGLLabelStyle({
    font: '20px sans-serif',
    backgroundStroke: `2px ${primaryColor}`,
    backgroundColor: secondaryColor,
    horizontalTextAlignment: 'center',
    verticalTextAlignment: 'center',
    padding: [2, 6, 2, 6],
    shape: 'squircle'
  })
  ontologyGraph.edgeDefaults.labels.layoutParameter = FreeEdgeLabelModel.INSTANCE.createParameter()

  // Create the ontology graph based on the node types
  const visitedNodeTypes = new Set<string>()
  const type2node = new Map<string, INode>()
  originalGraph.nodes.forEach((node) => {
    const type = getNodeTag(node).type
    if (type && !visitedNodeTypes.has(type)) {
      visitedNodeTypes.add(type)
      const ontologyNode = ontologyGraph.createNode({ tag: type, labels: [getNodeIcon(type)] })
      ontologyGraph.addLabel(
        ontologyNode,
        type,
        new InteriorNodeLabelModel({ padding: 15 }).createParameter(
          InteriorNodeLabelModelPosition.BOTTOM
        ),
        new WebGLLabelStyle({
          font: `20px sans-serif`,
          backgroundStroke: primaryColor,
          backgroundColor: secondaryColor,
          horizontalTextAlignment: 'center',
          verticalTextAlignment: 'center',
          padding: [2, 6, 2, 6],
          shape: 'squircle',
          textColor
        })
      )
      type2node.set(type, ontologyNode)
    }
  })

  originalGraph.edges.forEach((edge) => {
    const sourceType = getNodeTag(edge.sourceNode).type
    const targetType = getNodeTag(edge.targetNode).type
    if (sourceType && targetType) {
      const sourceOntologyNode = type2node.get(sourceType)!
      const targetOntologyNode = type2node.get(targetType)!
      if (!ontologyGraph.getEdge(sourceOntologyNode, targetOntologyNode)) {
        const ontologyEdge = ontologyGraph.createEdge(sourceOntologyNode, targetOntologyNode)
        ontologyGraph.addLabel(ontologyEdge, getEdgeTag(edge).label)
      }
    }
  })

  // Apply an orthogonal layout
  const orthogonalLayout = new OrthogonalLayout({
    nodeLabelPlacement: 'consider',
    edgeLabelPlacement: 'integrated'
  })

  const orthogonalLayoutData = new OrthogonalLayoutData({
    edgeLabelPreferredPlacements: new EdgeLabelPreferredPlacement({
      angleReference: 'absolute',
      placementAlongEdge: 'at-center'
    })
  })
  ontologyGraph.applyLayout(orthogonalLayout, orthogonalLayoutData)
  return ontologyGraph
}

/**
 * Sets the ontology graph to the explorer component and updates its visibility.
 * @param targetComponent - The explorer component on which the ontology graph will be added
 */
export function showOntologyGraph(targetComponent: GraphComponent): void {
  toggleComponentPanel(true)
  document.querySelector<HTMLDivElement>('#explorer-title-text')!.innerText = 'Ontology View'

  // Replace the graph that will be placed in the target component to copy the srcGraph to the target graph without GraphComponent
  // keeping its configuration.
  // This is important because the GraphCopier copies the WebGLZoomVisibilityPolicy in the label styles which
  // cannot be used in multiple GraphComponents.
  const tgtGraph = new Graph()
  const graphCopier = new GraphCopier({ cloneTypes: CloneTypes.ALL })
  graphCopier.copy(ontologyGraph, tgtGraph)

  // Assign the copied graph to the target component
  targetComponent.graph = tgtGraph
  void targetComponent.fitGraphBounds()
}
