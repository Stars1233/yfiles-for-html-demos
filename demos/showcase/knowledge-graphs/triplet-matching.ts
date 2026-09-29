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
import type { IEdge, IGraph, IModelItem, INode } from '@yfiles/yfiles'
import { getEdgeTag, getNodeTag } from './types'

/**
 * Represents a subject-predicate-object triplet.
 */
export type Triplet = { subject?: string; predicate?: string; object?: string }

/**
 * Tests whether an edge matches the specified triplet.
 *
 * Empty or undefined triplet values are treated as wildcards.
 *
 * @param edge - The edge to test
 * @param triplet - The triplet criteria
 * @returns True if the edge matches the triplet
 */
export function edgeMatchesTriplet(edge: IEdge, triplet: Triplet): boolean {
  return (
    matchesValue(getNodeTag(edge.sourceNode).type, triplet.subject) &&
    matchesValue(getEdgeTag(edge).type, triplet.predicate) &&
    matchesValue(getNodeTag(edge.targetNode).type, triplet.object)
  )
}

/**
 * Finds all graph items matching the filter criteria.
 *
 * An edge matches if:
 * - Its label matches the predicate, or the predicate is empty.
 * - Its source node type matches the subject, or the subject is empty.
 * - Its target node type matches the object, or the object is empty.
 *
 * Matching items include the edge, both endpoint nodes, and the edge labels.
 *
 * @param graph - The graph to search
 * @param subject - Optional source node type filter
 * @param predicate - Optional edge type or predicate filter
 * @param object - Optional target node type filter
 * @returns A set containing matching edges, endpoint nodes, and labels
 */
export function getMatchingItems(
  graph: IGraph,
  subject?: string,
  predicate?: string,
  object?: string
): Set<IModelItem> {
  const matchingItems = new Set<IModelItem>()
  for (const edge of graph.edges) {
    if (!edgeMatchesTriplet(edge, { subject, predicate, object })) {
      continue
    }

    matchingItems.add(edge)
    matchingItems.add(edge.sourceNode)
    matchingItems.add(edge.targetNode)
    edge.labels.forEach((label) => matchingItems.add(label))
  }

  return matchingItems
}

/**
 * Finds all graph items matching a subject-only filter.
 *
 * A node matches when its type equals the subject type.
 * An edge matches when both its source and target nodes match the subject type.
 * A label matches when its owner edge matches the subject type.
 *
 * @param graph - The graph to search
 * @param subjectType - Source and target node type filter
 * @returns A set containing matching nodes, edges, and labels
 */
export function getSubjectMatchingItems(graph: IGraph, subjectType: string): Set<IModelItem> {
  const matchingItems = new Set<IModelItem>()
  const matchingNodes = new Set(graph.nodes.filter((node) => getNodeTag(node).type === subjectType))

  matchingNodes.forEach((node) => matchingItems.add(node))

  graph.edges.forEach((edge) => {
    if (!matchingNodes.has(edge.sourceNode) || !matchingNodes.has(edge.targetNode)) {
      return
    }
    matchingItems.add(edge)
    edge.labels.forEach((label) => matchingItems.add(label))
  })

  return matchingItems
}

/**
 * Returns whether a node belongs to an edge matching the specified triplet.
 *
 * @param graph - The graph to search
 * @param node - The node to test
 * @param triplet - The triplet criteria
 * @returns True if the node is connected to a matching edge
 */
export function nodeMatchesTriplet(graph: IGraph, node: INode, triplet: Triplet): boolean {
  return graph.edges.some(
    (edge) =>
      edgeMatchesTriplet(edge, triplet) && (edge.sourceNode === node || edge.targetNode === node)
  )
}

function matchesValue(value: string | undefined, filter?: string): boolean {
  return !filter || value === filter
}
