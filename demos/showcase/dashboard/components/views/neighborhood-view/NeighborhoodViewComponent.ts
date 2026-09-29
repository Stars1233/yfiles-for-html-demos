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
  CompositeLayoutData,
  FilteredGraphWrapper,
  type GraphComponent,
  type GraphViewerInputMode,
  HierarchicalLayout,
  HierarchicalLayoutData,
  HierarchicalLayoutEdgeDescriptor,
  type INode,
  Insets,
  LayoutAnchoringPolicy,
  LayoutAnchoringStage,
  LayoutAnchoringStageData,
  Neighborhood,
  ParallelEdgeRouter
} from '@yfiles/yfiles'
import { GraphViewBase } from '../graph-view-base'
import { type DashboardData, findNode, getTag } from '../../../types'

/** Traversal direction for neighborhood exploration. */
type Direction = 'both' | 'predecessor' | 'successor'

/**
 * Displays the immediate neighborhood of selected nodes with configurable
 * traversal direction.
 */
export class NeighborhoodViewComponent extends GraphViewBase {
  private filteredGraph: FilteredGraphWrapper | null = null
  // Set of nodes to display (selected + neighbors + parents of neighbors)
  private readonly neighborhood = new Set<INode>()
  private _direction: Direction = 'both'
  private layoutTimeout: number | undefined
  private clickedNode: INode | null = null

  /**
   * Gets the current neighborhood traversal direction.
   *
   * @returns Current direction setting
   */
  get direction(): Direction {
    return this._direction
  }

  /**
   * Sets the neighborhood traversal direction and recomputes if selection exists.
   * Updates can be 'both' (predecessors and successors), 'predecessor', or 'successor'.
   *
   * @param value - New direction value
   */
  set direction(value: Direction) {
    if (this._direction === value) return
    this._direction = value
    if (this.selection && this.selection.size > 0) {
      this.recomputeNeighborhood()
    }
  }

  /**
   * Configures the yFiles graph component to preserve the current selection when
   * the canvas is clicked and to track nodes clicked by the user.
   */
  protected configureGraphComponent(gc: GraphComponent): void {
    super.configureGraphComponent(gc)

    const inputMode = gc.inputMode as GraphViewerInputMode
    inputMode.addEventListener('canvas-clicked', (evt) => {
      evt.handled = true
    })

    inputMode.addEventListener('item-clicked', (evt) => {
      this.clickedNode = evt.item as INode
    })
  }

  /**
   * Initializes the neighborhood view with selection and visibility observers.
   * Recomputes neighborhood when selection changes.
   * Re-applies filtering when visibility changes.
   */
  protected setupView(container: HTMLElement): void {
    super.setupView(container)
    this.watchSelection({
      added: () => this.recomputeNeighborhood(),
      removed: () => this.recomputeNeighborhood()
    })

    // Reapply filter and layout when visibility changes
    const reapply = (): void => {
      this.filteredGraph?.nodePredicateChanged()
      this.runLayout()
    }
    this.watchVisibility({ added: reapply, removed: reapply })
  }

  /**
   * Called when dashboard data changes.
   * Creates or updates graph builder and installs filter wrapper.
   * Recomputes neighborhood if selection exists.
   */
  protected onDataChanged(data: DashboardData | null, _applyLayout = true): void {
    if (!this.graphComponent) return

    if (!data) {
      this.installFilterWrapper()
      return
    }

    // Use wrapped graph if it exists, otherwise use base graph
    const baseGraph = this.filteredGraph?.wrappedGraph ?? this.graphComponent.graph
    if (!this.graphBuilder) {
      this.createGraphBuilder(data, baseGraph)
    }

    this.updateGraphBuilder(data)

    this.installFilterWrapper()

    // Recompute neighborhood if there's an active selection
    if (this.selection && this.selection.size > 0) {
      this.recomputeNeighborhood()
    }
  }

  /**
   * Installs or updates the FilteredGraphWrapper to show only neighborhood nodes.
   * Respects both neighborhood membership and visibility element filtering.
   */
  private installFilterWrapper(): void {
    if (!this.graphComponent) return
    const visible = this.visibleElements
    this.filteredGraph = new FilteredGraphWrapper(
      this.filteredGraph?.wrappedGraph ?? this.graphComponent.graph,
      (node) =>
        this.neighborhood.has(node) &&
        (!visible || visible.size === 0 || visible.includes(getTag(node).id))
    )
    this.graphComponent.graph = this.filteredGraph
  }

  /**
   * Recomputes the neighborhood set based on current selection and direction.
   * Includes selected nodes, their neighbors (1 hop), group descendants,
   * and parents of neighbors. Triggers layout recalculation.
   */
  private recomputeNeighborhood(): void {
    if (!this.graphComponent || !this.filteredGraph || !this.selection) return

    // Find node objects for selected entries
    const startNodes = this.selection
      .map((item) => this.findNodeById(item.id))
      .toArray()
      .filter((n): n is INode => n != null)

    const fullGraph = this.filteredGraph.wrappedGraph!
    this.neighborhood.clear()

    // Add selected nodes and their descendants (for groups)
    for (const node of startNodes) {
      this.neighborhood.add(node)
      if (fullGraph.isGroupNode(node)) {
        fullGraph.groupingSupport.getDescendants(node).forEach((descendant) => {
          this.neighborhood.add(descendant)
        })
      }
    }

    // Compute one-hop neighbors based on direction
    const result = new Neighborhood({
      startNodes,
      maximumDistance: 1,
      traversalDirection: this._direction
    }).run(fullGraph)

    // Add neighbors and their parents to ensure connected display
    result.neighbors.forEach((neighbor) => {
      this.neighborhood.add(neighbor)
      const parent = fullGraph.getParent(neighbor)
      if (parent) {
        this.neighborhood.add(parent)
      }
    })

    this.filteredGraph.nodePredicateChanged()
    this.runLayout()
  }

  /**
   * Finds a node in the wrapped graph by its id.
   *
   * @param id - Node id to find
   * @returns A node if found, null otherwise
   */
  private findNodeById(id: number | string): INode | null {
    const graph = this.filteredGraph?.wrappedGraph
    if (!graph) return null
    return findNode(graph, id) ?? null
  }

  /**
   * Runs the hierarchical layout with edge routing.
   */
  private runLayout(): void {
    if (!this.graphComponent || !this.filteredGraph) return
    const graph = this.filteredGraph.wrappedGraph!
    const center = this.graphComponent.center

    // Get the clicked node, if exists
    const clickedNode = this.clickedNode
    // Reset node positions and edge bends
    graph.nodes
      .filter((node) => node !== clickedNode)
      .forEach((node) => graph.setNodeCenter(node, center))

    graph.edges.forEach((edge) => graph.clearBends(edge))

    // Debounce layout execution with 100ms delay
    if (this.layoutTimeout) clearTimeout(this.layoutTimeout)
    this.layoutTimeout = window.setTimeout(async () => {
      if (!this.graphComponent) return

      // Fit viewport to graph bounds before layout
      await this.graphComponent.fitGraphBounds()

      // Configure hierarchical layout with edge routing
      const layout = new HierarchicalLayout({
        minimumLayerDistance: 40,
        edgeLabelPlacement: 'integrated',
        nodeLabelPlacement: 'consider'
      })

      layout.layoutStages.prepend(new LayoutAnchoringStage())
      // Add parallel edge router to separate multiple edges between nodes
      layout.layoutStages.prepend(
        new ParallelEdgeRouter({ edgeDistance: 0, adaptiveEdgeDistances: false })
      )

      const hierarchicalLayoutData = new HierarchicalLayoutData({
        edgeDescriptors: new HierarchicalLayoutEdgeDescriptor({
          minimumFirstSegmentLength: 20,
          minimumLastSegmentLength: 20
        }),
        // Add margins to group nodes for visual separation
        nodeMargins: (node) => (graph.isGroupNode(node) ? new Insets(20, 0, 0, 0) : Insets.EMPTY)
      })

      const layoutData = new CompositeLayoutData()
      layoutData.items.add(hierarchicalLayoutData)

      if (clickedNode) {
        layoutData.items.add(
          new LayoutAnchoringStageData({
            nodeAnchoringPolicies: (node) =>
              node === clickedNode ? LayoutAnchoringPolicy.CENTER : LayoutAnchoringPolicy.NONE
          })
        )
      }

      await this.graphComponent.applyLayoutAnimated({
        layout,
        animationDuration: this.animateLayout ? '1s' : 0,
        animateViewport: clickedNode == null,
        layoutData
      })

      // The anchor only applies to the current local-click operation
      this.clickedNode = null
    }, 100)
  }

  /**
   * Returns the empty state message displayed when no nodes are selected.
   *
   * @returns Empty message string
   */
  protected get emptyMessage(): string | null {
    return 'Select an entity to explore its neighborhood.'
  }

  /**
   * Determines whether overlay should be shown.
   * Shows overlay when no selection exists.
   *
   * @returns True if no nodes are selected
   */
  protected shouldShowOverlay(): boolean {
    return !this.selection || this.selection.size === 0
  }

  /**
   * Indicates whether viewport should move when selection changes.
   * Disabled for neighborhood view since layout handles positioning.
   *
   * @returns Always false
   */
  protected shouldMoveViewportOnSelection(): boolean {
    return false
  }

  /**
   * Cleans up layout timeout and clears internal state when disconnected.
   */
  protected tearDownView(): void {
    if (this.layoutTimeout) clearTimeout(this.layoutTimeout)
    this.layoutTimeout = undefined
    this.filteredGraph = null
    this.neighborhood.clear()
    super.tearDownView()
  }
}

customElements.define('neighborhood-view', NeighborhoodViewComponent)
