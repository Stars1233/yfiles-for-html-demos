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
  CompositeEdgeStyle,
  CssFill,
  ExteriorNodeLabelModel,
  FreeLabelModel,
  GenericLayoutData,
  HierarchicalNestingPolicy,
  IEdge,
  ILabel,
  IModelItem,
  INode,
  LabelStyle,
  LayoutEdge,
  LayoutNode,
  Point,
  PolylineEdgeStyle,
  Rect,
  ShapeNodeShape,
  ShapeNodeStyle,
  Stroke
} from '@yfiles/yfiles'
import { BiofabricLayout } from './BiofabricLayout'
import { NodeGroupRenderer } from './NodeGroupRenderer'
import { EdgeGroupRenderer } from './EdgeGroupRenderer'
import { ViewportLockedLabelStyle } from './ViewportLockedLabelStyle'
import { isEdgeGroupRenderTag, isNodeGroupRenderTag } from './BiofabricTypes'
import { SimpleGradientDelegatingEdgeStyle } from './SimpleGradientDelegatingEdgeStyle'
import { BiofabricEdgeEndsStyle } from './BiofabricEdgeEndsStyle'
import { AbsoluteFreePortLocationModel } from './AbsoluteFreePortLocationModel'
import { wrapPointerWithMomentumAnalysis } from '../pointer-debounce'

const setsEqual = (a, b) => {
  if (a.size !== b.size) return false
  for (const item of a) {
    if (!b.has(item)) return false
  }
  return true
}

/**
 * The biofabric class responsible for i) calling the biofabric layout, ii) styling nodes, edges,
 * and edge/node groups, as well as iii) managing user interaction.
 */
export class Biofabric {
  graphComponent
  nodeIDKey
  edgeIDKey

  nodeWidthMode = 'Full'
  formStaircases = true
  highlightedItems = []
  nodeGroups = {}
  edgeGroups = {}

  nodeOrderingKey = 'Degree'
  edgeOrderingKey = 'EdgeLength'
  nodeGroupOrderingKey = 'CardinalityDescending'
  edgeGroupOrderingKey = 'CardinalityDescending'
  biofabricLayout
  biofabricWidth = 2500
  biofabricHeight = 500
  horizontalPadding = 50
  nodeGroupSpacing = 2
  nodeSpacing = 0.1
  _edgeSpacing = 0.3
  edgeGroupSpacing = 4
  highlightItemCallback
  clearItemCallback
  edgeColorMode = 'None'
  edgeColors = [
    '#8dd3c7',
    '#fdb462',
    '#80b1d3',
    '#fb8072',
    '#bebada',
    '#b3de69',
    '#fccde5',
    '#d9d9d9',
    '#bc80bd',
    '#ffffb3'
  ]
  cssVarPrefix = 'yfiles-biofabric'
  nodeGroupDataKey
  edgeGroupDataKey
  edgeColorMap = new Map()
  nodeGroupRenderers = new Map()
  edgeGroupRenderers = new Map()
  nodeGroupVisuals = new Map()
  edgeGroupVisuals = new Map()
  layoutData = new GenericLayoutData()
  unitHeight = 10
  unitWidth = 10
  edgeLabelHeight = this.unitWidth
  sortedEdgesPerNode = new Map()
  fromTargetDimensions

  /**
   * Creates a new Biofabric manager instance.
   * @param graphComponent the graph component in which to create the biofabric visualization
   * @param nodeIDKey the key (in the node's tag) that denotes its ID (for lexicographical ordering)
   * @param edgeIDKey the key (in the edge's tag) that denotes its ID (for lexicographical ordering)
   * @param options Configuration for grouping and visual appearance of nodes and edges
   */
  constructor(graphComponent, nodeIDKey, edgeIDKey, options) {
    this.graphComponent = graphComponent
    this.nodeIDKey = nodeIDKey
    this.edgeIDKey = edgeIDKey
    Object.assign(this, options)
    this.graphComponent.graphModelManager.portLayerPolicy = 'separate-layer'
    this.setPortLocationModel()

    // Initialize the Biofabric
    this.updateBiofabric()
    // this.updateLayoutProperties(true)
    this.configureInteraction()
    this.fromTargetDimensions =
      options.biofabricHeight !== undefined && options.biofabricWidth !== undefined
    this.determineUnitHeightAndWidth(this.fromTargetDimensions)
    this.setStyles()
    // Create a new Biofabric Layout
    this.biofabricLayout = new BiofabricLayout({
      nodeComparator: createNodeOrdering(this.nodeOrderingKey, this),
      edgeComparator: createEdgeOrdering(this.edgeOrderingKey, this),
      nodeGroupComparator: createNodeGroupOrdering(this.nodeGroupOrderingKey, this),
      edgeGroupComparator: createEdgeGroupOrdering(this.edgeGroupOrderingKey, this),
      nodeSpacings: { Node: this.nodeSpacing, NodeGroup: this.nodeGroupSpacing },
      edgeSpacings: { Edge: this._edgeSpacing, EdgeGroup: this.edgeGroupSpacing },
      layoutWidth: this.biofabricWidth,
      layoutHeight: this.biofabricHeight,
      unitHeight: this.unitHeight,
      unitWidth: this.unitWidth,
      nodeWidthMode: this.nodeWidthMode,
      formStaircases: this.formStaircases,
      paddings: { XPadding: this.horizontalPadding },
      edgeLabelHeight: this.edgeLabelHeight
    })
    this.updateLayoutProperties()
  }

  setPortLocationModel() {
    const absoluteFreePortLocationModel = new AbsoluteFreePortLocationModel()
    this.graphComponent.graph.nodes.forEach((node) => {
      node.ports.forEach((port) => {
        this.graphComponent.graph.setPortLocationParameter(
          port,
          absoluteFreePortLocationModel.createParameter(node, port.location.toPoint())
        )
      })
    })
  }

  /**
   * Set the Biofabric (Layout)'s edge spacing parameter to a new value
   * @param edgeSpacing a number strictly larger than 0 and smaller than one which describes the
   * space taken up by a single edge relative to the calculated unit width.
   */
  set edgeSpacing(edgeSpacing) {
    this._edgeSpacing = edgeSpacing
  }

  /**
   * Get the Biofabric (Layout)'s edge spacing parameter.
   * @returns the biofabric (layout)'s edge spacing parameter, i.e. a parameter between 0 (strictly
   * larger) and 1.
   */
  get edgeSpacing() {
    return this._edgeSpacing
  }

  /**
   * Updates a biofabric's fields as a function of the given nodes, edges, and edge/node groups,
   * in order to consequently specify the data needed for the layout and rendering.
   */
  updateBiofabric() {
    // Create the Node Group -> Node mapping
    this.setNodeGroups()

    // Create the Edge Group -> Edge mapping
    this.setEdgeGroups()

    // Set the Edge Colormap as a function of the selected mode
    this.updateEdgeColorMap()
  }

  updateLayoutProperties(resort = false) {
    // Set the various node/edge (group) comparators
    this.setLayoutProperties(resort)

    // Set the layout Data (and mapper functions)
    this.setLayoutData()
  }

  /**
   * Initialize/clear all data and visuals related to edge and node groups
   * @private
   */
  uninstallGroupVisuals() {
    // Remove all Node Group Visuals (if they exist) and clear the map
    for (const [_, nodeGroupVisual] of this.nodeGroupVisuals.entries()) {
      this.graphComponent.renderTree.remove(nodeGroupVisual)
    }
    this.nodeGroupVisuals.clear()

    // Remove all EdgeGroup Visuals (if they exist) and clear the map
    for (const [_, edgeGroupVisual] of this.edgeGroupVisuals.entries()) {
      this.graphComponent.renderTree.remove(edgeGroupVisual)
    }
    this.edgeGroupVisuals.clear()

    // Reset Node Group Renderer Object
    this.nodeGroupRenderers.clear()

    // Reset Edge Group Renderer Object
    this.edgeGroupRenderers.clear()
  }

  determineUnitHeightAndWidth(fromTargetDimensions) {
    this.sortEdges()
    this.determineUnitHeight(fromTargetDimensions)
    this.determineUnitWidth(fromTargetDimensions)
  }

  /**
   * Determine the unit height, i.e., the smallest distance between two nodes that are rendered
   * next to one-another, as a function of the number of nodes, node groups, and overall height.
   * @param fromTargetDimensions a boolean flag indicating whether the unit height is given a priori or
   * calculated based on the user-defined layout height
   * @private
   */
  determineUnitHeight(fromTargetDimensions) {
    // Determine the number of node groups
    const nNodeGroups = Object.keys(this.nodeGroups).length

    // Determine the number of uncollapsed nodes
    const unCollapsedNodes = Object.values(this.nodeGroups).reduce((nNodes, nodeGroup) => {
      if (!nodeGroup?.collapsed) {
        nNodes += nodeGroup?.nodes.length ?? 0
      }
      return nNodes
    }, 0)

    // Determine the number of uncollapsed node groups
    const nUncollapsedGroups = Object.values(this.nodeGroups).reduce(
      (nUncollapsedGroups, nodeGroup) => {
        if (!nodeGroup?.collapsed) {
          nUncollapsedGroups += 1
        }
        return nUncollapsedGroups
      },
      0
    )

    // Calculate the number of units along the x-axis
    const yUnits = unCollapsedNodes - nUncollapsedGroups + (nNodeGroups - 1) * this.nodeGroupSpacing

    // Calculate the unit height
    if (fromTargetDimensions) {
      this.unitHeight = this.biofabricHeight / yUnits
    } else {
      this.biofabricHeight = yUnits * this.unitHeight
    }
  }

  /**
   * Determines the 'unit width', i.e., the smallest distance (between edges) as a function of the
   * number edges, edge groups, node-sets, and total width.
   * @param fromTargetDimensions a boolean flag indicating whether the unit width is given a priori or
   * calculated based on the user-defined layout width
   * @private
   */
  determineUnitWidth(fromTargetDimensions) {
    // Determine the number of uncollapsed edges
    const nUncollapsedEdges = Object.values(this.edgeGroups).reduce((nEdges, edgeGroup) => {
      if (!edgeGroup?.collapsed) {
        nEdges += edgeGroup?.edges.length ?? 0
      }
      return nEdges
    }, 0)

    // Determine the number of uncollapsed edge groups
    const nUncollapsedEdgeGroups = Object.values(this.edgeGroups).reduce(
      (nUncollapsedGroups, edgeGroup) => {
        if (!edgeGroup?.collapsed) {
          nUncollapsedGroups += 1
        }
        return nUncollapsedGroups
      },
      0
    )

    // Calculate the number of units along the x-axis
    const xUnits =
      nUncollapsedEdges -
      nUncollapsedEdgeGroups +
      (Object.keys(this.edgeGroups).length - 1) * this.edgeGroupSpacing

    const labelUnits =
      this.graphComponent.graph.edges.size -
      Object.keys(this.edgeGroups).length +
      (Object.keys(this.edgeGroups).length - 1) * this.edgeGroupSpacing

    // Calculate the drawing's unit width
    if (fromTargetDimensions) {
      this.unitWidth = (this.biofabricWidth - 2 * this.horizontalPadding) / xUnits
      this.edgeLabelHeight = (this.biofabricWidth - 2 * this.horizontalPadding) / labelUnits
    } else {
      this.biofabricWidth = xUnits * this.unitWidth + 2 * this.horizontalPadding
    }
  }

  /**
   * Determine the edges' overall order across edge groups and node-sets
   * @private
   */
  sortEdges() {
    // Keep track of those edges that have already been assigned to a node
    const assignedEdges = new Set()

    // Iterate over the globally sorted nodes and initialize an empty edge list
    this.graphComponent.graph.nodes
      .toSorted(createNodeOrdering(this.nodeOrderingKey, this))
      .forEach((node) => {
        const edgesToDraw = new Array()

        // Assign all not-yet assigned edges to the current node
        this.graphComponent.graph.edgesAt(node).forEach((edge) => {
          if (!assignedEdges.has(edge)) {
            edgesToDraw.push(edge)
            assignedEdges.add(edge)
          }
        })

        // Update the sorted edges per node
        this.sortedEdgesPerNode.set(
          node,
          edgesToDraw.toSorted(createEdgeOrdering(this.edgeOrderingKey, this))
        )
      })
  }

  sortNodes() {
    // (Re-)initialize the sorted nodes array
    let sortedNodes = []

    // Iterate over each node group to append its sorted node subset
    for (const [_, nodeGroup] of Object.entries(this.nodeGroups)) {
      sortedNodes = sortedNodes.concat(
        nodeGroup.nodes.toSorted(createNodeOrdering(this.nodeOrderingKey, this))
      )
    }
    return sortedNodes
  }

  /**
   * Add data and (color-coded) visuals related to node and edge groups, if these were indeed
   * enabled by the user. Store the created Node/EdgeGroupRenderers in the node/edgeGroupRenderers
   * objects, as well as the created IRenderTreeElements in the node/edgeGroupVisuals objects, respectively.
   * @private
   */
  addGroupVisuals() {
    // (Re-)initialize the group visuals, i.e., their data and visuals
    this.uninstallGroupVisuals()

    this.addNodeGroupVisuals()

    this.addEdgeGroupVisuals()
  }

  addEdgeGroupVisuals() {
    if (
      Object.keys(this.edgeGroups).length === 0 ||
      (Object.keys(this.edgeGroups).length === 1 && Object.keys(this.edgeGroups)[0] === 'Ungrouped')
    ) {
      return
    }
    // Calculate Coordinates of Edge Groups based on visualized Edge (Labels)
    const edgeLabelOffsets = this.graphComponent.graph.edges
      .flatMap((edge) => edge.labels)
      .map((label) => label.layout.bounds.topRight.y)
    const edgeGroupOffset = edgeLabelOffsets.size > 0 ? Math.min(...edgeLabelOffsets) : 0

    // Add Edge Group Visuals, i.e, one EdgeGroupRender per unique edge group
    Object.entries(this.edgeGroups).forEach(([groupName, edgeGroup]) => {
      // Define the Color of the Edge Group Renderer
      const color =
        this.edgeColorMode === 'EdgeGroups' ? this.edgeColorMap.get(groupName) : undefined

      // Create and Save the Edge Group Renderer
      const edgeGroupRenderer = new EdgeGroupRenderer(
        edgeGroupOffset !== 0 ? edgeGroupOffset * 1.25 : -2 * this.unitHeight,
        Math.min(0.3 * this.unitHeight, Math.min(0.3 * this.unitHeight, 20)),
        color
      )
      this.edgeGroupRenderers.set(groupName, edgeGroupRenderer)

      // Create and Save IRenderTreeElement corresponding to the Edge Group Visual
      const edgeGroupVisual = this.graphComponent.renderTree.createElement(
        this.graphComponent.renderTree.contentGroup,
        { groupName: groupName, edgeGroup: edgeGroup },
        edgeGroupRenderer
      )
      this.edgeGroupVisuals.set(groupName, edgeGroupVisual)
    })
  }

  addNodeGroupVisuals() {
    if (
      Object.keys(this.nodeGroups).length === 0 ||
      (Object.keys(this.nodeGroups).length === 1 && Object.keys(this.nodeGroups)[0] === 'Ungrouped')
    ) {
      return
    }
    // Calculate Coordinates of Node Groups based on visualized node (labels)
    const nodeLabelOffsets = this.graphComponent.graph.nodes
      .flatMap((node) => node.labels)
      .map((label) => label.layout.anchorX)
    const nodeGroupOffset = nodeLabelOffsets.size > 0 ? Math.min(...nodeLabelOffsets) : 0

    // Add Node Group Visuals, i.e., one NodeGroupRenderer per unique node group
    Object.entries(this.nodeGroups).forEach(([groupName, nodeGroup]) => {
      // Define the Color of the Node Group Renderer
      const color =
        this.edgeColorMode === 'NodeGroups' || this.edgeColorMode === 'NodeGroupsInverted'
          ? this.edgeColorMap.get(groupName)
          : undefined

      // Create and Save the Node Group Renderer
      const nodeGroupRenderer = new NodeGroupRenderer(
        nodeGroupOffset - 50,
        Math.min(0.3 * this.unitHeight, Math.min(0.3 * this.unitHeight, 20)),
        color
      )
      this.nodeGroupRenderers.set(groupName, nodeGroupRenderer)

      // Create and Save IRenderTreeElement corresponding to the Node Group Visual
      const nodeGroupVisual = this.graphComponent.renderTree.createElement(
        this.graphComponent.renderTree.contentGroup,
        { groupName: groupName, nodeGroup: nodeGroup },
        nodeGroupRenderer
      )
      this.nodeGroupVisuals.set(groupName, nodeGroupVisual)
    })
  }

  /**
   * If the NodeGroupDataKey is indeed specified, create the NodeGroup map object, which, for each
   * node group, specifies i) the nodes within it, ii) its ID, iii) its collapsed state, and iv) its
   * highlighted state.
   * @private
   */
  setNodeGroups() {
    // (Re-)initialize the node group map object
    this.nodeGroups = {}

    const nodeOrdering = createNodeOrdering(this.nodeOrderingKey, this)

    // Ensure the user specified a NodeGroupDataKey
    if (this.nodeGroupDataKey) {
      // Collect all nodes that belong each node group
      const groupedNodes = this.graphComponent.graph.nodes.groupBy(
        (node) => this.getNodeGroupName(node) ?? 'Ungrouped'
      )
      // For each identified group of nodes, create a new entry in the node group mapper
      groupedNodes.forEach(([group, nodes]) => {
        this.nodeGroups[group] = {
          nodes: nodes.toArray().toSorted(nodeOrdering), // the node group's collected set of nodes
          id: group.toString(), // the string denoting a node group's ID
          collapsed: false, // by default, a node group is not collapsed
          highlighted: false // by default, a node group is not highlighted
        }
      })
      const nodeGroupOrdering = createNodeGroupOrdering(this.nodeGroupOrderingKey, this)
      this.nodeGroups = Object.fromEntries(
        Object.entries(this.nodeGroups).sort((nodeGroupA, nodeGroupB) => {
          return nodeGroupOrdering(nodeGroupA[0], nodeGroupB[0])
        })
      )
    } else {
      this.nodeGroups['Ungrouped'] = {
        nodes: this.graphComponent.graph.nodes.toArray().toSorted(nodeOrdering),
        id: 'Ungrouped',
        collapsed: false,
        highlighted: false
      }
    }
  }

  /**
   * If the EdgeGroupDataKey is indeed specified, create the EdgeGroup map object, which, for each
   * edge group, specifies i) the edges within it, ii) its ID, iii) its collapsed state, and iv) its
   * highlighted state.
   * @private
   */
  setEdgeGroups() {
    // (Re-)initialize the edge group map object
    this.edgeGroups = {}

    // Ensure the user specified a EdgeGroupDataKey
    const edgeOrdering = createEdgeOrdering(this.edgeOrderingKey, this)
    const edgeGroupOrdering = createEdgeGroupOrdering(this.edgeGroupOrderingKey, this)
    if (this.edgeGroupDataKey) {
      // Collect all edges that belong each edge group
      const edgeGroups = this.graphComponent.graph.edges.groupBy(
        (edge) => this.getEdgeGroupName(edge) ?? 'Ungrouped'
      )
      // For each identified group of edges, create a new entry in the edge group mapper
      edgeGroups.forEach(([group, edges]) => {
        this.edgeGroups[group] = {
          edges: edges.toArray().toSorted(edgeOrdering), // the edge group's collected set of edges
          id: group.toString(), // the string denoting a edge group's ID
          collapsed: false, // by default, a edge group is not collapsed
          highlighted: false // by default, a edge group is not highlighted
        }
      })
      this.edgeGroups = Object.fromEntries(
        Object.entries(this.edgeGroups).sort((edgeGroupA, edgeGroupB) => {
          return edgeGroupOrdering(edgeGroupA[0], edgeGroupB[0])
        })
      )
    } else {
      this.edgeGroups['Ungrouped'] = {
        edges: this.graphComponent.graph.edges.toArray().toSorted(edgeOrdering),
        id: 'Ungrouped',
        collapsed: false,
        highlighted: false
      }
    }
  }

  /**
   * Specify the edge color map, based on either node or edge groups.
   * @private
   */
  updateEdgeColorMap() {
    // (Re-)initialize the edge color map
    this.edgeColorMap.clear()

    // Ensure Edge Groups indeed exist and the edge color mode is set to "EdgeGroups"
    if (this.edgeColorMode === 'EdgeGroups' && this.edgeGroupDataKey) {
      // Create a new Edge Color Map
      const edgeGroupOrdering = createEdgeGroupOrdering(this.edgeGroupOrderingKey, this)
      this.edgeColorMap = new Map(
        // Iterate over all edge groups specified by user and data
        Object.keys(this.edgeGroups)
          // Sort existing edge groups based on the specified edge group ordering
          .toSorted(edgeGroupOrdering)
          // Map a sorted edge group to the correspondingly indexed color
          .map((sortedGroup, i) => {
            return [sortedGroup, this.edgeColors[i % this.edgeColors.length]]
          })
      )
    }

    // Ensure Node Groups indeed exist and the edge color mode is set to (a form of) "NodeGroups"
    if (
      (this.edgeColorMode === 'NodeGroups' || this.edgeColorMode === 'NodeGroupsInverted') &&
      this.nodeGroupDataKey
    ) {
      // Create a new edge color map
      const nodeGroupOrdering = createNodeGroupOrdering(this.nodeGroupOrderingKey, this)
      this.edgeColorMap = new Map(
        // Iterate over all node groups specified by user and data
        Object.keys(this.nodeGroups)
          // Sort existing node groups based on the specified node group ordering
          .toSorted(nodeGroupOrdering)
          // Map a sorted node group to the correspondingly indexed color
          .map((sortedGroup, i) => {
            return [sortedGroup, this.edgeColors[i % this.edgeColors.length]]
          })
      )
    }
  }

  /**
   * Create the mapping of nodes and edges to their respective node and edge groups
   * @private
   */
  setLayoutData() {
    // Create a mapping of edge to its edge group
    this.layoutData.addItemMapping(BiofabricLayout.EDGE_GROUP_DATA_KEY).mapperFunction = (edge) => {
      const edgeGroupName = this.getEdgeGroupName(edge)
      if (edgeGroupName) {
        // Create a new  map from edge to edge group and its collapsed state
        return [edgeGroupName, this.getEdgeGroupData(edge).collapsed]
      } else {
        // If no data key was specified or exists, map the edge an 'Ungrouped' edge group
        return ['Ungrouped', false]
      }
    }

    // Create a mapping of node to its node group
    this.layoutData.addItemMapping(BiofabricLayout.NODE_GROUP_DATA_KEY).mapperFunction = (node) => {
      const nodeGroupName = this.getNodeGroupName(node)
      if (nodeGroupName) {
        return [
          // Create a new  map from node to node group and its collapsed state
          nodeGroupName,
          this.getNodeGroupData(node).collapsed
        ]
      } else {
        // If no data key was specified or exists, map the node an 'Ungrouped' node group
        return ['Ungrouped', false]
      }
    }
  }

  /**
   * Layout and visualize the nodes, edges, and node/edge groups as a biofabric
   */
  async runLayout(animationDuration) {
    // (Re-)initialize Edge Labels (necessary for custom edge label styling to work)
    this.graphComponent.graph.edgeLabels.forEach((edgeLabel) => {
      if (!(edgeLabel.layoutParameter.model instanceof FreeLabelModel)) {
        this.graphComponent.graph.setLabelLayoutParameter(
          edgeLabel,
          FreeLabelModel.INSTANCE.createAnchored(new Point(0, 0), 0)
        )
      }
    })

    let returnPromise
    if (!animationDuration) {
      // Apply Biofabric layout using the created layout data
      this.graphComponent.graph.applyLayout(this.biofabricLayout, this.layoutData)
      returnPromise = Promise.resolve()
    } else {
      returnPromise = this.graphComponent.applyLayoutAnimated({
        layout: this.biofabricLayout,
        animationDuration: animationDuration,
        layoutData: this.layoutData,
        animateViewport: false
      })
    }

    // Set Styles of nodes, edges, and their labels
    this.setStyles()

    // Add Node and Edge Group Visual Elements (if these were specified)
    this.addGroupVisuals()

    // Return the promise for the layout operation
    return returnPromise
  }

  /**
   * Update the biofabric visualization without re-running the layout stage.
   */
  updateVisualization() {
    // Update the edge color map as a function of the (possibly new) edge color mode
    this.updateEdgeColorMap()

    // Update the styles of nodes, edges, and labels
    this.setStyles()

    // Add new group visuals as a function of the (possibly new) edge/node group settings
    this.addGroupVisuals()

    // Update/Style the node and edge group visuals' colors
    this.updateGroupVisualColors()
  }

  /**
   * Update the colors of the created node/edge group visuals depending on the user-specified
   * edge color mode, provided node/edge data keys, and provided color palette
   * @private
   */
  updateGroupVisualColors() {
    // Ensure the edge color mode is some form of 'NodeGroups' and that a node group data key exists
    if (
      (this.edgeColorMode === 'NodeGroups' || this.edgeColorMode === 'NodeGroupsInverted') &&
      this.nodeGroupDataKey
    ) {
      // Set all node group renderer object's colors as a function of the edge color map
      for (const [groupName, nodeGroupRenderer] of this.nodeGroupRenderers.entries()) {
        nodeGroupRenderer.color = this.edgeColorMap.get(groupName)
      }
      // (Re-)initialize the colors of all edge group renderers
      for (const [_, edgeGroupRenderer] of this.edgeGroupRenderers.entries()) {
        edgeGroupRenderer.color = undefined
      }
      // Ensure the edge color mode is set to 'EdgeGroups' and that a edge group data key exists
    } else if (this.edgeColorMode === 'EdgeGroups' && this.edgeGroupDataKey) {
      // Set all edge group renderer object's colors as a function of the edge color map
      for (const [groupName, edgeGroupRenderer] of this.edgeGroupRenderers.entries()) {
        edgeGroupRenderer.color = this.edgeColorMap.get(groupName)
      }
      // (Re-)initialize the colors of all node group renderers
      for (const [_, nodeGroupRenderer] of this.nodeGroupRenderers.entries()) {
        nodeGroupRenderer.color = undefined
      }
      // the edge color mode was set to 'None' or no edge/node group data keys were specified
    } else {
      // (Re-)initialize the colors of all node group renderers
      for (const [_, nodeGroupRenderer] of this.nodeGroupRenderers.entries()) {
        nodeGroupRenderer.color = undefined
      }
      // (Re-)initialize the colors of all edge group renderers
      for (const [_, edgeGroupRenderer] of this.edgeGroupRenderers.entries()) {
        edgeGroupRenderer.color = undefined
      }
    }
  }

  /**
   * Highlight a selected (incident/adjacent) node, edge, or label and (if enabled) execute the
   * highlight callback function
   * @param item the item (of type INode, IEdge, or ILabel) to be highlighted in the visualization
   * @param adjacent a boolean indicating whether the item in question is a main item or adjacent/incident to one
   * @param muteCallback a boolean indicating whether to mute the provided highlight callback function
   */
  addHighlight(item, adjacent = false, muteCallback = false) {
    // Extract the to-be-highlighted item's style
    const itemStyle = item.style

    if (itemStyle instanceof CompositeEdgeStyle) {
      itemStyle.styles.forEach((style) => {
        this.addSingleHighlight(style, adjacent, item, muteCallback)
      })
    } else {
      this.addSingleHighlight(itemStyle, adjacent, item, muteCallback)
    }
  }

  addSingleHighlight(itemStyle, adjacent, item, muteCallback) {
    // Ensure the item's style indeed has some CSS class and that it is not already highlighted
    if (
      'cssClass' in itemStyle &&
      typeof itemStyle.cssClass === 'string' &&
      !itemStyle.cssClass.includes('highlight')
    ) {
      // Set the CSS class of the item to highlighte(-adjacent) depending on the 'adjacent' input
      itemStyle.cssClass += adjacent ? ' highlight-adjacency' : ' highlight'

      // Add the provided item to the list of highlighted items
      this.highlightedItems.push(item)
      const renderTreeElement = this.graphComponent.graphModelManager.getRenderTreeElement(item)
      if (!renderTreeElement) {
        // should not happen
        return
      }
      this.graphComponent.renderTree.setParent(
        renderTreeElement,
        this.graphComponent.renderTree.highlightGroup
      )
      // Execute the highlight callback (if not muted)
      if (!muteCallback && this.highlightItemCallback) {
        this.highlightItemCallback(item, adjacent)
      }
    }
  }

  /**
   * Clear the stored list of highlighted items
   * @param muteCallback A boolean indicating whether to mute the provided clear callback
   */
  clearHighlights(muteCallback = false) {
    // Iterate over all highlighted items
    this.highlightedItems.forEach((item) => {
      // Extract the highlighted item's style
      const itemStyle = item.style
      if (itemStyle instanceof CompositeEdgeStyle) {
        itemStyle.styles.forEach((style) => {
          this.clearSingleHighlight(style, item)
        })
      } else {
        this.clearSingleHighlight(itemStyle, item)
      }
    })

    // (Re-)initialize the list of highlighted items
    this.highlightedItems = []

    // If enabled, execute the (provided) clear item callback function
    if (!muteCallback && this.clearItemCallback) {
      this.clearItemCallback()
    }

    // Clear the highlight status from all node groups
    Object.values(this.nodeGroups).forEach((item) => {
      if (item) item.highlighted = false
    })

    // Clear the highlight status from all edge groups
    Object.values(this.edgeGroups).forEach((item) => {
      if (item) item.highlighted = false
    })

    // Re-render the graph component's content
    this.graphComponent.invalidate()
  }

  clearSingleHighlight(itemStyle, item) {
    // Ensure the item has a CSS class
    if ('cssClass' in itemStyle && typeof itemStyle.cssClass === 'string') {
      // Remove all instances of 'highlight(-adjacent)' from the item's CSS clss
      itemStyle.cssClass = itemStyle.cssClass
        .replaceAll(/\s*highlight-adjacency/g, '')
        .replaceAll(/\s*highlight/g, '')
      const renderTreeElement = this.graphComponent.graphModelManager.getRenderTreeElement(item)
      if (!renderTreeElement) {
        // should not happen
        return
      }

      let targetGroup
      if (item instanceof INode) {
        targetGroup = this.graphComponent.graphModelManager.nodeGroup
      } else if (item instanceof ILabel) {
        const owner = item.owner
        if (owner instanceof INode) {
          targetGroup = this.graphComponent.graphModelManager.nodeLabelGroup
        } else {
          targetGroup = this.graphComponent.graphModelManager.edgeLabelGroup
        }
      } else if (item instanceof IEdge) {
        targetGroup = this.graphComponent.graphModelManager.edgeGroup
      } else {
        targetGroup = this.graphComponent.renderTree.contentGroup
      }

      this.graphComponent.renderTree.setParent(renderTreeElement, targetGroup)
    }
  }

  /**
   * (Un-)collapse an edge group that has been clicked
   * @param edgeGroup the edge group that was clicked
   * @private
   */
  async clickEdgeGroup(edgeGroup) {
    if (this.edgeGroupRenderers.size <= 1) {
      return
    }

    // Extract and update the edge group's collapsed state
    const collapsed = !edgeGroup.collapsed
    edgeGroup.collapsed = collapsed

    // Iterate over all edges in the edge group
    edgeGroup.edges
      // extract an edge's labels
      .flatMap((edge) => [...edge.labels])
      // Add/remove 'collapsed' to the label's CSS class
      .forEach((label) => {
        label.style.cssClass = collapsed ? 'node-edge-label collapsed' : 'node-edge-label'
      })
    this.determineUnitHeightAndWidth(this.fromTargetDimensions)
    this.updateLayoutProperties()
    // Re-layout the biofabric with a now (un)collapsed edge group
    await this.graphComponent.applyLayoutAnimated({
      layout: this.biofabricLayout,
      animationDuration: '1s',
      layoutData: this.layoutData,
      animateViewport: false
    })
  }

  /**
   * (Un-)collapse a node group that has been clicked
   * @param nodeGroup the node group that was clicked
   * @private
   */
  async clickNodeGroup(nodeGroup) {
    if (this.nodeGroupRenderers.size <= 1) {
      return
    }
    // Extract and update the node group's collapsed state
    const collapsed = !nodeGroup.collapsed
    nodeGroup.collapsed = collapsed

    // Iterate over all nodes in the node group
    nodeGroup.nodes
      // Extract a node's labels
      .flatMap((node) => [...node.labels])
      // Add/remove 'collapsed' to the label's CSS class
      .forEach((label) => {
        label.style.cssClass = collapsed ? 'node-edge-label collapsed' : 'node-edge-label'
      })
    this.determineUnitHeightAndWidth(this.fromTargetDimensions)
    this.updateLayoutProperties()
    // Re-layout the biofabric with a now (un)collapsed node group
    await this.graphComponent.applyLayoutAnimated({
      layout: this.biofabricLayout,
      animationDuration: '1s',
      layoutData: this.layoutData,
      animateViewport: false
    })
  }

  getHighlightZIndex(obj) {
    if (obj instanceof INode) return 1
    if (obj instanceof IEdge) return 2
    if (obj instanceof ILabel) return 3
    return 4
  }

  /**
   * Add event listeners (mouse move and click) that provide the biofabric's interactivity
   * @private
   */
  configureInteraction() {
    let previousElements = new Set()
    // Add an event listener that fires if the mouse is moved
    this.graphComponent.addEventListener(
      'pointer-move',
      wrapPointerWithMomentumAnalysis(
        (evt, sender, fastMovement) => {
          const elements = fastMovement
            ? new Set()
            : new Set(
                this.graphComponent.renderTree.hitElementsAt({
                  location: evt.location,
                  root: this.graphComponent.renderTree.rootGroup
                })
              )
          if (setsEqual(elements, previousElements)) {
            return
          }
          previousElements = elements

          // Clear the list of highlighted items
          this.clearHighlights()

          // Check if edge in elements -> prioritize edges over all other element types
          const edgeElements = [...elements].filter((i) => i.tag instanceof IEdge)

          // Check all items at the current mouse location
          for (const rte of edgeElements.length > 0 ? edgeElements : elements) {
            // If the render tree element is a node group renderer, highlight it and all its nodes
            if (isNodeGroupRenderTag(rte.tag)) {
              const group = rte.tag.groupName
              const nodes = this.nodeGroups[group]?.nodes ?? []

              // If provided, execute the highlight callback function
              if (this.highlightItemCallback) {
                this.highlightItemCallback(this.nodeGroups[group], false)
              }

              // Highlight all nodes in the current node group
              nodes.forEach((node) => {
                this.addHighlight(node)
              })

              // Highlight all node labels in the group (if the node group is uncollapsed)
              if (!rte.tag.nodeGroup.collapsed) {
                nodes.forEach((node) => {
                  node.labels.forEach((label) => this.addHighlight(label))
                })
              }

              // Highlight the moused-over node group
              this.nodeGroups[group].highlighted = true
            }

            // If the render tree element is a edge group renderer, highlight it and all its edges
            if (isEdgeGroupRenderTag(rte.tag)) {
              const group = rte.tag.groupName
              const edges = this.edgeGroups[group]?.edges ?? []

              // If provided, execute the highlight callback function
              if (this.highlightItemCallback) {
                this.highlightItemCallback(this.edgeGroups[group], false)
              }

              // Highlight all edges in the current edge group
              edges.forEach((edge) => {
                this.addHighlight(edge)
              })

              // Highlight all edge labels in the group (if the edge group is uncollapsed)
              if (!rte.tag.edgeGroup.collapsed) {
                edges.forEach((edge) => {
                  edge.labels.forEach((label) => this.addHighlight(label))
                })
              }

              // Highlight the moused-over edge group
              this.edgeGroups[group].highlighted = true
            }

            // Check whether the render tree element is a node or edge
            if (rte.tag instanceof IModelItem) {
              // Ensure that all highlighted model items area of the same type
              let item = rte.tag
              if (item instanceof ILabel) {
                item = item.owner
              }
              if (item instanceof IEdge) {
                // If an edge, highlight the edge and its incident nodes
                this.highlightEdge(item)
                this.sortHighlights()
                return
              } else if (item instanceof INode) {
                // If a node, highlight the node, its incident edges, and adjacent nodes
                this.highlightNode(item)
                this.sortHighlights()
                return
              }
            }
          }
          this.sortHighlights()
        },
        { speedThreshold: 1000 }
      )
    )

    // Add an event listener that fires if the mouse is clicked
    this.graphComponent.addEventListener('pointer-click', async (evt) => {
      // Extract the render tree elements at the position of the mouse when clicked
      const rts = this.graphComponent.renderTree.hitElementsAt(evt.location).toArray()

      // Iterate over all render tree elements clicked
      for (const rte of rts) {
        // If a node group, (un-)collapse the node group
        if (isNodeGroupRenderTag(rte.tag)) {
          const nodeGroupName = rte.tag.groupName
          const nodeGroup = this.nodeGroups[nodeGroupName]
          if (nodeGroup !== undefined) {
            const nodeGroup = this.nodeGroups[nodeGroupName]
            if (nodeGroup !== undefined) {
              await this.clickNodeGroup(nodeGroup)
            }
          }
          // If an edge group, (un-)collapse the edge group
        } else if (isEdgeGroupRenderTag(rte.tag)) {
          const edgeGroupName = rte.tag.groupName
          const edgeGroup = this.edgeGroups[edgeGroupName]
          if (edgeGroup !== undefined) {
            const edgeGroup = this.edgeGroups[edgeGroupName]
            if (edgeGroup !== undefined) {
              await this.clickEdgeGroup(edgeGroup)
            }
          }
        }
      }
    })
  }

  sortHighlights() {
    //sort highlighted items nodes -> edges -> labels
    this.highlightedItems.sort((a, b) => this.getHighlightZIndex(a) - this.getHighlightZIndex(b))
    this.highlightedItems.forEach((item) => {
      this.graphComponent.graphModelManager.getRenderTreeElement(item)?.toFront()
    })
  }

  /**
   * Returns the node group name given node.
   * @param node The node to get the group data for.
   * @private
   */
  getNodeGroupName(node) {
    const nodeTag = node.tag
    if (this.nodeGroupDataKey && nodeTag[this.nodeGroupDataKey] !== undefined) {
      return String(nodeTag[this.nodeGroupDataKey])
    }
    return undefined
  }

  /**
   * Returns the node group data for the given node.
   * @param node The node to get the group data for.
   * @private
   */
  getNodeGroupData(node) {
    const name = this.getNodeGroupName(node)
    if (name) {
      return this.nodeGroups[name]
    }
    return undefined
  }

  /**
   * Returns the edge group name for the given edge.
   * @param edge The edge to get the group data for.
   * @private
   */
  getEdgeGroupName(edge) {
    const edgeTag = edge.tag
    if (this.edgeGroupDataKey && edgeTag[this.edgeGroupDataKey] !== undefined) {
      return String(edgeTag[this.edgeGroupDataKey])
    }
    return 'Ungrouped'
  }

  /**
   * Returns the edge group data for the given edge.
   * @param edge The edge to get the group data for.
   * @private
   */
  getEdgeGroupData(edge) {
    const name = this.getEdgeGroupName(edge)
    if (name) {
      return this.edgeGroups[name]
    }
    return undefined
  }

  /**
   * Highlight a specified edge as well as its incident nodes (and possibly their labels)
   * @param edge the edge to be highlighted
   * @private
   */
  highlightEdge(edge) {
    // Extract a collapsed edge group (if it exists), otherwise fill a new group with just the one edge
    const edgeGroup =
      Object.keys(this.edgeGroups).length > 0 && this.getEdgeGroupData(edge)?.collapsed
        ? this.getEdgeGroupData(edge)
        : { edges: [edge], collapsed: false }

    // Iterate over all edges in the (created and singleton) edge group
    edgeGroup?.edges.forEach((edge, _) => {
      // Highlight the specified edge
      this.addHighlight(edge)

      // Highlight edge labes (if they exist)
      if (edge.labels.size > 0) {
        this.addHighlight(edge.labels.get(0))
      }

      // Highlight all nodes in source node group if collapsed
      const sourceGroup =
        Object.keys(this.nodeGroups).length > 0 && this.getNodeGroupData(edge.sourceNode)?.collapsed
          ? this.getNodeGroupData(edge.sourceNode)
          : { nodes: [edge.sourceNode], collapsed: false }
      sourceGroup?.nodes.forEach((node) => {
        this.addHighlight(node)
      })

      // Highlight all incident source nodes' labels (if the node group is not collapsed)
      if (edge.sourceNode.labels.size > 0 && sourceGroup && !sourceGroup.collapsed) {
        this.addHighlight(edge.sourceNode.labels.get(0))
      }

      // Highlight all nodes in target node group if collapsed
      const targetGroup =
        Object.keys(this.nodeGroups).length > 0 && this.getNodeGroupData(edge.targetNode)?.collapsed
          ? this.getNodeGroupData(edge.targetNode)
          : { nodes: [edge.targetNode], collapsed: false }
      targetGroup?.nodes.forEach((node) => {
        this.addHighlight(node)
      })

      // Highlight all incident target nodes' labels (if the node group is not collapsed)
      if (edge.targetNode.labels.size > 0 && targetGroup && !targetGroup.collapsed) {
        this.addHighlight(edge.targetNode.labels.get(0))
      }
    })
  }

  /**
   * Highlight a specified node, its incident edges, and all its adjacent node (and possibly their labels)
   * @param highlightedNode the node to be highlighted
   * @private
   */
  highlightNode(highlightedNode) {
    // Extract the collapsed node group (if it exists), otherwise fill a new group with just one node
    const nodeGroup = this.getNodeGroupData(highlightedNode)?.collapsed
      ? this.getNodeGroupData(highlightedNode)
      : { nodes: [highlightedNode], collapsed: false }

    // For all nodes in (created ad singleton) node group highlight all its nodes and labels
    nodeGroup?.nodes.forEach((node, _) => {
      this.addHighlight(node)
      if (node.labels.size > 0) {
        node.labels.forEach((label) => {
          this.addHighlight(label)
        })
      }

      // Iterate over all edges incident to the selected node
      const incidentEdges = this.graphComponent.graph.edgesAt(node)
      incidentEdges.forEach((edge) => {
        // Highlight the incident edge
        this.addHighlight(edge)

        // Highlight the adjacent source node and its label
        this.addHighlight(edge.sourceNode, true)
        edge.sourceNode.labels.forEach((label) => {
          this.addHighlight(label, true)
        })

        // Highlight the adjacent target node and its label
        this.addHighlight(edge.targetNode, true)
        edge.targetNode.labels.forEach((label) => {
          this.addHighlight(label, true)
        })

        // Highlight all edge labels if the incident edge's edge group is uncollapsed
        const edgeGroup =
          Object.keys(this.edgeGroups).length > 0
            ? this.getEdgeGroupData(edge)
            : { edges: [], collapsed: false }
        if (edge.labels.size > 0 && edgeGroup && !edgeGroup.collapsed) {
          this.addHighlight(edge.labels.get(0), false)
        }
      })
    })
  }

  getColorsFromEdge(edge) {
    let colorA = undefined
    let colorB = undefined

    // If the edge color mode is 'EdgeGroups' and an edge group data key was defined, set only one color
    const edgeGroupName = this.getEdgeGroupName(edge)
    if (this.edgeColorMode === 'EdgeGroups' && edgeGroupName) {
      colorA = this.edgeColorMap.get(edgeGroupName)
      // If the edge color mode is 'NodeGroups' and a node group data key was defined, set both colors
    } else if (
      (this.edgeColorMode === 'NodeGroups' || this.edgeColorMode === 'NodeGroupsInverted') &&
      this.nodeGroupDataKey
    ) {
      const sourceGroup = this.getNodeGroupName(edge.sourceNode)
      const targetGroup = this.getNodeGroupName(edge.targetNode)
      if (sourceGroup && targetGroup) {
        if (sourceGroup === targetGroup) {
          colorA = this.edgeColorMap.get(sourceGroup)
          // If the edge color mode is 'NodeGroupsInverted' and a node group data key was defined, set both colors
        } else {
          colorA =
            this.edgeColorMode === 'NodeGroupsInverted'
              ? this.edgeColorMap.get(targetGroup)
              : this.edgeColorMap.get(sourceGroup)
          colorB =
            this.edgeColorMode === 'NodeGroupsInverted'
              ? this.edgeColorMap.get(sourceGroup)
              : this.edgeColorMap.get(targetGroup)
        }
      }
    }
    return [colorA, colorB]
  }

  /**
   * Set the styles of nodes, node labels, edges, and edge labels
   */
  setStyles() {
    // Set the class list of the biofabric's graph component
    this.graphComponent.htmlElement.classList.add('biofabric-graph-component')

    // Define the default node style as a rounded rectangle of CSS class 'biofabric-node'
    const lineNodeStyle = new ShapeNodeStyle({
      cssClass: 'biofabric-node',
      shape: ShapeNodeShape.PILL,
      keepIntrinsicAspectRatio: false
    })

    // Iterate over all nodes in drawing
    this.graphComponent.graph.nodes.forEach((node) => {
      // Set the location and dimensions of each node as a function of the biofabric's unit height
      this.graphComponent.graph.setNodeLayout(
        node,
        new Rect(
          node.layout.x,
          node.layout.y,
          node.layout.width,
          this.unitHeight * this.nodeSpacing
        )
      )

      // Set the node's style to the previously defined node style
      this.graphComponent.graph.setStyle(node, lineNodeStyle.clone())

      // Iterate over all labels of the node to specify their style and label model
      node.labels.forEach((label) => {
        this.graphComponent.graph.setLabelLayoutParameter(label, ExteriorNodeLabelModel.LEFT)
        this.graphComponent.graph.setStyle(
          label,
          new ViewportLockedLabelStyle(
            new LabelStyle({
              textSize: Math.min(Math.min(this.unitHeight * 0.6, 40), this.unitHeight * 0.75),
              shape: 'pill',
              backgroundFill: '#202739',
              wrapping: 'none'
            }),
            'horizontal',
            'node-edge-label'
          )
        )
      })
    })

    // Define the edges' line thickness and end-points' radii as a function of the biofabric's unit width
    const lineThickness = this._edgeSpacing * this.unitWidth
    const markerRadius = Math.min(this._edgeSpacing * this.unitWidth, (0.9 * this.unitWidth) / 2)

    this.setEdgeLabelStyle()
    const gradientMap = new Map()
    // Iterate over all edges in the drawing
    this.graphComponent.graph.edges.forEach((edge) => {
      // Set the edge's start and end color as a function of the current color map and color model

      const [colorA, colorB] = this.getColorsFromEdge(edge)
      // Set the biofabric's edge style as a function of the identified colors, line thickness, and a radius
      // if the colorB is defined, i.e., if a gradient is to be drawn, render the line as GradientDelegatingEdgeStyle
      // otherwise, render the edge's line as just a PolyLineEdgeStyle
      if ((!colorB && !colorA) || !colorB) {
        const cssColorFill = new CssFill(`var(--${this.cssVarPrefix}-edge-color)`)
        const monoColorFill = new CssFill(colorA ?? '#ffffff')
        this.graphComponent.graph.setStyle(
          edge,
          new CompositeEdgeStyle(
            new PolylineEdgeStyle({
              stroke: new Stroke(!colorA ? cssColorFill : monoColorFill, lineThickness),
              cssClass: 'biofabric-edge'
            }),
            new BiofabricEdgeEndsStyle(
              lineThickness,
              markerRadius,
              colorA,
              colorB ?? colorA,
              this.cssVarPrefix
            )
          )
        )
      } else {
        this.graphComponent.graph.setStyle(
          edge,
          new CompositeEdgeStyle(
            new SimpleGradientDelegatingEdgeStyle(
              new PolylineEdgeStyle({
                stroke: new Stroke({ thickness: lineThickness }),
                cssClass: 'biofabric-edge'
              }),
              (edge) => this.getColorsFromEdge.bind(this)(edge),
              gradientMap
            ),
            new BiofabricEdgeEndsStyle(
              lineThickness,
              markerRadius,
              colorA,
              colorB,
              this.cssVarPrefix
            )
          )
        )
      }
    })
    // Set z-axis ordering of edge groups and node groups
    this.graphComponent.graphModelManager.hierarchicalNestingPolicy =
      HierarchicalNestingPolicy.NODES
    this.graphComponent.graphModelManager.edgeGroup.above(
      this.graphComponent.graphModelManager.nodeGroup
    )
  }

  setEdgeLabelStyle() {
    // Iterate over all edges in drawing
    this.graphComponent.graph.edges.forEach((edge) =>
      // Iterate over all edge labels to set their style
      edge.labels.forEach((label) => {
        this.graphComponent.graph.setStyle(
          label,
          new ViewportLockedLabelStyle(
            new LabelStyle({
              maximumSize: [Infinity, this.edgeLabelHeight * 0.5],
              minimumSize: [0, this.edgeLabelHeight * 0.5],
              verticalTextAlignment: 'center',
              horizontalTextAlignment: 'left',
              textSize: this.edgeLabelHeight * 0.5,
              backgroundFill: '#202739',
              wrapping: 'none',
              shape: 'pill',
              padding: 0
            }),
            'vertical',
            'node-edge-label'
          )
        )
      })
    )
  }

  /**
   * Set the various node, edge, and node/edge group comparators and the node width mode
   * @private
   */
  setLayoutProperties(resort = false) {
    // Set the node comparator
    this.biofabricLayout.nodeComparator = createNodeOrdering(this.nodeOrderingKey, this)

    // Set the edge comparator
    const edgeOrdering = resort ? this.edgeOrderingKey : 'AsIs'
    this.biofabricLayout.edgeComparator = createEdgeOrdering(edgeOrdering, this)

    // Set the edge group comparator
    this.biofabricLayout.edgeGroupComparator = createEdgeGroupOrdering(
      this.edgeGroupOrderingKey,
      this
    )

    // Set the node group comparator
    this.biofabricLayout.nodeGroupComparator = createNodeGroupOrdering(
      this.nodeGroupOrderingKey,
      this
    )

    // Set the node width mode
    this.biofabricLayout.nodeWidthMode = this.nodeWidthMode

    this.biofabricLayout.unitWidth = this.unitWidth
    this.biofabricLayout.unitHeight = this.unitHeight
    this.biofabricLayout.edgeLabelHeight = this.edgeLabelHeight
  }
}

/**
 * Specify the node ordering options, i.e., lexicographical (ascending), lexicographical
 * (descending), and DegreeDescending
 */
function createNodeOrdering(type, context) {
  switch (type) {
    default:
    case 'Degree':
      return (a, b) => getDegree(context, b) - getDegree(context, a)
    case 'LexicographicalDescending':
      return (a, b) => compareTagLexicographical(a, b, context.nodeIDKey, false)
    case 'LexicographicalAscending':
      return (a, b) => compareTagLexicographical(a, b, context.nodeIDKey, true)
  }
}

/**
 * Specify the edge ordering options, i.e., lexicographical (ascending), lexicographical
 * (descending), and edge length
 */
function createEdgeOrdering(type, context) {
  switch (type) {
    default:
    case 'EdgeLength':
      return (a, b) => {
        let edgeLengthA
        let edgeLengthB
        if (a instanceof LayoutEdge && b instanceof LayoutEdge) {
          edgeLengthA = Math.abs(a.source.layout.y - a.target.layout.y)
          edgeLengthB = Math.abs(b.source.layout.y - b.target.layout.y)
        } else if (a instanceof IEdge && b instanceof IEdge) {
          edgeLengthA = Math.abs(a.sourceNode.layout.y - a.targetNode.layout.y)
          edgeLengthB = Math.abs(b.sourceNode.layout.y - b.targetNode.layout.y)
        } else {
          throw new Error('Unsupported edge ordering')
        }
        return edgeLengthA - edgeLengthB
      }
    case 'LexicographicalDescending':
      return (a, b) => compareTagLexicographical(a, b, context.edgeIDKey, false)
    case 'LexicographicalAscending':
      return (a, b) => compareTagLexicographical(a, b, context.edgeIDKey, true)
    case 'AsIs':
      return (a, b) => {
        let positionA
        let positionB
        if (a instanceof LayoutEdge && b instanceof LayoutEdge) {
          positionA = a.source.layout.x
          positionB = b.source.layout.x
        } else if (a instanceof IEdge && b instanceof IEdge) {
          positionA = a.sourceNode.layout.x
          positionB = b.sourceNode.layout.x
        } else {
          throw new Error('Edge must be of type LayoutEdge or IEdge!')
        }
        return positionB - positionA
      }
  }
}

/**
 * Specify the node group ordering options, i.e., cardinality (descending), cardinality
 * (ascending), lexicographical (descending), and lexicographical (ascending)
 */
function createNodeGroupOrdering(type, context) {
  switch (type) {
    case 'CardinalityAscending':
      return (a, b) => compareGroupCardinality(a, b, context.nodeGroups, 'nodes', true)
    case 'CardinalityDescending':
      return (a, b) => compareGroupCardinality(a, b, context.nodeGroups, 'nodes', false)
    case 'LexicographicalDescending':
      return (a, b) => compareLexicographical(String(b), String(a))
    case 'LexicographicalAscending':
      return (a, b) => compareLexicographical(String(a), String(b))
  }
}

/**
 * Specify the edge group ordering options, i.e., cardinality (descending), cardinality
 * (ascending), lexicographical (descending), and lexicographical (ascending)
 */
function createEdgeGroupOrdering(type, context) {
  switch (type) {
    default:
    case 'CardinalityAscending':
      return (a, b) => compareGroupCardinality(a, b, context.edgeGroups, 'edges', true)
    case 'CardinalityDescending':
      return (a, b) => compareGroupCardinality(a, b, context.edgeGroups, 'edges', false)
    case 'LexicographicalDescending':
      return (a, b) => compareLexicographical(String(b), String(a))
    case 'LexicographicalAscending':
      return (a, b) => compareLexicographical(String(a), String(b))
  }
}

/**
 * Helper function with which to compare two strings lexicographically
 * @param stringA the first string to compare
 * @param stringB the second string to compare
 */
function compareLexicographical(stringA, stringB) {
  return stringA.localeCompare(stringB, undefined, { numeric: true })
}

/**
 * Helper function with which to collect the degree of a specified (INode/LayoutNode) node
 * @param fabric the biofabric element whose graph contains the node
 * @param node the LayoutNode or INode whose degree is of interest
 */
function getDegree(fabric, node) {
  return node instanceof LayoutNode ? node.degree : fabric.graphComponent.graph.edgesAt(node).size
}

/**
 * Helper function with which to compare two tag owners lexicographically
 * Helper function with which to compare two tag owners lexicographically
 * @param tagOwnerA the first tag owner (node, edge) to be compared
 * @param tagOwnerB the second tag owner (node, edge) to be compared
 * @param key the key with which to index into the correct element of the tag
 * @param asc ascending or descending boolean flag
 */
function compareTagLexicographical(tagOwnerA, tagOwnerB, key, asc) {
  if (!key) throw new Error('Ordering requires a valid ID Key!')
  const valA = tagOwnerA.tag[key]
  const valB = tagOwnerB.tag[key]
  if (!valA && !valB) return 0
  if (!valA) return asc ? -1 : 1
  if (!valB) return asc ? 1 : -1
  return asc ? compareLexicographical(valA, valB) : compareLexicographical(valB, valA)
}

/**
 * Helper function with which to compare the cardinality of two given groups
 * @param groupA the first group's ID
 * @param groupB the second group's ID
 * @param dataSource the record with which to determine the group's cardinality
 * @param collectionKey the key indexing into the collection of relevance
 * @param asc ascending or descending boolean flag
 */
function compareGroupCardinality(groupA, groupB, dataSource, collectionKey, asc) {
  // Get the data of groups A and B
  const dataA = dataSource?.[groupA]?.[collectionKey]
  const dataB = dataSource?.[groupB]?.[collectionKey]

  // Determine the number of elements (cardinality) in the data of groups A and B
  const lenA = Array.isArray(dataA) ? dataA.length : -1
  const lenB = Array.isArray(dataB) ? dataB.length : -1

  // If not equal, return the difference in cardinality
  if (lenA !== lenB) return asc ? lenA - lenB : lenB - lenA

  // Collect the two groups' IDs as strings
  const strA = groupA.toString()
  const strB = groupB.toString()

  // Return the lexicographical ordering of group IDs to break ties
  return asc ? compareLexicographical(strA, strB) : compareLexicographical(strB, strA)
}
