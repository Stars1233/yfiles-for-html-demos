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
  Command,
  type EdgesSource,
  GraphBuilder,
  GraphComponent,
  type GraphInputMode,
  GraphItemTypes,
  GraphViewerInputMode,
  HeatMapRenderer,
  type IEdge,
  type IEdgeStyle,
  type IGraph,
  type ILabelModelParameter,
  type ILabelStyle,
  INode,
  type INodeStyle,
  License,
  type NodesSource,
  NodeStyleIndicatorRenderer,
  type ObservableCollection,
  type PopoverContent,
  ShapeNodeStyle,
  type Size
} from '@yfiles/yfiles'
import { DashboardViewBase } from './dashboard-view-base'
import licenseData from '../../../../../lib/license.json'
import type { DashboardConnection, DashboardData, DashboardEntry } from '../../types'
import { addSelectionListener } from '../../selection'
import { applyGrayOutFilter } from './filter-view/FilterViewComponent'
import styles from './graph-view-base.css?inline'

License.value = licenseData

const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(styles)

/**
 * Intermediate base class for dashboard views using {@link GraphComponent}.
 * Provides:
 * - GraphComponent lifecycle management and configuration
 * - GraphBuilder setup with nodes, groups, and edges
 * - Node/edge/group style and label customization
 * - Heat map rendering for flow visualization
 * - Tooltip support
 * - Selection synchronization with visibility filtering
 * - Zoom and viewport commands
 */
export abstract class GraphViewBase extends DashboardViewBase {
  protected graphComponent: GraphComponent | null = null
  /** Whether layout changes should animate. Default: true */
  animateLayout = true
  private selectionListenerCleanup: (() => void) | null = null

  protected graphBuilder: GraphBuilder | null = null
  protected nodesSource: NodesSource<DashboardEntry> = null!
  protected edgesSource: EdgesSource<DashboardConnection> = null!
  protected groupsSource: NodesSource<DashboardEntry> = null!
  // Currently active timeframe element ids for edge filtering
  protected timeFrameElements: (string | number)[] | null = null
  protected heatMapRenderer: HeatMapRenderer | null = null

  /**
   * Predicate to filter which nodes are included in the graph.
   * Default: include all nodes.
   */
  nodeFilter: (dataItem: DashboardEntry) => boolean = (_n) => true

  /** Optional function to style nodes. */
  nodeStyleProvider?: (dataItem: DashboardEntry) => INodeStyle
  /** Optional default size for regular nodes. */
  nodeSizeProvider?: Size
  /** Optional function to style node labels. */
  nodeLabelStyleProvider?: (dataItem: DashboardEntry) => ILabelStyle
  /** Optional function to position node labels. */
  nodeLabelLayoutParameterProvider?: (dataItem: DashboardEntry) => ILabelModelParameter
  /** Optional default size for group nodes. */
  groupNodeSizeProvider?: Size
  /** Optional function to style group nodes. */
  groupStyleProvider?: (dataItem: DashboardEntry) => INodeStyle
  /** Optional function to style group node labels. */
  groupNodeLabelStyleProvider?: (dataItem: DashboardEntry) => ILabelStyle
  /** Optional function to position group node labels. */
  groupNodeLabelLayoutParameterProvider?: (dataItem: DashboardEntry) => ILabelModelParameter
  /** Optional function to style edges. Receives optional thickness parameter. */
  edgeStyleProvider?: (dataItem: DashboardConnection, thickness?: number) => IEdgeStyle
  /** Optional function to style edge labels. */
  edgeLabelStyleProvider?: (dataItem: DashboardConnection) => ILabelStyle
  /** Optional function to position edge labels. */
  edgeLabelLayoutParameterProvider?: (dataItem: DashboardConnection) => ILabelModelParameter
  /** Optional function to create tooltip content for nodes/edges. */
  tooltipProvider?: (item: INode | IEdge) => PopoverContent | undefined
  /** Optional function to compute heat value for nodes/edges. */
  _heatProvider?: (item: INode | IEdge, heatData?: number) => number

  /**
   * Sets the heat provider and updates renderer if initialized.
   *
   * @param value - Function computing heat values or undefined
   */
  set heatProvider(value: ((item: INode | IEdge, heatData?: number) => number) | undefined) {
    this._heatProvider = value
    if (this.heatMapRenderer) {
      this.applyHeatProvider()
    }
  }

  /**
   * Gets the current heat provider.
   *
   * @returns Heat provider function or undefined
   */
  get heatProvider(): ((item: INode | IEdge, heatData?: number) => number) | undefined {
    return this._heatProvider
  }

  /**
   * Applies heat provider to the heat map renderer.
   * Subclasses override to configure gradient and styling.
   */
  protected applyHeatProvider(): void {}

  /**
   * Initializes the graph view with GraphComponent and font link.
   * Calls configureGraphComponent for subclass customization.
   *
   * @param container - Container element for the graph
   */
  protected setupView(container: HTMLElement): void {
    this.adoptStyleSheet(styleSheet)
    this.graphComponent = new GraphComponent(container)
    this.configureGraphComponent(this.graphComponent)
  }

  /**
   * Performs GraphComponent configuration: input mode, selection renderer,
   * tooltips, heat map, and initial graph builder.
   * Subclasses override to add layout-specific or specialized configuration.
   *
   * @param gc - GraphComponent to configure
   */
  protected configureGraphComponent(gc: GraphComponent): void {
    gc.inputMode = new GraphViewerInputMode({
      selectableItems: 'node',
      selectablePredicate: (item) =>
        (item instanceof INode &&
          this.visibleElements?.includes((item.tag as DashboardEntry).id)) ??
        false
    })

    // Configure selection indicator to show rounded rectangle around selected nodes
    gc.graph.decorator.nodes.selectionRenderer.addConstant(
      new NodeStyleIndicatorRenderer({
        zoomPolicy: 'mixed',
        margins: 5,
        nodeStyle: new ShapeNodeStyle({
          shape: this.getSelectionShape(),
          cssClass: 'node-selection'
        })
      })
    )
    adjustPreventScrolling(gc, this.parentElement?.parentElement)

    this.initializeTooltips(gc.inputMode as GraphInputMode)
    this.addHeatMap(gc)

    this.createGraphBuilder({ nodes: [], edges: [] }, gc.graph)
  }

  /**
   * Creates GraphBuilder and populates with nodes, groups, and edges from data.
   * Filters nodes by nodeFilter predicate and edges by timeFrameElements if set.
   * Applies custom styles and labels from provider functions.
   *
   * @param data - Dashboard data or null
   * @param graph - Graph to populate
   */
  protected createGraphBuilder(data: DashboardData | null, graph: IGraph): void {
    if (!this.graphComponent || !data) return

    graph.clear()

    const filteredData: DashboardData = {
      ...data,
      nodes: data.nodes.filter((n) => this.nodeFilter(n))
    }

    const builder = new GraphBuilder(graph)

    // ========== Regular Nodes ==========
    const nodesSource = builder.createNodesSource({
      data: filteredData.nodes.filter((item) => !item.isGroup),
      id: 'id',
      parentId: (item) => item.parentId ?? null
    })

    if (this.nodeStyleProvider) {
      nodesSource.nodeCreator.styleProvider = (dataItem) => this.nodeStyleProvider?.(dataItem)
    }
    if (this.nodeSizeProvider) {
      nodesSource.nodeCreator.defaults.size = this.nodeSizeProvider
    }
    nodesSource.nodeCreator.addEventListener('node-updated', (evt) => {
      nodesSource.nodeCreator.updateTag(evt.graph, evt.item, { ...evt.dataItem })
    })

    // Node labels
    const nodeLabelsSource = nodesSource.nodeCreator.createLabelBinding((dataItem) => dataItem.name)
    if (this.nodeLabelStyleProvider) {
      nodeLabelsSource.styleProvider = (dataItem) => this.nodeLabelStyleProvider?.(dataItem)
    }
    if (this.nodeLabelLayoutParameterProvider) {
      nodeLabelsSource.layoutParameterProvider = (dataItem) =>
        this.nodeLabelLayoutParameterProvider?.(dataItem)
    }

    // ========== Group Nodes ==========
    const groupsSource = builder.createGroupNodesSource({
      data: filteredData.nodes.filter((item) => item.isGroup),
      id: (item) => item.id
    })
    if (this.groupStyleProvider) {
      groupsSource.nodeCreator.styleProvider = (dataItem) => this.groupStyleProvider?.(dataItem)
    }
    if (this.groupNodeSizeProvider) {
      groupsSource.nodeCreator.defaults.size = this.groupNodeSizeProvider
    }

    // Group labels
    const groupLabelsSource = groupsSource.nodeCreator.createLabelBinding(
      (dataItem) => dataItem.name
    )
    if (this.groupNodeLabelStyleProvider) {
      groupLabelsSource.styleProvider = (dataItem) => this.groupNodeLabelStyleProvider?.(dataItem)
    }
    if (this.groupNodeLabelLayoutParameterProvider) {
      groupLabelsSource.layoutParameterProvider = (dataItem) =>
        this.groupNodeLabelLayoutParameterProvider?.(dataItem)
    }

    // ========== Edges ==========
    const edgesSource = builder.createEdgesSource({
      data: data.edges.filter(
        (item) => !this.timeFrameElements || this.timeFrameElements.includes(item.id)
      ),
      id: 'id',
      sourceId: 'source',
      targetId: 'target'
    })

    if (this.edgeStyleProvider) {
      edgesSource.edgeCreator.styleProvider = (dataItem) => this.edgeStyleProvider?.(dataItem)
    }
    edgesSource.edgeCreator.addEventListener('edge-updated', (evt) => {
      edgesSource.edgeCreator.updateTag(evt.graph, evt.item, { ...evt.dataItem })
    })

    // Edge labels
    const edgeLabelsSource = edgesSource.edgeCreator.createLabelBinding((_dataItem) => '')
    if (this.edgeLabelStyleProvider) {
      edgeLabelsSource.styleProvider = (dataItem) => this.edgeLabelStyleProvider?.(dataItem)
    }
    if (this.edgeLabelLayoutParameterProvider) {
      edgeLabelsSource.layoutParameterProvider = (dataItem) =>
        this.edgeLabelLayoutParameterProvider?.(dataItem)
    }

    this.graphBuilder = builder
    this.nodesSource = nodesSource
    this.edgesSource = edgesSource
    this.groupsSource = groupsSource
  }

  /**
   * Called when dashboard data changes.
   * Creates or updates GraphBuilder and reapplies gray-out filtering.
   *
   * @param data - New data or null
   * @param _applyLayout - Whether to apply a layout when the fata change
   */
  protected onDataChanged(data: DashboardData | null, _applyLayout = true): void {
    if (!data || !this.graphComponent) {
      return
    }

    if (!this.graphBuilder) {
      this.createGraphBuilder(data, this.graphComponent.graph)
    }

    this.updateGraphBuilder(data)

    // Reapply gray-out after graph is rebuilt
    if (this.visibleElements) {
      applyGrayOutFilter(this.graphComponent, this.visibleElements)
    }
  }

  /**
   * Updates existing GraphBuilder with new data without recreating.
   * Filters by nodeFilter and timeFrameElements.
   *
   * @param data - Dashboard data to update with
   */
  protected updateGraphBuilder(data: DashboardData): void {
    const filteredData: DashboardData = {
      ...data,
      nodes: data.nodes.filter((n) => this.nodeFilter(n))
    }

    this.graphBuilder!.setData(
      this.nodesSource,
      filteredData.nodes.filter((item) => !item.isGroup)
    )

    this.graphBuilder!.setData(
      this.groupsSource,
      filteredData.nodes.filter((item) => item.isGroup)
    )

    this.graphBuilder!.setData(
      this.edgesSource,
      data.edges.filter(
        (item) => !this.timeFrameElements || this.timeFrameElements.includes(item.id)
      )
    )

    this.graphBuilder!.updateGraph()
  }

  /**
   * Creates and initializes heat map renderer if shouldAddHeatMap returns true.
   *
   * @param gc - GraphComponent to add heat map to
   */
  private addHeatMap(gc: GraphComponent): void {
    if (!this.shouldAddHeatMap()) {
      return
    }
    const heatProvider = (item: INode | IEdge): number => this.heatProvider?.(item) ?? 0
    const renderTree = gc.renderTree
    this.heatMapRenderer = new HeatMapRenderer({
      nodeHeatProvider: heatProvider,
      edgeHeatProvider: heatProvider
    })
    renderTree.createElement(renderTree.backgroundGroup, gc.graph, this.heatMapRenderer)
  }

  /**
   * Returns the shape for the selection indicator.
   * Subclasses override to use different shapes (e.g., ellipse).
   *
   * @returns Selection shape name
   */
  protected getSelectionShape(): 'round-rectangle' | 'ellipse' {
    return 'round-rectangle'
  }

  /**
   * Called when selection changes.
   * Attaches/detaches selection listener and optionally moves viewport.
   *
   * @param selection - New selection collection or null
   */
  protected onSelectionChanged(selection: ObservableCollection<DashboardEntry> | null): void {
    // Clean up previous listener before adding new one
    this.selectionListenerCleanup?.()
    this.selectionListenerCleanup = null

    if (this.graphComponent && selection) {
      this.selectionListenerCleanup = addSelectionListener(
        this.graphComponent,
        selection,
        this.shouldMoveViewportOnSelection()
      )
    }
  }

  /**
   * Called when visible elements change.
   * Applies gray-out filter to hide non-visible nodes/edges.
   *
   * @param visibleElements - Visible element IDs or null
   */
  protected onVisibleElementsChanged(visibleElements: ObservableCollection<number> | null): void {
    if (!this.graphComponent || !visibleElements) return
    applyGrayOutFilter(this.graphComponent, visibleElements)
  }

  /**
   * Initializes tooltip support on input mode.
   * Queries tooltipProvider for content when hovering nodes/edges.
   *
   * @param inputMode - GraphInputMode to configure
   */
  protected initializeTooltips(inputMode: GraphInputMode): void {
    inputMode.toolTipItems = GraphItemTypes.NODE | GraphItemTypes.EDGE
    inputMode.addEventListener('query-item-tool-tip', (evt) => {
      if (evt.handled || !this.shouldShowTooltips()) {
        return
      }
      const toolTip = this.createTooltipContent(evt.item as INode | IEdge)
      if (toolTip) {
        evt.toolTip = toolTip
      }
      evt.handled = true
    })
  }

  /**
   * Creates tooltip content for a node or edge.
   * Default: delegates to tooltipProvider if set.
   *
   * @param modelItem - Node or edge to create tooltip for
   * @returns PopoverContent or undefined
   */
  protected createTooltipContent(modelItem: INode | IEdge): PopoverContent | undefined {
    return this.tooltipProvider?.(modelItem)
  }

  /**
   * Determines whether viewport should move when selection changes.
   * Default: true. Override to prevent viewport movement.
   *
   * @returns True if viewport should move on selection
   */
  protected shouldMoveViewportOnSelection(): boolean {
    return true
  }

  /**
   * Determines whether heat map should be rendered.
   * Default: false. Subclasses override to enable.
   *
   * @returns True if heat map should be added
   */
  protected shouldAddHeatMap(): boolean {
    return false
  }

  /**
   * Determines whether tooltips should be shown.
   * Default: true.
   *
   * @returns True if tooltips should display
   */
  protected shouldShowTooltips(): boolean {
    return true
  }

  /**
   * Cleans up GraphComponent and listeners on teardown.
   */
  protected tearDownView(): void {
    // Clean up selection listener before destroying graphComponent
    this.selectionListenerCleanup?.()
    this.selectionListenerCleanup = null

    if (this.graphComponent) {
      this.graphComponent.cleanUp()
      this.graphComponent = null
    }
  }

  /**
   * Increases the zoom level of the graph.
   */
  increaseZoom(): void {
    this.graphComponent?.executeCommand(Command.INCREASE_ZOOM)
  }

  /**
   * Decreases the zoom level of the graph.
   */
  decreaseZoom(): void {
    this.graphComponent?.executeCommand(Command.DECREASE_ZOOM)
  }

  /**
   * Fits the entire graph bounds in viewport without animation.
   */
  fitBounds(): void {
    if (!this.graphComponent) return
    void this.graphComponent.fitGraphBounds({ animated: false })
  }

  /**
   * Fits the entire graph bounds in viewport with animation.
   *
   * @returns Promise resolving when fit completes
   */
  async fitContent(): Promise<void> {
    await this.graphComponent?.fitGraphBounds()
  }

  /**
   * Resets all style providers and filters to defaults.
   */
  override resetToDefaults(): void {
    super.resetToDefaults()
    this.nodeFilter = (_n) => true
    this.nodeStyleProvider = undefined
    this.nodeSizeProvider = undefined
    this.nodeLabelStyleProvider = undefined
    this.nodeLabelLayoutParameterProvider = undefined
    this.groupStyleProvider = undefined
    this.groupNodeLabelStyleProvider = undefined
    this.groupNodeLabelLayoutParameterProvider = undefined
    this.edgeStyleProvider = undefined
    this.edgeLabelStyleProvider = undefined
    this.edgeLabelLayoutParameterProvider = undefined
    this.tooltipProvider = undefined
    this._heatProvider = undefined
    this.timeFrameElements = null
    this.graphBuilder = null
  }
}

/**
 * Configures viewport interaction based on screen size and card expansion.
 * Prevents scrolling when window is small or card is collapsed.
 * Observes media queries and card expand/collapse attribute.
 *
 * @param graphComponent - GraphComponent to configure
 * @param parentCard - Optional parent card element to observe
 */
export function adjustPreventScrolling(
  graphComponent: GraphComponent,
  parentCard?: HTMLElement | null | undefined
): void {
  const mediaQueryList = matchMedia('(max-width: 1500px)')
  mediaQueryList.addEventListener('change', (event) => {
    if (event.matches) {
      graphComponent.preventViewportInteraction = 'unfocused'
    } else {
      graphComponent.preventViewportInteraction = 'never'
    }
  })
  if (mediaQueryList.matches) {
    graphComponent.preventViewportInteraction = 'unfocused'
  } else {
    graphComponent.preventViewportInteraction = 'never'
  }

  // Allow interaction when card is expanded, prevent when collapsed
  if (parentCard) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'expanded') {
          const target = mutation.target as Element
          if (target.hasAttribute('expanded')) {
            graphComponent.preventViewportInteraction = 'never'
          } else {
            graphComponent.preventViewportInteraction = 'unfocused'
          }
        }
      }
    })

    observer.observe(parentCard, { attributes: true, attributeFilter: ['expanded'] })
  }
}
