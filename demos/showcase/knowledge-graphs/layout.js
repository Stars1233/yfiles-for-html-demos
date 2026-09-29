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
  BundledEdgeRouter,
  CircularLayout,
  EdgeLabelPreferredPlacement,
  GenericLabelingData,
  GenericLayoutData,
  GivenCoordinatesLayout,
  GivenCoordinatesLayoutData,
  IEnumerable,
  LayoutExecutor,
  LayoutGraphHider,
  LayoutStageBase,
  List,
  NodeLabelDataKey,
  OrganicLayout,
  OrganicLayoutData,
  RadialLayout,
  RadialLayoutData,
  RecursiveGroupLayout,
  TemporaryGroupDescriptor,
  TemporaryGroupInsertionData,
  TemporaryGroupInsertionStage
} from '@yfiles/yfiles'
import { getLabelTag, getNodeTag } from './types'
import { getFilteredGraph } from './filtering'

/**
 * Runs the selected layout algorithm on the graph.
 *
 * Supported layout styles are `clusters`, `teams`, `location`, and
 * `neighborhood`. The 'clusters' layout is used by default.
 *
 * @param graphComponent - The graph component whose graph should be arranged
 * @param layoutStyle - The layout style to apply
 * @param importantNodes - Nodes that require special handling by the layout
 */
export async function runLayout(graphComponent, layoutStyle, importantNodes) {
  const config = getLayoutConfig(graphComponent, layoutStyle, importantNodes)

  const executor = new LayoutExecutor({
    graphComponent,
    layout: config.layout,
    layoutData: config.layoutData,
    animationDuration: '0.1s',
    animateViewport: true,
    easedAnimation: true
  })

  await executor.start()
}

/**
 * Configures the layout algorithm and the layout data based on the given layout style.
 *
 * @param graphComponent - The graphComponent to layout
 * @param layoutStyle - The layout style to be applied
 * @param importantNodes - Nodes that require special handling by the layout
 */
function getLayoutConfig(graphComponent, layoutStyle, importantNodes) {
  switch (layoutStyle) {
    case 'teams':
    case 'location':
      return configureCircularLayout(graphComponent, layoutStyle)
    case 'neighborhood':
      return configureRadialLayout(importantNodes)
    case 'clusters':
    default:
      return configureClusteringLayout(graphComponent)
  }
}

/**
 * Inserts temporary groups based on node cluster IDs and arranges the graph
 * using a Recursive Group Layout with an Organic Layout as the core layout.
 * Finally, applies a Bundled Edge Router to bundle edges and reduce visual clutter.
 *
 * @param graphComponent - The graphComponent to layout
 */
function configureClusteringLayout(graphComponent) {
  const graph = graphComponent.graph
  // Core layout used for each clustered group.
  const organicLayout = new OrganicLayout({ compactnessFactor: 1, qualityTimeRatio: 1 })

  // Applies the core layout recursively to nested group nodes.
  const recursiveGroupLayout = new RecursiveGroupLayout({ coreLayout: organicLayout })

  // Bundles edges and inserts temporary group nodes before applying the core layout.
  const layout = new BundledEdgeRouter({
    edgeBundling: { bundlingStrength: 0.7 },
    strategy: 'spanner',
    coreLayout: new TemporaryGroupInsertionStage(recursiveGroupLayout)
  })

  // Group nodes by their cluster IDs, which are derived from the Louvain clustering result.
  const groups = groupNodesBy(graph.nodes, (node) => getNodeTag(node).clusterId)
  const temporaryGroupsData = createTemporaryGroupsData(
    groups.values(),
    () =>
      new OrganicLayout({
        nodeLabelPlacement: 'consider',
        defaultPreferredEdgeLength: 70,
        starSubstructureStyle: 'radial',
        treeSubstructureStyle: 'radial-tree',
        starSubstructureSize: 30,
        defaultMinimumNodeDistance: 10
      })
  )

  const organicLayoutData = new OrganicLayoutData({
    // Keep nodes of the same type closer together in the final layout.
    nodeTypes: (node) => getNodeTag(node).type
  })

  return { layout, layoutData: temporaryGroupsData.combineWith(organicLayoutData) }
}

/**
 * Groups nodes by team or by the team's location, then arranges the graph
 * using a Recursive Group Layout with a Circular Layout as the core layout.
 * Finally, applies a Bundled Edge Router to reduce edge crossings and visual clutter.
 *
 * @param graphComponent - The graphComponent to layout
 * @param groupBy - Determines whether nodes are grouped by team or by location
 */
function configureCircularLayout(graphComponent, groupBy) {
  const graph = graphComponent.graph
  // Core layout used for the recursive arrangement of each group.
  const circularLayout = new CircularLayout({
    partitioningPolicy: 'single-cycle',
    nodeLabelPlacement: 'consider',
    partitionDescriptor: { minimumNodeDistance: 0 }
  })
  if (groupBy !== 'location') {
    circularLayout.componentLayout.enabled = false
    circularLayout.partitionDescriptor.minimumNodeDistance = 50
  }

  // Applies the core layout recursively to nested group nodes.
  const recursiveGroupLayout = new RecursiveGroupLayout({ coreLayout: circularLayout })

  // Bundles edges and inserts temporary group nodes before applying the core layout.
  const layout = new BundledEdgeRouter({
    strategy: 'force-directed',
    edgeBundling: { bundlingStrength: 0.99, bundlingQuality: 1 },
    coreLayout: new TemporaryGroupInsertionStage(recursiveGroupLayout)
  })

  // Group nodes by team, or by the location of their team when requested.
  const groups = groupNodesBy(graph.nodes, (node) => {
    return getGroupName(graph, node, groupBy)
  })

  const temporaryGroupsData = createTemporaryGroupsData(
    groups.values(),
    () =>
      new OrganicLayout({
        nodeLabelPlacement: 'consider',
        starSubstructureStyle: 'radial-nested',
        starSubstructureSize: 25,
        defaultPreferredEdgeLength: 40
      })
  )
  return { layout, layoutData: temporaryGroupsData }
}

/**
 * Arranges the graph using a Radial Layout and hides non-text labels during
 * the layout process so they do not affect the result.
 *
 * @param centerNodes - Nodes that require special handling by the layout
 * @returns The layout algorithm and its associated layout data
 */
function configureRadialLayout(centerNodes) {
  // Wrap the radial layout in a custom stage that temporarily hides selected labels.
  const layout = new LabelRemovalStage(
    new RadialLayout({
      nodeLabelPlacement: 'ray-like-leaves',
      edgeLabelPlacement: 'generic',
      maximumChildSectorAngle: 360
    })
  )

  const genericLayoutData = new GenericLayoutData()
  // Hide icon labels so that they are ignored by the layout algorithm.
  genericLayoutData.addItemCollection(LabelRemovalStage.LABEL_REMOVAL_DATA_KEY).predicate = (
    label
  ) => getLabelTag(label).type !== 'text'

  // Configure edge label placement along edges.
  const genericLabelingData = new GenericLabelingData({
    edgeLabelPreferredPlacements: new EdgeLabelPreferredPlacement({
      edgeSide: 'on-edge',
      placementAlongEdge: 'at-center'
    })
  })

  // Use cluster IDs as the radial grouping criterion.
  const radialLayoutData = new RadialLayoutData({
    nodeTypes: (node) => getNodeTag(node).clusterId,
    centerNodes
  })

  return {
    layout,
    layoutData: genericLabelingData.combineWith(genericLayoutData.combineWith(radialLayoutData))
  }
}

/**
 * Groups nodes by a key derived from each node.
 *
 * @param nodes - The nodes to group
 * @param getGroupKey - Returns the grouping key for a node
 * @returns A map whose keys are group identifiers and whose values are the nodes in each group
 */
function groupNodesBy(nodes, getGroupKey) {
  const groups = new Map()
  for (const node of nodes) {
    const groupKey = getGroupKey(node)
    const group = groups.get(groupKey)

    if (group) {
      group.push(node)
    } else {
      groups.set(groupKey, [node])
    }
  }
  return groups
}

/**
 * Creates temporary group descriptors for the given node groups.
 *
 * @param groups - The node groups to insert temporarily into the graph
 * @param createGroupLayout - Creates the layout used for each temporary group
 * @returns The temporary group insertion data
 */
function createTemporaryGroupsData(groups, createGroupLayout) {
  const data = new TemporaryGroupInsertionData()
  for (const groupNodes of groups) {
    const temporaryGroup = new TemporaryGroupDescriptor({
      recursiveGroupLayoutAlgorithm: createGroupLayout()
    })
    data.temporaryGroups.add(temporaryGroup).items = List.from(groupNodes)
  }

  return data
}

/**
 * Returns the grouping name for a node based on the selected circular layout mode.
 * Nodes are grouped either by their team label or by the label of their team's location.
 *
 * @param graph - The graph containing the node
 * @param node - The node whose group name should be determined
 * @param groupBy - Determines whether grouping is based on team or location
 * @returns The group name used for circular layout grouping
 */
function getGroupName(graph, node, groupBy) {
  const teamNode = getTeamNode(graph, node)
  let groupName = getNodeTag(teamNode).label
  if (groupBy === 'location') {
    const locationEdge = getLocationNode(graph, teamNode)
    if (locationEdge) {
      groupName = getNodeTag(locationEdge.targetNode).label
    }
  }
  return groupName
}

/**
 * Returns the team node associated with the given node.
 * If the node is already a team node, it is returned as-is.
 * Otherwise, the function tries to find a connected team node with the same cluster ID.
 *
 * @param graph - The graph containing the node
 * @param node - The node whose associated team node should be resolved
 * @returns The matching team node, or the original node if no team node is found
 */
function getTeamNode(graph, node) {
  const nodeTag = getNodeTag(node)
  if (nodeTag.type === 'Team') {
    return node
  }
  const isMatchingTeam = (candidate) => {
    const candidateTag = getNodeTag(candidate)
    return candidateTag.type === 'Team' && candidateTag.clusterId === nodeTag.clusterId
  }

  const teamEdge = graph.edgesAt(node).find((edge) => {
    return isMatchingTeam(edge.sourceNode) || isMatchingTeam(edge.targetNode)
  })

  const adjacentTeam = teamEdge
    ? isMatchingTeam(teamEdge.sourceNode)
      ? teamEdge.sourceNode
      : teamEdge.targetNode
    : undefined
  return adjacentTeam ?? graph.nodes.find(isMatchingTeam) ?? node
}

/**
 * Returns the outgoing edge from a team node to its location node.
 *
 * @param graph - The graph containing the team node
 * @param teamNode - The team node whose location edge should be found
 * @returns The outgoing edge to a location node, or `null` if none exists
 */
function getLocationNode(graph, teamNode) {
  return (
    graph.outEdgesAt(teamNode).find((edge) => {
      return getNodeTag(edge.targetNode).type === 'Location'
    }) ?? null
  )
}

/**
 * Moves the incremental nodes of the graph at the center of the graphComponent and
 * resets the edge paths so that the animation of the layout is smoother and nicer.
 *
 * @param graphComponent - The given graphComponent
 * @param incrementalNodes - The new nodes inserted in the graphComponent
 */
export function prepareSmoothLayoutAnimation(graphComponent, incrementalNodes) {
  const graph = getFilteredGraph(graphComponent)

  graph.applyLayout(
    new GivenCoordinatesLayout(),
    new GivenCoordinatesLayoutData({
      nodeLocations: (node) =>
        incrementalNodes.includes(node) ? graphComponent.viewport.center : node.layout.center,
      edgePaths: IEnumerable.EMPTY
    })
  )
}

/**
 * A custom layout stage that hides the labels that are marked by the user using the {@link LABEL_REMOVAL_DATA_KEY}.
 */
export class LabelRemovalStage extends LayoutStageBase {
  /**
   * Key to register a {@link Mapper} with the input graph where the labels that should
   * be removed are marked.
   */
  static LABEL_REMOVAL_DATA_KEY = new NodeLabelDataKey('LabelRemovalStage.LABEL_REMOVAL_DATA_KEY')

  /**
   * A stage that hides the marked labels from the core layout algorithm, applies teh core layout
   * and, unhides again the marked labels.
   *
   * @param graph - The layout graph to arrange
   */
  applyLayoutImpl(graph) {
    if (!this.coreLayout) {
      return
    }
    const dataMap = graph.context.getItemData(LabelRemovalStage.LABEL_REMOVAL_DATA_KEY)
    const hider = new LayoutGraphHider(graph)

    if (dataMap) {
      graph.nodeLabels.forEach((label) => {
        if (dataMap.get(label)) {
          hider.hide(label)
        }
      })
    }

    this.coreLayout.applyLayout(graph)

    if (dataMap) {
      hider.unhideAll()
    }
  }
}
