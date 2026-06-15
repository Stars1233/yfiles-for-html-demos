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
  EdgeDataKey,
  EdgeLabelPreferredPlacement,
  GenericLabelingData,
  GenericLayoutData,
  Insets,
  LayoutExecutorAsync,
  LayoutGraphHider,
  LayoutStageBase,
  NodeDataKey,
  NodeLabelDataKey,
  OrganicLayout,
  OrganicLayoutData,
  RadialLayoutData,
  RadialTreeLayout,
  RecursiveGroupLayout,
  RecursiveGroupLayoutData
} from '@yfiles/yfiles'
import { getEdgeTag, getLabelTag, getNodeTag } from './types'

export const clusterNodeDataKey = new NodeDataKey('ClusterNodeDataKey')
export const problemEdgeDataKey = new EdgeDataKey('ProblemEdgeDataKey')

let executor = null

/**
 * Applies the layout in a web worker task.
 */
export async function runLayout(worker, graphComponent, layoutStyle = 'organic') {
  let layoutData
  switch (layoutStyle) {
    case 'organic':
      layoutData = createOrganicLayoutData()
      break
    case 'neighborhood':
      layoutData = createRadialLayoutData()
      break
    case 'teams':
      layoutData = createTeamsOrganicLayoutData()
      break
  }

  const layoutDescriptor =
    layoutStyle === 'organic'
      ? createOrganicLayoutDescriptor()
      : layoutStyle === 'neighborhood'
        ? createNeighborhoodLayoutDescriptor()
        : { name: 'UserDefined', properties: {} }

  executor = new LayoutExecutorAsync({
    messageHandler: LayoutExecutorAsync.createWebWorkerMessageHandler(worker),
    graphComponent,
    layoutDescriptor,
    layoutData,
    animationDuration: '0.1s',
    animateViewport: true,
    easedAnimation: true
  })

  // run the Web Worker layout
  await executor.start()
  executor = null
}

/**
 * Creates the object that describes the 'Organic' layout configuration to the Web Worker layout executor.
 * @returns The LayoutDescriptor for this layout
 */
function createOrganicLayoutDescriptor() {
  return {
    name: 'OrganicLayout',
    properties: {
      nodeLabelPlacement: 'consider',
      edgeLabelPlacement: 'integrated',
      defaultPreferredEdgeLength: 40,
      compactnessFactor: 1,
      qualityTimeRatio: 0.4,
      deterministic: true,
      avoidNodeEdgeOverlap: true,
      clusteringPolicy: 'louvain-modularity'
    }
  }
}

/**
 * Creates the object that describes the 'Neighborhood' layout configuration to the Web Worker layout executor.
 * @returns The LayoutDescriptor for this layout
 */
function createNeighborhoodLayoutDescriptor() {
  return {
    name: 'RadialLayout',
    properties: {
      nodeLabelPlacement: 'ray-like',
      edgeLabelPlacement: 'generic',
      maximumChildSectorAngle: 360
    }
  }
}

/**
 * Creates the layout data that is used to execute the radial layout.
 */
function createRadialLayoutData() {
  const genericLayoutData = new GenericLayoutData()
  // Mark the labels that have to be removed from the layout.
  // Icon labels should be hidden so that they are ignored by the layout algorithm.
  genericLayoutData.addItemCollection(LabelRemovalStage.LABEL_REMOVAL_DATA_KEY).predicate = (
    label
  ) => getLabelTag(label).type !== 'text'

  const genericLabelingData = new GenericLabelingData({
    edgeLabelPreferredPlacements: new EdgeLabelPreferredPlacement({
      edgeSide: 'on-edge',
      placementAlongEdge: 'at-center'
    })
  })
  return genericLabelingData.combineWith(
    genericLayoutData.combineWith(
      new RadialLayoutData({ nodeTypes: (item) => getNodeTag(item).clusterId })
    )
  )
}

/**
 * Creates the layout data that is used to execute the organic layout.
 */
function createOrganicLayoutData() {
  return new OrganicLayoutData({
    nodeMargins: new Insets(20),
    edgeLabelPreferredPlacements: (label) =>
      new EdgeLabelPreferredPlacement({
        edgeSide: getEdgeTag(label.owner).problem ? 'right-of-edge' : 'on-edge',
        angleReference: 'relative-to-edge-flow',
        distanceToEdge: 30
      })
  })
}

/**
 * Creates and configures the layout data required for the 'Teams' layout.
 *
 * Cluster information and the “edge contains a problem” flag are stored in
 * GenericLayoutData so they can be serialized and transferred to the WebWorker.
 */
function createTeamsOrganicLayoutData() {
  const layoutData = new GenericLayoutData()
  // and register the information in the data using a node mapping with a given key
  layoutData.addItemMapping(clusterNodeDataKey).mapperFunction = (node) =>
    getNodeTag(node).clusterId
  layoutData.addItemMapping(problemEdgeDataKey).mapperFunction = (edge) =>
    !!getEdgeTag(edge).problem

  return layoutData
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

/**
 * Custom layout stage that organizes nodes by cluster before an organic applying layout.
 * The stage creates a group node for each cluster and then applies the
 * RecursiveGroupLayout which will arrange the content of each cluster using an organic
 * layout algorithm, while the backbone graph (grouped graph) will be arranged by a radial tree layout.
 */
export class CustomOrganicLayoutStage extends LayoutStageBase {
  /**
   * Applies custom layout combining cluster grouping with organic and radial layouts.
   *
   * @param graph - The layout graph to arrange
   */
  applyLayoutImpl(graph) {
    // Group nodes by cluster ID
    const node2cluster = new Map()
    const groupNodes = []

    const clusterIdMap = graph.context.getItemData(clusterNodeDataKey)
    graph.nodes.toArray().forEach((node) => {
      const clusterId = clusterIdMap.get(node)
      if (clusterId) {
        // Create group node if cluster doesn't exist yet
        if (!node2cluster.get(clusterId)) {
          const group = graph.createGroupNode()
          node2cluster.set(clusterId, group)
          groupNodes.push(group)
        }

        // Add node to its cluster group
        const group = node2cluster.get(clusterId)
        graph.setParent(node, group)
      }
    })

    // Configure organic layout for nodes within each group
    const organicLayout = new OrganicLayout({
      nodeLabelPlacement: 'consider',
      edgeLabelPlacement: 'integrated',
      defaultPreferredEdgeLength: 0,
      starSubstructureStyle: 'radial-nested',
      cycleSubstructureStyle: 'circular'
    })

    // Configure radial tree layout for arranging cluster groups
    const radialTreeLayout = new RadialTreeLayout({
      childAlignmentPolicy: 'compact',
      childOrderingPolicy: 'symmetric',
      nodeLabelPlacement: 'ignore',
      edgeLabelPlacement: 'ignore',
      rootSelectionPolicy: 'center-root',
      compactnessFactor: 1,
      minimumNodeDistance: 0,
      minimumEdgeLength: 0,
      allowOverlaps: true,
      preferredChildSectorAngle: 359
    })

    // Combine layouts: radial for groups, organic within groups
    const recursiveGroupLayout = new RecursiveGroupLayout(radialTreeLayout)
    const recursiveGroupLayoutData = new RecursiveGroupLayoutData({
      groupNodeLayouts: organicLayout
    })
    // Configure edge label placement
    const organicLayoutData = new OrganicLayoutData()
    const edge2ProblemMap = graph.context.getItemData(problemEdgeDataKey)
    organicLayoutData.edgeLabelPreferredPlacements = (label) =>
      new EdgeLabelPreferredPlacement({
        edgeSide: edge2ProblemMap.get(label.owner) ? 'right-of-edge' : 'on-edge',
        angleReference: 'relative-to-edge-flow',
        distanceToEdge: 10
      })

    // Apply combined layout
    graph.applyLayout(recursiveGroupLayout, recursiveGroupLayoutData.combineWith(organicLayoutData))

    // Clean up temporary group nodes
    groupNodes.forEach((groupNode) => {
      graph.remove(groupNode)
    })
  }
}
