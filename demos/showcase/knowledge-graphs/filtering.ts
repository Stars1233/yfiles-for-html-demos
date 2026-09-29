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
  Color,
  type FilteredGraphWrapper,
  type GraphComponent,
  type IEdge,
  type IGraph,
  type ILabel,
  type INode,
  type WebGLAnimation,
  type WebGLGraphModelManager
} from '@yfiles/yfiles'

import { resetBeaconAnimation } from './beacon-animation'
import { getEdgeTag, getNodeTag } from './types'
import { getMatchingItems, getSubjectMatchingItems } from './triplet-matching'
import { prepareSmoothLayoutAnimation } from './layout'

/** Tracks whether a fade-out animation is currently active. */
let fadeActive = false

/** Stores the current fade-out animation for cleanup. */
let fadeOutAnimation: WebGLAnimation | null = null

/**
 * Filters nodes and edges according to the provided predicates.
 *
 * @param graphComponent - The graph component to filter
 * @param nodePredicate - Returns true for nodes that should remain visible
 * @param edgePredicate - Returns true for edges that should remain visible
 */
export async function filterOutTypes(
  graphComponent: GraphComponent,
  nodePredicate: (node: INode) => boolean,
  edgePredicate: (edge: IEdge) => boolean
): Promise<void> {
  await applyGraphVisibility(graphComponent, nodePredicate, edgePredicate)
}

/**
 * Applies visibility predicates to the wrapped graph and updates the UI.
 *
 * @param graphComponent - The graph component to update
 * @param nodePredicate - Returns true for visible nodes
 * @param edgePredicate - Returns true for visible edges
 */
async function applyGraphVisibility(
  graphComponent: GraphComponent,
  nodePredicate: (node: INode) => boolean,
  edgePredicate: (edge: IEdge) => boolean
): Promise<void> {
  await resetBeaconAnimation()

  const filteredGraph = getFilteredGraph(graphComponent)
  const graph = filteredGraph.wrappedGraph!

  const incrementalNodes = updateGraphVisibility(graph, nodePredicate, edgePredicate)
  notifyGraphVisibilityChanged(filteredGraph)

  startLayout(incrementalNodes)
  updateGraphUI(filteredGraph)
}

/**
 * Highlights graph items that match the specified type criteria.
 *
 * Existing filtering is reset before applying the highlight. Items that do not
 * match the requested criteria are faded out.
 *
 * When only a subject type is specified:
 * - A node matches when its type matches the subject type.
 * - An edge matches when both its source and target nodes match the subject type.
 * - A label matches when its owner edge matches the subject type.
 *
 * For all other combinations, matching is performed on source type, predicate,
 * and target type. Missing criteria are treated as wildcards.
 *
 * @param graphComponent - The graph component whose items should be highlighted
 * @param subjectType - Optional source node type filter
 * @param predicateLabel - Optional edge type or predicate filter
 * @param objectType - Optional target node type filter
 */
export async function highlightTypes(
  graphComponent: GraphComponent,
  subjectType?: string,
  predicateLabel?: string,
  objectType?: string
): Promise<void> {
  const graph = graphComponent.graph
  await resetBeaconAnimation()

  // There is nothing to highlight when no criteria are specified.
  if (!subjectType && !predicateLabel && !objectType) {
    return
  }

  const matchingItems =
    subjectType && !predicateLabel && !objectType
      ? getSubjectMatchingItems(graph, subjectType)
      : getMatchingItems(graph, subjectType, predicateLabel, objectType)

  const filteredNodes = new Set(graph.nodes.filter((node) => !matchingItems.has(node)))
  const filteredEdges = new Set(graph.edges.filter((edge) => !matchingItems.has(edge)))
  const filteredLabels = new Set(graph.labels.filter((label) => !matchingItems.has(label.owner)))

  await fadeOut(graphComponent, filteredNodes, filteredEdges, filteredLabels)
}

/**
 * Applies a triplet filter to the graph by hiding non-matching items.
 *
 * @param graphComponent - The graph component to filter
 * @param subjectType - Source node type filter
 * @param predicateLabel - Edge type or predicate filter
 * @param objectType - Target node type filter
 */
export async function filterGraph(
  graphComponent: GraphComponent,
  subjectType: string,
  predicateLabel: string,
  objectType: string
): Promise<void> {
  await resetFiltering(graphComponent)

  const graph = getFilteredGraph(graphComponent).wrappedGraph!
  const matchingItems = getMatchingItems(graph, subjectType, predicateLabel, objectType)

  await applyGraphVisibility(
    graphComponent,
    (node) => matchingItems.has(node),
    (edge) => matchingItems.has(edge)
  )
}

/**
 * Applies a fade-out animation to items not matching the filter.
 *
 * Creates a semi-transparent overlay fade animation for non-matching nodes,
 * edges, and labels. Only works with WebGL rendering mode.
 *
 * @param graphComponent - The graph component
 * @param filteredNodes - The nodes to be faded
 * @param filteredEdges - The edges to be faded
 * @param filteredLabels - The labels to be faded
 */
export async function fadeOut(
  graphComponent: GraphComponent,
  filteredNodes: Set<INode>,
  filteredEdges: Set<IEdge>,
  filteredLabels: Set<ILabel>
): Promise<void> {
  // Stop any previous fade animation before creating a new one.
  if (fadeOutAnimation) {
    await fadeOutAnimation.stop()
  }

  // Create fade animation
  const graphModelManager = graphComponent.graphModelManager as WebGLGraphModelManager
  fadeOutAnimation = graphModelManager.createFadeAnimation({
    type: 'fade-out',
    timing: '400ms ease',
    color1: Color.fromRGBA(0, 0, 0, 0.3)
  })

  const graph = graphComponent.graph

  // Apply animation to items
  graph.nodes.forEach((node) => {
    const shouldFade = filteredNodes.has(node)
    getNodeTag(node).visible = !shouldFade
    graphModelManager.setAnimations(node, shouldFade ? [fadeOutAnimation!] : null)
  })

  graph.edges.forEach((edge) => {
    const shouldFade = filteredEdges.has(edge)
    getEdgeTag(edge).visible = !shouldFade
    graphModelManager.setAnimations(edge, shouldFade ? [fadeOutAnimation!] : null)
  })

  graph.labels.forEach((label) => {
    const shouldFade = filteredLabels.has(label)
    graphModelManager.setAnimations(label, shouldFade ? [fadeOutAnimation!] : null)
  })

  await fadeOutAnimation.start()
  fadeActive = true
}

/**
 * Stops any active fade animation and updates visibility tag values.
 *
 * @param graph - The graph on which the animation should be reset
 */
export async function resetFadeAnimation(graph: IGraph): Promise<void> {
  if (!fadeActive || !fadeOutAnimation) {
    return
  }

  await fadeOutAnimation.stop()
  fadeActive = false
  fadeOutAnimation = null

  graph.nodes.forEach((node) => {
    getNodeTag(node).visible = true
  })

  graph.edges.forEach((edge) => {
    getEdgeTag(edge).visible = true
  })
}

/**
 * Resets all filtering and fade animations to show the full graph.
 *
 * Makes all items visible and stops any active fade animation.
 *
 * @param graphComponent - The graph component to reset
 * @param resetUI - Whether the graph information and error panel should be reset
 */
export async function resetFiltering(
  graphComponent: GraphComponent,
  resetUI = false
): Promise<void> {
  const graph = getFilteredGraph(graphComponent)

  const incrementalNodes = updateGraphVisibility(
    graph.wrappedGraph!,
    () => true,
    () => true
  )
  notifyGraphVisibilityChanged(graph)

  if (resetUI && incrementalNodes.length > 0) {
    prepareSmoothLayoutAnimation(graphComponent, incrementalNodes)
  }

  // Stop fade animation if active
  await resetFadeAnimation(graph)

  // Stop beacon animation if active
  await resetBeaconAnimation()

  if (!resetUI) {
    return
  }

  updateGraphUI(graph)
  startLayout(incrementalNodes)
}

/**
 * Resets fade animations.
 *
 * Unlike filtering, this does not change the graph visibility predicates.
 *
 * @param graphComponent - The graph component to reset
 * @param resetUI - Whether the graph information and error panel should be reset
 */
export async function resetFading(graphComponent: GraphComponent, resetUI = false): Promise<void> {
  const graph = graphComponent.graph

  // Stop fade animation if active
  await resetFadeAnimation(graph)

  // Stop beacon animation if active
  await resetBeaconAnimation()

  if (!resetUI) {
    return
  }

  updateGraphUI(graph)
  startLayout()
}

/**
 * Updates the node and edge counts shown in the graph information panel.
 *
 * @param graph - The current graph, possibly filtered
 */
export function updateGraphInformation(graph: IGraph): void {
  const fullGraph = getWrappedGraph(graph)

  setText('#graph-nodes', graph.nodes.size)
  setText('#graph-edges', graph.edges.size)
  setText('#all-graph-nodes', fullGraph.nodes.size)
  setText('#all-graph-edges', fullGraph.edges.size)
}

/**
 * Updates the error panel to show or hide items based on current graph visibility.
 *
 * Problem items for hidden nodes and edges are marked with the `disabled` CSS
 * class.
 *
 * @param graph - The current graph, possibly filtered
 */
function updateErrorPanel(graph: IGraph): void {
  const visibleIds = new Set<string>()

  graph.nodes.forEach((node) => {
    visibleIds.add(getNodeTag(node).id)
  })

  graph.edges.forEach((edge) => {
    visibleIds.add(getEdgeTag(edge).id)
  })

  document.querySelectorAll<HTMLDivElement>('div.data-problem-container').forEach((container) => {
    container.classList.toggle('disabled', !visibleIds.has(container.id))
  })

  const graphInformation = document.querySelector<HTMLDivElement>('.graph-information-container')!
  const footnotes = graphInformation.querySelectorAll<HTMLDivElement>('.footnote')
  const footnoteDescription = graphInformation.querySelector<HTMLParagraphElement>('p.footnote')!
  const hasVisibleNodes = graph.nodes.size > 0

  footnoteDescription.textContent = hasVisibleNodes
    ? '* Depending on the current triplet filtering'
    : '* No nodes and edges match the current filtering'

  footnotes.forEach((footnote) => {
    footnote.classList.toggle('error', !hasVisibleNodes)
  })
}

/**
 * Updates the node and edge visibility in the wrapped graph.
 *
 * @param graph - The graph instance
 * @param nodePredicate - Returns true for visible nodes
 * @param edgePredicate - Returns true for visible edges
 */
function updateGraphVisibility(
  graph: IGraph,
  nodePredicate: (node: INode) => boolean,
  edgePredicate: (edge: IEdge) => boolean
): INode[] {
  const incrementalNodes: INode[] = []
  graph.nodes.forEach((node) => {
    const isVisible = nodePredicate(node)
    const currentState = getNodeTag(node).visible
    if (isVisible && !currentState) {
      incrementalNodes.push(node)
    }
    getNodeTag(node).visible = isVisible
  })

  graph.edges.forEach((edge) => {
    getEdgeTag(edge).visible = edgePredicate(edge)
  })
  return incrementalNodes
}

/**
 * Notifies the filtered graph wrapper that visibility predicates changed.
 *
 * @param graph - The filtered graph wrapper
 */
function notifyGraphVisibilityChanged(graph: FilteredGraphWrapper): void {
  graph.nodePredicateChanged()
  graph.edgePredicateChanged()
}

/**
 * Updates all graph-related UI panels.
 *
 * @param graph - The current graph
 */
function updateGraphUI(graph: IGraph): void {
  updateErrorPanel(graph)
  updateGraphInformation(graph)
}

/**
 * Dispatches the event used by the graph layout controls.
 */
function startLayout(incrementalNodes?: INode[]): void {
  window.dispatchEvent(new CustomEvent('start-layout', { bubbles: true, detail: incrementalNodes }))
}

/**
 * Returns the filtered graph wrapper for a graph component.
 *
 * @param graphComponent - The graph component
 */
export function getFilteredGraph(graphComponent: GraphComponent): FilteredGraphWrapper {
  return graphComponent.graph as FilteredGraphWrapper
}

/**
 * Returns the underlying graph from a filtered graph wrapper.
 *
 * @param graph - The graph, possibly wrapped by a filtered graph wrapper
 */
export function getWrappedGraph(graph: IGraph): IGraph {
  return (graph as FilteredGraphWrapper).wrappedGraph ?? graph
}

/**
 * Sets a numeric value in a graph information element.
 *
 * @param selector - The element selector
 * @param value - The value to display
 */
function setText(selector: string, value: number): void {
  const element = document.querySelector<HTMLElement>(selector)

  if (element) {
    element.textContent = String(value)
  }
}
