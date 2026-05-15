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
import type { IEdge, INode, LayoutEdge, LayoutNode } from '@yfiles/yfiles'

/**
 * Lexicographical ordering options, i.e.
 * - 'LexicographicalDescending': alphanumerical order of provided labels in descending order, and
 * - 'LexicographicalAscending': alphanumerical order of provided labels in ascending order.
 */
type LexicographicalOrderingKeys = 'LexicographicalDescending' | 'LexicographicalAscending'

/**
 * (Edge/Node Group) Cardinality ordering options, i.e.
 * - 'CardinalityDescending': in descending order of group size, i.e., number of edges/nodes, and
 * - 'CardinalityAscending': in ascending order of group size, i.e., number of edges/nodes
 */
type CardinalityOrderingKeys = 'CardinalityAscending' | 'CardinalityDescending'

/**
 * Node ordering options, i.e.
 * - 'LexicographicalAscending': alphanumerical order of provided labels in descending order,
 * - 'LexicographicalDescending': alphanumerical order of provided labels in ascending order, and
 * - 'DegreeDescending': in descending order of node degree, i.e., number of neighbors
 */
export type NodeOrderingKey = 'Degree' | LexicographicalOrderingKeys

/**
 * The biofabric's Node ordering function type, i.e., a function that governs the 1D, vertical
 * ordering of the input graph's nodes. The function takes two 'LayoutNode' types and
 * consequently returns a number indicating their relative order.
 */
export type NodeOrderingFunction<U extends LayoutNode | INode> = (arg0: U, arg1: U) => number

/**
 * Edge ordering options, i.e.
 * - 'LexicographicalAscending': alphanumerical order of provided labels in descending order,
 * - 'LexicographicalDescending': alphanumerical order of provided labels in ascending order, and
 * - 'EdgeLength': in descending order of edge length, measured from source to target node
 */
export type EdgeOrderingKey = 'EdgeLength' | LexicographicalOrderingKeys | 'AsIs'

/**
 * The edge ordering function type which takes as input two edge of type 'LayoutEdge' and returns
 * a number describing their relative order.
 */
export type EdgeOrderingFunction<U extends LayoutEdge | IEdge> = (arg0: U, arg1: U) => number

/**
 * The node group ordering options, i.e.,
 * - 'CardinalityDescending': in descending order of node group size, i.e., number of nodes,
 * - 'CardinalityAscending': in ascending order of node group size, i.e., number of nodes
 * - 'LexicographicalAscending': alphanumerical order of provided node group ID labels in descending order, and
 * - 'LexicographicalDescending': alphanumerical order of provided node group ID labels in ascending order.
 */
export type NodeGroupOrderingKey = CardinalityOrderingKeys | LexicographicalOrderingKeys

/**
 * The node group ordering function type, which takes as input two strings describing the node
 * group IDs and returns a number describing their relative order.
 */
export type NodeGroupOrderingFunction = (arg0: string, arg1: string) => number

/**
 * The edge group ordering options, i.e.,
 * - 'CardinalityDescending': in descending order of edge group size, i.e., number of edges,
 * - 'CardinalityAscending': in ascending order of edge group size, i.e., number of edges
 * - 'LexicographicalAscending': alphanumerical order of provided edge group ID labels in descending order, and
 * - 'LexicographicalDescending': alphanumerical order of provided edge group ID labels in ascending order.
 */
export type EdgeGroupOrderingKey = CardinalityOrderingKeys | LexicographicalOrderingKeys

/**
 * The edge group ordering function type, which takes as input two strings describing the edge
 * group IDs and returns a number describing their relative order.
 */
export type EdgeGroupOrderingFunction = (arg0: string, arg1: string) => number

/**
 * The NodeGroup type which describes a particular node group and its state, i.e.,
 * - nodes: the 'INode' objects that make up the group
 * - id: the string that uniquely describes and labels the node group
 * - collapsed: a boolean flag indicating whether a node group has been collapsed by the user, and
 * - highlighted: a boolean flag indicating whether a node group is being highlighted by the user.
 */
export interface NodeGroup {
  nodes: Array<INode>
  id: string
  collapsed: boolean
  highlighted: boolean
}

/**
 * The NodeGroups type which maps a unique node group ID string to its corresponding NodeGroup
 * object.
 */
export type NodeGroups = Partial<Record<string, NodeGroup>>

/**
 * The EdgeGroup type which describes a particular edge group and its state, i.e.,
 * - edges: the 'IEdge' objects that make up the edge group
 * - id: the string that uniquely describes and labels the edge group
 * - collapsed: a boolean flag indicating whether a edge group has been collapsed by the user, and
 * - highlighted: a boolean flag indicating whether a edge group is being highlighted by the user.
 */
export interface EdgeGroup {
  edges: Array<IEdge>
  id: string
  collapsed: boolean
  highlighted: boolean
}

/**
 * The EdgeGroups type which maps a unique node edge ID string to its corresponding EdgeGroup
 * object.
 */
export type EdgeGroups = Partial<Record<string, EdgeGroup>>

/**
 * The LayoutNodeGroup object which, for a particular node group, describes its contents and states, i.e.,
 * - nodes: the 'LayoutNode' objects that make up the particular node group
 * - collapsed: a boolean flag indicating whether the node group has been collapsed by the user
 */
export interface LayoutNodeGroup {
  nodes: Array<LayoutNode>
  collapsed: boolean
}

/**
 * The LayoutNodeGroups object which maps node groups (using their unique ID string) to their
 * corresponding LayoutNodeGroup object
 */
export type LayoutNodeGroups = Map<string, LayoutNodeGroup>

/**
 * The LayoutEdgeGroup object which, for a particular edge group, describes its contents and states, i.e.,
 * - edge: the 'LayoutEdge' objects that make up the particular edge group
 * - collapsed: a boolean flag indicating whether the edge group has been collapsed by the user
 */
export interface LayoutEdgeGroup {
  edges: Array<LayoutEdge>
  collapsed: boolean
}

/**
 * The LayoutEdgeGroups object which maps edge groups (using their unique ID string) to their
 * corresponding LayoutEdgeGroup object
 */
export type LayoutEdgeGroups = Map<string, LayoutEdgeGroup>

/**
 * The render tag object passed to the NodeGroupRenderer object containing the data describing the
 * node group to be rendered, i.e.,
 * - groupName: the unique ID string of the node group in question, and
 * - nodeGroup: the NodeGroup object which contains the 'INode' objects that make up the node group,
 * the ID string that identifies the node group, the collapsed state flag, and the highlighted
 * state flag
 */
export type NodeGroupRendererRenderTag = { groupName: string; nodeGroup: NodeGroup }

/**
 * The render tag object passed to the EdgeGroupRenderer object containing the data describing the
 * edge group to be rendered, i.e.,
 * - groupName: the unique ID string of the edge group in question, and
 * - edgeGroup: the EdgeGroup object which contains the 'IEdge' objects that make up the edge group,
 * the ID string that identifies the edge group, the collapsed state flag, and the highlighted
 * state flag
 */
export type EdgeGroupRendererRenderTag = { groupName: string; edgeGroup: EdgeGroup }

/**
 * A function with which to check if a given object is a NodeGroup object or not
 * @param n the object to be tested
 * @returns a boolean flag indicating whether the input object is a NodeGroup or not
 */
export function isNodeGroup(n: unknown): n is NodeGroup {
  return (
    n !== null && typeof n === 'object' && 'nodes' in n && 'collapsed' in n && 'highlighted' in n
  )
}

/**
 * A function with which to check if a given object is a EdgeGroup object or not
 * @param n the object to be tested
 * @returns a boolean flag indicating whether the input object is a EdgeGroup or not
 */
export function isEdgeGroup(n: unknown): n is EdgeGroup {
  return (
    n !== null && typeof n === 'object' && 'edges' in n && 'collapsed' in n && 'highlighted' in n
  )
}

/**
 * A function with which to check if a given object is a NodeGroupRenderTag object or not
 * @param n the object to be tested
 * @returns a boolean flag indicating whether the input object is a NodeGroupRenderTag or not
 */
export function isNodeGroupRenderTag(n: unknown): n is NodeGroupRendererRenderTag {
  return n !== null && typeof n === 'object' && 'groupName' in n && 'nodeGroup' in n
}

/**
 * A function with which to check if a given object is a EdgeGroupRenderTag object or not
 * @param n the object to be tested
 * @returns a boolean flag indicating whether the input object is a EdgeGroupRenderTag or not
 */
export function isEdgeGroupRenderTag(n: unknown): n is EdgeGroupRendererRenderTag {
  return n !== null && typeof n === 'object' && 'groupName' in n && 'edgeGroup' in n
}

/**
 * The EdgeColorMode type, i.e., the various modes with which edges can be colored, i.e.,
 * - 'NodeGroups': color node groups (and their corresponding nodes) categorically, and, in turn,
 * color edges using a gradient where the source and target end points of the edge take on the
 * colors of the node groups of the source and target nodes that the edge connects, respectively
 * - 'NodeGroupsInverted': color node groups (and their corresponding nodes) categorically, and,
 * in turn, color edges using a gradient where the source and target end points of the edge take on
 * the colors of the node groups of the target and source nodes that the edge connects, respectively
 * - 'EdgeGroups': categorically color edges based on their edge group mapping
 * - 'None': edges are not colored based on edge or not group mapping
 */
export type EdgeColorMode = 'NodeGroups' | 'NodeGroupsInverted' | 'EdgeGroups' | 'None'

/**
 * The various ways in which nodes can be rendered, i.e.,
 * - 'Full': all nodes are equally wide, taking up the full width of the user-specified canvas
 * - 'Stairs': each node starts at the same x coordinate, i.e., the origin of the canvas, but ends
 * at the x coordinate of its last rendered edge
 * - 'Compact': each edge starts at the x coordinate of its first rendered edge, and ends at the
 * x coordinate of its last rendered edge
 */
export type NodeWidthMode = 'Full' | 'Stairs' | 'Compact'
