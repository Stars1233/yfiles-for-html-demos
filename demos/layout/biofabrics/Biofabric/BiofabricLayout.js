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
  BaseClass,
  EdgeDataKey,
  ILayoutAlgorithm,
  NodeDataKey,
  OrientedRectangle,
  Point
} from '@yfiles/yfiles'

/**
 * The BiofabricLayout object responsible for laying out a given graph as a biofabric.
 */
export class BiofabricLayout extends BaseClass(ILayoutAlgorithm) {
  // Comparators
  nodeComparator = (a, b) => {
    const degreeA = a.degree
    const degreeB = b.degree
    return degreeB - degreeA
  }
  edgeComparator = (a, b) => {
    const edgeLengthA = Math.abs(a.source.layout.y - a.target.layout.y)
    const edgeLengthB = Math.abs(b.source.layout.y - b.target.layout.y)
    return edgeLengthA - edgeLengthB
  }
  nodeGroupComparator = (a, b) => {
    const groupSizeA = this.nodeGroups.get(a)?.nodes.length ?? 0
    const groupSizeB = this.nodeGroups.get(b)?.nodes.length ?? 0
    return groupSizeB - groupSizeA
  }
  edgeGroupComparator = (a, b) => {
    const groupSizeA = this.edgeGroups.get(a)?.edges.length ?? 0
    const groupSizeB = this.edgeGroups.get(b)?.edges.length ?? 0
    return groupSizeB - groupSizeA
  }

  // Edge/Node Group sorted by corresponding comparator
  edgeGroups = new Map()
  nodeGroups = new Map()

  // Intra-Edge Group Node Sorting
  nodesInEdgeGroup = new Map()
  sortedEdgesPerNode = new Map()

  // Globally sorted nodes
  sortedNodes = []

  // Intermediate Data Structures
  edgesPerNode = new Map()
  nodeNodeMap = new Map()

  // Layout Data Mappers
  edgeGroupMapper = null
  nodeGroupMapper = null

  // Aesthetics
  nodeWidthMode = 'Full'
  formStaircases = false
  edgeSpacings
  nodeSpacings
  paddings
  layoutWidth = 2500
  unitWidth = 10
  unitHeight = 10
  edgeLabelHeight = this.unitWidth

  // The mapping of edge and node to edge group and node group respectively
  static EDGE_GROUP_DATA_KEY = new EdgeDataKey('BiofabricLayout.EDGE_GROUP_DATA_KEY')
  static NODE_GROUP_DATA_KEY = new NodeDataKey('BiofabricLayout.NODE_GROUP_DATA_KEY')

  /**
   * Initializes a new BiofabricLayout algorithm instance.
   * @param options The layout configuration including comparators for ordering
   * and spacing/padding values for the final visualization.
   */
  constructor(options) {
    // Calls the constructor of the parent class
    super()
    Object.assign(this, options)
    // Required comparators from options
    // Apply defaults for nested objects using spread to allow partial overrides
    this.edgeSpacings = { Edge: 0.5, Node: 1, EdgeGroup: 2, ...options.edgeSpacings }
    this.nodeSpacings = { Node: 0.5, NodeGroup: 2, ...options.nodeSpacings }
    this.paddings = { XPadding: 50, ...options.paddings }
  }

  /**
   * Wrapper function with which to (re-)initialize/clear all layout-specific objects
   * @private
   */
  clearLayout() {
    this.sortedNodes = []
    this.edgesPerNode = new Map()
    this.nodeNodeMap = new Map()
    this.sortedEdgesPerNode = new Map()
    this.nodesInEdgeGroup = new Map()
    this.nodeGroups = new Map()
    this.edgeGroups = new Map()
  }

  /**
   * Wrapper function that lays out the provided graph as a biofabric visualization.
   * @param graph the LayoutGraph to be visualized as a biofabric
   */
  applyLayout(graph) {
    // Clear the layout of all objects
    this.clearLayout()

    // Create and sort edge and node groups
    this.createNodeGroups(graph)
    this.createEdgeGroups(graph)

    // Sort Nodes across node groups
    this.sortNodes()

    // Layout nodes as a function of calculated unit height
    this.layoutNodes()

    // Check if Staircases are to be formed by edges
    if (this.formStaircases) {
      // Sort edges across edge groups
      this.sortEdges()

      // Assign each edge to a particular source node
      this.assignEdgesToNodes()
    }

    // Layout edges as a function of the calculated unit width
    this.layoutEdges()

    // Transfer calculated coordinates from the internal to the layout edges
    this.applyPositions()

    // Style the edge labels (as a function of calculated edge positions)
    this.layoutEdgeLabels(graph)
  }

  /**
   * Create the edge group mapper and edge group object, which stores each group's sorted edges and collapsed state.
   * @private
   * @param graph The LayoutGraph instance containing the edges and nodes to visualize.
   */
  createEdgeGroups(graph) {
    // Create Edge Group Mapper (LayoutEdge -> Group ID and its collapsed state)
    this.edgeGroupMapper = graph.context.getItemData(BiofabricLayout.EDGE_GROUP_DATA_KEY)

    // Create Initial Edge Group Object (Group ID -> Edge Group type)
    for (const edge of graph.edges) {
      // If a edge maps to no group, create a dummy 'Ungrouped' group
      const edgeGroup = this.edgeGroupMapper?.get(edge) ?? ['Ungrouped', false]
      // Create a new keyed entry for the extracted group if it does not yet exist
      if (!this.edgeGroups.has(edgeGroup[0])) {
        this.edgeGroups.set(edgeGroup[0], { edges: [], collapsed: edgeGroup[1] })
      }
      // Push the current edge into the current group edge
      this.edgeGroups.get(edgeGroup[0])?.edges.push(edge)
    }

    // (Re-)create Edge Groups Object, this time sorted
    this.edgeGroups = new Map(
      Array.from(this.edgeGroups.entries()).sort((edgeGroupA, edgeGroupB) => {
        return this.edgeGroupComparator(edgeGroupA[0], edgeGroupB[0])
      })
    )
  }

  /**
   * Create the node group mapper and node group object, which stores each group's sorted nodes and collapsed state.
   * @private
   * @param graph The LayoutGraph instance containing the edges and nodes to visualize.
   */
  createNodeGroups(graph) {
    // Create Node Group Mapper (LayoutNode -> Group ID and its collapsed state)
    this.nodeGroupMapper = graph.context.getItemData(BiofabricLayout.NODE_GROUP_DATA_KEY)

    // Create Initial Node Group Object (Group ID -> Node Group type)
    for (const node of graph.nodes) {
      // If a node maps to no group, create a dummy 'Ungrouped' group
      const nodeGroup = this.nodeGroupMapper?.get(node) ?? ['Ungrouped', false]
      // Create a new keyed entry for the extracted group if it does not yet exist
      if (!this.nodeGroups.has(nodeGroup[0])) {
        this.nodeGroups.set(nodeGroup[0], { nodes: [], collapsed: nodeGroup[1] })
      }
      // Push the current node into the current group node
      this.nodeGroups.get(nodeGroup[0])?.nodes.push(node)
    }

    // Recreate Node Groups Object, this time sorted
    this.nodeGroups = new Map(
      Array.from(this.nodeGroups.entries()).sort((nodeGroupA, nodeGroupB) => {
        return this.nodeGroupComparator(nodeGroupA[0], nodeGroupB[0])
      })
    )
  }

  /**
   * Given a particular node and edge ordering, assign each edge to a particular node, i.e., the
   * first and top-most node that an edge connects to.
   * @private
   */
  assignEdgesToNodes() {
    // Create an empty nodesInEdgeGroup Object
    for (const edgeGroupID of this.edgeGroups.keys()) {
      this.nodesInEdgeGroup.set(edgeGroupID, [])
    }

    // Iterate over globally sorted nodes
    this.sortedNodes.forEach((node) => {
      // Initialize an empty set describing all the edge groups that a node maps to
      const edgeGroupsPerNode = new Set()

      // Register the edge groups of each incident edge to the node
      this.sortedEdgesPerNode.get(node).forEach((edge) => {
        edgeGroupsPerNode.add(this.edgeGroupMapper?.get(edge)[0] ?? 'Ungrouped')
      })

      // Add the node's edge set to nodesInEdgeGroup
      edgeGroupsPerNode.forEach((group) => {
        this.nodesInEdgeGroup.get(group.toString()).push(node)
      })
    })
  }

  /**
   * Determine the x and y positions of all nodes as a function of their global ordering, the
   * calculated unit height, the collapsed states of nodes and groups, and the previous node.
   * @param origin the origin where the first node will be drawn
   * @private
   */
  layoutNodes(origin = new Point(0, 0)) {
    // Initialize the previous node
    let previousGroup
    let previousY = origin.y

    // Iterate over each node in the globally sorted nodes array
    this.sortedNodes.forEach((node, nodeIndex) => {
      // Collect the current node group and its collapsed state
      const [currentGroup, collapsed] = this.nodeGroupMapper?.get(node) ?? [undefined, false]

      /*
            Calculate the current node's y coordinate dependent on the previous node's y coordinate and
            dependent on whether the current group is collapsed and the previous group and current
            one differ
            */
      let yCoordinate = previousY
      if (nodeIndex === 0) {
        yCoordinate = previousY
      } else if (!collapsed) {
        yCoordinate +=
          currentGroup !== previousGroup
            ? this.nodeSpacings.NodeGroup * this.unitHeight
            : this.unitHeight
      } else {
        yCoordinate +=
          currentGroup !== previousGroup ? this.nodeSpacings.NodeGroup * this.unitHeight : 0
      }

      // Create a new 'node' object
      const newNode = {
        x: origin.x,
        y: yCoordinate,
        width: this.layoutWidth,
        height: this.unitHeight * this.nodeSpacings.Node,
        layoutNode: node
      }

      // Store current x and y positions in the current 'layoutNode' as well
      node.layout.x = origin.x
      node.layout.y = yCoordinate

      // Update the 'node' -> 'layoutNode' map
      this.nodeNodeMap.set(node, newNode)

      // Update the previous group and y coordinate for the next iteration
      previousGroup = currentGroup
      previousY = newNode.y
    })
  }

  /**
   * Determine the x and y coordinates of the graph's edges as a function of the number of
   * (un)collapsed edge groups, total number of edges, and the calculated unit width.
   * @param edgeOrigin the position at which the first edge will be drawn
   * @returns the x coordinate of the last edge
   * @private
   */
  layoutEdges(edgeOrigin = this.paddings.XPadding) {
    // Set the first node's x position
    let xEndPoint = edgeOrigin

    // Precalculate the (user-defined) node and edge-group padding
    const edgeGroupPadding = this.unitWidth * this.edgeSpacings.EdgeGroup

    // Iterate over all groups
    let edgeGroupIndex = 0

    // Ensure there is at least one edge group
    if (this.edgeGroups.size > 0) {
      // Iterate over all edge groups
      for (const [edgeGroupID, layoutEdgeGroup] of this.edgeGroups.entries()) {
        // Get all nodes that fall within the current edge group
        if (this.formStaircases) {
          const nodesInEdgeGroup = this.nodesInEdgeGroup.get(edgeGroupID)

          // Get all edges in the current edge group
          const layoutGroupEdges = layoutEdgeGroup.edges

          // Iterate over all nodes and render all its incident edges (of the current edge group) in order
          nodesInEdgeGroup.forEach((layoutNode, nodeIndex) => {
            // Layout a node's edge set
            xEndPoint = this.layoutEdgeSet(
              this.sortedEdgesPerNode
                .get(layoutNode)
                .filter((edge) => layoutGroupEdges.includes(edge)),
              xEndPoint
            )

            // Add padding between edges that map to different nodes
            if (nodeIndex !== nodesInEdgeGroup.length - 1) {
              xEndPoint += layoutEdgeGroup.collapsed ? 0 : this.unitWidth
            }
          })
        } else {
          const layoutGroupEdges = layoutEdgeGroup.edges.toSorted(this.edgeComparator)
          xEndPoint = this.layoutEdgeSet(layoutGroupEdges, xEndPoint)
        }

        // Add padding between different edge groups
        if (edgeGroupIndex !== this.edgeGroups.size - 1) {
          xEndPoint += edgeGroupPadding
        }

        // Increment the group index
        edgeGroupIndex++
      }
    } else {
      // Get all nodes that have at least one edge mapped to them
      const nonEmptyChildren = this.sortedNodes.filter(
        (node) => this.sortedEdgesPerNode.get(node).length > 0
      )

      // Iterate over the non-empty nodes
      nonEmptyChildren.forEach((node, nodeIndex) => {
        // Layout a node's edge set
        xEndPoint = this.layoutEdgeSet(this.sortedEdgesPerNode.get(node), xEndPoint)

        //
        if (nodeIndex !== nonEmptyChildren.length - 1) {
          xEndPoint += this.unitWidth
        }
      })
    }

    // Return the final x coordinate of the final edge
    return xEndPoint
  }

  /**
   * Determines the x and y coordinates of edges that fall within a particular node's set
   * @param edgesToDraw the edges that map to a particular node set
   * @param origin the x coordinate of the first edge to be rendered
   * @returns the final edge's x coordinate
   * @private
   */
  layoutEdgeSet(edgesToDraw, origin) {
    // Set the next edge's x coordinate to the given origin
    let endPoint = origin

    // Iterate over all given edges
    edgesToDraw.forEach((edge, edgeIndex) => {
      // Extract source and target nodes
      const sourceNode = this.nodeNodeMap.get(edge.source)
      const targetNode = this.nodeNodeMap.get(edge.target)

      // Create new 'edge' object
      const newEdge = {
        x: endPoint,
        sourceNode: sourceNode,
        targetNode: targetNode,
        layoutEdge: edge
      }

      // Update the edgesPerNode with the Source
      let sourceEdges = this.edgesPerNode.get(sourceNode)
      if (!sourceEdges) {
        sourceEdges = []
        this.edgesPerNode.set(sourceNode, sourceEdges)
      }
      sourceEdges.push(newEdge)

      // Update the edgesPerNode with the target
      let targetEdges = this.edgesPerNode.get(targetNode)
      if (!targetEdges) {
        targetEdges = []
        this.edgesPerNode.set(targetNode, targetEdges)
      }
      targetEdges.push(newEdge)

      // Update the origin/end-point
      if (edgeIndex !== edgesToDraw.length - 1) {
        const collapsed = this.edgeGroupMapper?.get(edge)[1] ?? false
        endPoint += collapsed ? 0 : this.unitWidth
      }
    })

    // return the final edge's x coordinate
    return endPoint
  }

  /**
   * Determine the nodes' overall order across node groups.
   * @private
   */
  sortNodes() {
    // (Re-)initialize the sorted nodes array
    this.sortedNodes = []

    // Iterate over each node group to append its sorted node subset
    for (const [_, layoutNodeGroup] of this.nodeGroups.entries()) {
      this.sortedNodes = this.sortedNodes.concat(
        layoutNodeGroup.nodes.toSorted(this.nodeComparator)
      )
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
    this.sortedNodes.forEach((node) => {
      const edgesToDraw = new Array()

      // Assign all not-yet assigned edges to the current node
      node.edges.forEach((edge) => {
        if (!assignedEdges.has(edge)) {
          edgesToDraw.push(edge)
          assignedEdges.add(edge)
        }
      })

      // Update the sorted edges per node
      this.sortedEdgesPerNode.set(node, edgesToDraw.toSorted(this.edgeComparator.bind(this)))
    })
  }

  /**
   * Map the x and y coordinates of the 'edge' objects to the actual 'layoutEdge' objects and the
   * width of each 'node' object to each actual 'layoutNode' object.
   * @private
   */
  applyPositions() {
    // Set the width of each 'layoutNode' object
    this.sortedNodes.forEach((layoutNode) => {
      this.setNodeWidth(layoutNode)
    })

    // Set the x and y coordinates of each 'layoutEdge' object
    this.sortedNodes.forEach((layoutNode) => {
      const node = this.nodeNodeMap.get(layoutNode)
      const edges = this.edgesPerNode.get(node)
      edges.forEach((edge) => {
        edge.layoutEdge.sourcePortLocation = new Point(
          edge.x,
          edge.layoutEdge.source.layout.center.y
        )
        edge.layoutEdge.targetPortLocation = new Point(
          edge.x,
          edge.layoutEdge.target.layout.center.y
        )
      })
    })
  }

  /**
   * Set each node's width dependent on the user-specified node width mode.
   * Three modes are supported:
   * - Compact: Node spans from its first edge to its last edge (both sides padded)
   * - Stairs: Node starts at origin and ends at its last edge (right side padded)
   * - Full: Node spans the entire layout width
   * @param layoutNode The LayoutNode object whose width is to be set based on the user-specified nodeWidthMode
   * @private
   */
  setNodeWidth(layoutNode) {
    const node = this.nodeNodeMap.get(layoutNode)
    const edges = this.edgesPerNode.get(node)
    let min
    let max

    if (this.nodeWidthMode === 'Compact') {
      // Compact: each node starts at its first edge and ends at its last edge
      min =
        edges.reduce((accumulator, edge) => Math.min(accumulator, edge.x), Infinity) -
        this.paddings.XPadding
      max =
        edges.reduce((accumulator, edge) => Math.max(accumulator, edge.x), -Infinity) +
        this.paddings.XPadding
    } else if (this.nodeWidthMode === 'Stairs') {
      // Stairs: each node starts at the same x origin and ends at its last edge (creates a staircase pattern)
      min = node.x
      max =
        edges.reduce((accumulator, edge) => Math.max(accumulator, edge.x), -Infinity) +
        this.paddings.XPadding
    } else {
      // Full: each node starts and ends at the same x position, taking up the drawing's full width
      min = node.x
      max = this.layoutWidth
    }
    node.width = max - min
    node.x = min
    layoutNode.layout.x = min
    layoutNode.layout.width = max - min
  }

  /**
   * Determine each edge's label's x and y positions as a function of the already determined
   * nodes' and edges' x and y coordinates. Label positioning differs based on node width mode.
   * @param graph The layout graph containing the edges and their labels
   * @private
   */
  layoutEdgeLabels(graph) {
    if (this.nodeWidthMode === 'Full') {
      const topY = graph.getBounds({ includeEdgeLabels: false, includeNodeLabels: false }).y
      graph.edgeLabels.forEach((edgeLabel) => {
        edgeLabel.layout = new OrientedRectangle(
          edgeLabel.owner.sourcePortLocation.x + this.edgeLabelHeight * 0.25,
          topY - this.edgeLabelHeight,
          edgeLabel.layout.width,
          this.edgeLabelHeight,
          -1,
          0
        )
      })
    } else {
      graph.edgeLabels.forEach((edgeLabel) => {
        const topY = Math.min(
          edgeLabel.owner.sourcePortLocation.y,
          edgeLabel.owner.targetPortLocation.y
        )
        edgeLabel.layout = new OrientedRectangle(
          edgeLabel.owner.sourcePortLocation.x + this.edgeLabelHeight * 0.25,
          topY - this.edgeLabelHeight,
          edgeLabel.layout.width,
          this.edgeLabelHeight,
          -1,
          0
        )
      })
    }
  }
}
