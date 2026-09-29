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
  type EdgesSource,
  ExteriorNodeLabelModel,
  GenericLabeling,
  GenericLabelingData,
  GraphBuilder,
  type GraphComponent,
  GraphItemTypes,
  type GraphViewerInputMode,
  IArrow,
  ILabelStyle,
  INode,
  LabelingCosts,
  LabelingOptimizationStrategy,
  LabelStyle,
  LabelStyleIndicatorRenderer,
  type NodesSource,
  NodeStyleIndicatorRenderer,
  type ObservableCollection,
  PolylineEdgeStyle,
  ShapeNodeStyle
} from '@yfiles/yfiles'
import {
  type DashboardConnection,
  type DashboardData,
  type DashboardEntry,
  getTag
} from '../../../types'
import { applyGrayOutFilter } from '../filter-view/FilterViewComponent'
import L, { type Map as LeafletMap } from 'leaflet'
import leafletCss from 'leaflet/dist/leaflet.css?inline'
import { DashboardViewBase } from '../dashboard-view-base'
import styles from './map-view.css?inline'
import { createMap } from '../../../../map/leaflet-graph-layer'

const leafletSheet = new CSSStyleSheet()
leafletSheet.replaceSync(leafletCss)

const mapSheet = new CSSStyleSheet()
mapSheet.replaceSync(styles)

/** Zoom level at or above which node labels become visible. */
const LABEL_ZOOM_THRESHOLD = 6

/** Default node size in graph units [width, height]. */
const DEFAULT_NODE_SIZE: [number, number] = [10, 10]

/**
 * Fallback map center (Switzerland) used before any data is loaded.
 * Format: [latitude, longitude]
 */
const DEFAULT_MAP_CENTER: [number, number] = [46.9028, 8.4964]
const DEFAULT_MAP_ZOOM = 3

/** Padding in pixels applied when fitting the map to node bounds. */
const FIT_BOUNDS_PADDING: [number, number] = [40, 40]

/** Maximum zoom level used when fitting the map to node bounds. */
const FIT_BOUNDS_MAX_ZOOM = 14

/** Zoom level used when there is only a single node to focus on. */
const SINGLE_NODE_ZOOM = 12

/** Duration of the label placement animation after a zoom change. */
const LABEL_ANIMATION_DURATION = '0.2s'

/**
 * Returns the default node style for a given dashboard entry.
 * Uses a CSS class derived from the entry's type for theming.
 *
 * @param dataItem - Dashboard entry to style
 * @returns Configured ShapeNodeStyle
 */
function createDefaultNodeStyle(dataItem: DashboardEntry): ShapeNodeStyle {
  return new ShapeNodeStyle({ cssClass: `node ${dataItem.type.toLowerCase()}`, shape: 'ellipse' })
}

/**
 * Returns the default edge style (no arrows on either end).
 *
 * @returns Configured PolylineEdgeStyle
 */
function createDefaultEdgeStyle(): PolylineEdgeStyle {
  return new PolylineEdgeStyle({
    sourceArrow: IArrow.NONE,
    targetArrow: IArrow.NONE,
    cssClass: 'edge'
  })
}

/**
 * Returns the default label style for a given dashboard entry.
 * Labels are rendered inside a rounded "squircle" background.
 *
 * @param _dataItem - Dashboard entry (unused)
 * @returns Configured LabelStyle
 */
function createDefaultNodeLabelStyle(_dataItem: DashboardEntry): LabelStyle {
  return new LabelStyle({
    verticalTextAlignment: 'center',
    horizontalTextAlignment: 'center',
    wrapping: 'wrap-word',
    backgroundFill: 'white',
    shape: 'squircle',
    padding: 1
  })
}

/**
 * A custom element that renders a Leaflet map with a graphComponent.
 * Nodes are positioned according to their geographic
 * coordinates and support filtering, custom styles, and synchronized
 * selection with the rest of the dashboard.
 */
export class MapViewComponent extends DashboardViewBase {
  private leafletMap: LeafletMap | null = null
  protected graphComponent: GraphComponent | null = null
  private graphBuilder: GraphBuilder | null = null
  private nodesSource: NodesSource<DashboardEntry> = null!
  private edgesSource?: EdgesSource<DashboardConnection> = null!
  // Flag to rebuild graph builder when style providers change
  private updateGraphBuilder = true

  /**
   * Predicate that controls which nodes are displayed on the map.
   * Return true to include a node in the visualization.
   */
  nodeFilter: (node: DashboardEntry) => boolean = () => true

  /** Whether to render edges in the graph visualization. */
  showEdges = true

  private _nodeStyleProvider?: (dataItem: DashboardEntry) => ShapeNodeStyle | undefined
  private _edgeStyleProvider?: (dataItem: DashboardConnection) => PolylineEdgeStyle | undefined
  private _nodeLabelStyleProvider?: (dataItem: DashboardEntry) => ILabelStyle | undefined

  /**
   * Gets or sets the node style provider function.
   * Setting triggers graph rebuilding.
   */
  get nodeStyleProvider(): ((dataItem: DashboardEntry) => ShapeNodeStyle | undefined) | undefined {
    return this._nodeStyleProvider
  }

  set nodeStyleProvider(
    value: ((dataItem: DashboardEntry) => ShapeNodeStyle | undefined) | undefined
  ) {
    this._nodeStyleProvider = value
    this.updateGraphBuilder = true
  }

  /**
   * Gets or sets the edge style provider function.
   * Setting triggers graph rebuilding.
   */
  get edgeStyleProvider():
    ((dataItem: DashboardConnection) => PolylineEdgeStyle | undefined) | undefined {
    return this._edgeStyleProvider
  }

  set edgeStyleProvider(
    value: ((dataItem: DashboardConnection) => PolylineEdgeStyle | undefined) | undefined
  ) {
    this._edgeStyleProvider = value
    this.updateGraphBuilder = true
  }

  /**
   * Gets or sets the node label style provider function.
   * Setting triggers graph rebuilding.
   */
  get nodeLabelStyleProvider():
    ((dataItem: DashboardEntry) => ILabelStyle | undefined) | undefined {
    return this._nodeLabelStyleProvider
  }

  set nodeLabelStyleProvider(
    value: ((dataItem: DashboardEntry) => ILabelStyle | undefined) | undefined
  ) {
    this._nodeLabelStyleProvider = value
    this.updateGraphBuilder = true
  }

  /**
   * Initializes the Leaflet map and graph layer, sets up interaction handlers,
   * and observes container size changes.
   * Called by base class when element connects to DOM.
   */
  protected setupView(container: HTMLElement): void {
    this.adoptStyleSheet(leafletSheet)
    this.adoptStyleSheet(mapSheet)

    this.initMap(container)
    this.initGraphInteraction()
    this.initSelectionSync()
    this.initZoomListener()
    this.initResizeObserver(container)
  }

  /**
   * Removes the Leaflet map and clears internal references.
   * Called by base class when element disconnects from DOM.
   */
  protected tearDownView(): void {
    this.leafletMap?.remove()
    this.leafletMap = null
    this.graphComponent = null
    super.tearDownView()
  }

  /**
   * Rebuilds the graph when dashboard data changes.
   * Applies node filtering, style providers, and label visibility.
   * Fits map viewport to node bounds after rebuild.
   */
  protected onDataChanged(data: DashboardData | null): void {
    if (!data) {
      return
    }

    if (!this.graphBuilder || this.updateGraphBuilder) {
      this.createGraphBuilder(data)
      this.updateGraphBuilder = false
    }

    // Filter nodes before building graph
    const filteredData: DashboardData = {
      ...data,
      nodes: data.nodes.filter((n) => this.nodeFilter(n))
    }

    this.graphBuilder!.setData(this.nodesSource, filteredData.nodes)
    if (this.edgesSource) {
      this.graphBuilder!.setData(this.edgesSource, data.edges)
    }
    this.graphBuilder!.updateGraph()

    // Reapply visibility filtering after graph rebuild
    if (this.graphComponent && this.visibleElements) {
      applyGrayOutFilter(this.graphComponent, this.visibleElements)
    }

    // Defer map fitting to allow graph layer layout update
    requestAnimationFrame(() => this.fitMapToBounds(filteredData.nodes))

    this.syncLabelVisibility()
  }

  /**
   * Applies gray-out filter to nodes not in visible set.
   * Updates map size after filtering.
   */
  protected onVisibleElementsChanged(visibleElements: ObservableCollection<number> | null): void {
    if (!this.graphComponent || !visibleElements) return
    applyGrayOutFilter(this.graphComponent, visibleElements)
    this.leafletMap?.invalidateSize()
  }

  /**
   * Resets all customization properties to defaults and re-renders.
   */
  override resetToDefaults(): void {
    super.resetToDefaults()
    this.nodeFilter = () => true
    this.showEdges = true
    this._nodeStyleProvider = undefined
    this._edgeStyleProvider = undefined
    this._nodeLabelStyleProvider = undefined
    if (this.data) this.onDataChanged(this.data)
  }

  /**
   * Forces the Leaflet map to recalculate container size.
   * Call after programmatically resizing the host element.
   * Uses nested requestAnimationFrame to ensure browser layout complete.
   */
  invalidateMap(): void {
    if (!this.leafletMap) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.leafletMap?.invalidateSize()
      })
    })
  }

  /**
   * Initializes the Leaflet map instance and graph layer.
   * Sets up custom selection rendering for nodes and labels.
   * Wires up selection event handlers for synchronized label selection.
   */
  private initMap(container: HTMLElement): void {
    const mapData = createMap(
      container,
      (node) => getTag(node).location!,
      () => {}
    )

    this.leafletMap = mapData.map
    this.graphComponent = mapData.graphLayer.graphComponent

    // Override node selection indicator to use matching ellipse shape
    this.graphComponent.graph.decorator.nodes.selectionRenderer.addFactory((node) => {
      const style = node.style as ShapeNodeStyle
      return new NodeStyleIndicatorRenderer({
        zoomPolicy: 'mixed',
        margins: 10,
        nodeStyle: new ShapeNodeStyle({
          shape: 'ellipse',
          fill: style.fill,
          cssClass: `${style.cssClass} selection`
        })
      })
    })

    // Configure label selection rendering
    this.graphComponent.graph.decorator.labels.selectionRenderer.addFactory((label) => {
      return new LabelStyleIndicatorRenderer({
        zoomPolicy: 'mixed',
        margins: 0,
        labelStyle: label.style
      })
    })

    // Automatically select node labels when node is selected
    this.graphComponent.selection.addEventListener('item-added', (event) => {
      const item = event.item
      if (item instanceof INode) {
        item.labels.forEach((label) => {
          this.graphComponent?.selection.add(label)
        })
      }
    })

    // Deselect node labels when node is deselected
    this.graphComponent.selection.addEventListener('item-removed', (event) => {
      const item = event.item
      if (item instanceof INode) {
        item.labels.forEach((label) => this.graphComponent?.selection.remove(label))
      }
    })

    // Keep label selection in sync when style changes
    this.graphComponent.graph.addEventListener('label-style-changed', (event) => {
      const label = event.item
      if (this.graphComponent?.selection.includes(label.owner)) {
        this.graphComponent.selection.add(label)
      } else {
        this.graphComponent?.selection.remove(label)
      }
    })
  }

  /**
   * Configures input mode so only nodes are click-selectable.
   * Restricts selection to visible elements only.
   */
  private initGraphInteraction(): void {
    if (!this.graphComponent) return

    const inputMode = this.graphComponent.inputMode as GraphViewerInputMode
    inputMode.clickSelectableItems = GraphItemTypes.NODE
    inputMode.selectableItems = GraphItemTypes.NODE
    inputMode.selectablePredicate = (item) =>
      (item instanceof INode && this.visibleElements?.includes((item.tag as DashboardEntry).id)) ??
      false

    // Propagate graph selection to dashboard selection
    inputMode.addEventListener('item-clicked', (evt) => {
      if (evt.item instanceof INode) {
        this.applySelectionTransformAndAdd(getTag(evt.item) as DashboardEntry)
      }
    })
  }

  /**
   * Syncs graph selection with dashboard selection.
   * Pans map to selected node location if available.
   */
  private initSelectionSync(): void {
    this.watchSelection({
      added: (item) => {
        if (!this.graphComponent) return

        // Highlight matching graph node
        const matchingNode = [...this.graphComponent.graph.nodes].find(
          (n) => getTag(n).id === item.id
        )
        this.graphComponent.selection.clear()
        if (matchingNode) {
          this.graphComponent.selection.add(matchingNode)
        }

        // Pan to node location if available
        if (item.location?.lat && item.location.lng) {
          this.leafletMap?.panTo([item.location.lat, item.location.lng])
        }
      },
      removed: () => {
        this.graphComponent?.selection.clear()
      }
    })
  }

  /**
   * Shows/hides labels based on zoom level.
   * Re-runs label placement after user finishes zooming.
   */
  private initZoomListener(): void {
    this.leafletMap?.addEventListener('zoomend', async () => {
      const showLabels = this.shouldShowLabels()
      this.updateLabelVisibility(showLabels)
      if (showLabels) {
        await this.runLabeling(this.graphComponent!, /* animated */ true)
      }
    })
  }

  /**
   * Fits map to loaded data once container has stable size.
   * Observer disconnects after first callback to prevent repeated fitting.
   */
  private initResizeObserver(container: HTMLElement): void {
    const observer = new ResizeObserver(() => {
      observer.disconnect()
      requestAnimationFrame(() => {
        this.leafletMap?.invalidateSize()

        if (this.data) {
          this.fitMapToBounds(this.data.nodes)
        } else {
          this.leafletMap?.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM)
        }
      })
    })

    observer.observe(container)
  }

  /**
   * Creates GraphBuilder to populate nodes, edges, and labels.
   * Applies style providers and configures label generation.
   */
  private createGraphBuilder(filteredData: DashboardData): void {
    if (!this.graphComponent) {
      return
    }

    this.graphComponent.graph.clear()

    const builder = new GraphBuilder(this.graphComponent.graph)

    // Configure nodes source
    const nodesSource = builder.createNodesSource({ data: filteredData.nodes, id: 'id' })
    nodesSource.nodeCreator.defaults.size = DEFAULT_NODE_SIZE
    nodesSource.nodeCreator.styleProvider = this._nodeStyleProvider ?? createDefaultNodeStyle

    // Configure node labels (positioned below nodes)
    nodesSource.nodeCreator.defaults.labels.layoutParameter = ExteriorNodeLabelModel.BOTTOM

    // Create abbreviated labels from entry names (first letters of words)
    const labelsSource = nodesSource.nodeCreator.createLabelBinding((entry) =>
      entry.name
        .trim()
        .replace(/\([^)]*\)/g, '')
        .trim()
        .split(/\s+/)
        .map((word) => word[0])
        .filter((char) => /[a-zA-Z]/.test(char))
        .join('')
        .toUpperCase()
    )
    labelsSource.styleProvider = this._nodeLabelStyleProvider ?? createDefaultNodeLabelStyle

    // Configure edges source if enabled
    let edgesSource
    if (this.showEdges) {
      edgesSource = builder.createEdgesSource({
        data: filteredData.edges,
        id: 'id',
        sourceId: 'source',
        targetId: 'target'
      })
      edgesSource.edgeCreator.styleProvider = this._edgeStyleProvider ?? createDefaultEdgeStyle
    }

    this.graphBuilder = builder
    this.nodesSource = nodesSource
    this.edgesSource = edgesSource
  }

  /**
   * Toggles label visibility based on zoom level and runs label placement if visible.
   */
  private syncLabelVisibility(): void {
    const showLabels = this.shouldShowLabels()
    this.updateLabelVisibility(showLabels)
    if (showLabels && this.graphComponent) {
      void this.runLabeling(this.graphComponent)
    }
  }

  /**
   * Toggles all node labels on/off by swapping their style.
   * Uses void label style when hidden to avoid layout conflicts.
   *
   * @param showLabels - Whether labels should be visible
   */
  private updateLabelVisibility(showLabels: boolean): void {
    if (!this.leafletMap || !this.graphComponent) return

    const graph = this.graphComponent.graph
    const labelStyleProvider = this._nodeLabelStyleProvider ?? createDefaultNodeLabelStyle

    graph.nodeLabels.forEach((label) => {
      const owner = label.owner
      if (
        owner instanceof INode &&
        this.visibleElements?.includes((owner.tag as DashboardEntry).id)
      ) {
        const style = showLabels
          ? (labelStyleProvider(getTag(label.owner) as DashboardEntry) ??
            ILabelStyle.VOID_LABEL_STYLE)
          : ILabelStyle.VOID_LABEL_STYLE

        graph.setStyle(label, style)
      }
    })

    this.graphComponent.invalidate()
  }

  /**
   * Determines whether labels should be visible based on current zoom level.
   *
   * @returns True if zoom >= LABEL_ZOOM_THRESHOLD
   */
  private shouldShowLabels(): boolean {
    const zoom = this.leafletMap?.getZoom()
    return zoom === undefined || zoom >= LABEL_ZOOM_THRESHOLD
  }

  /**
   * Runs automatic node label placement algorithm to minimize overlaps.
   *
   * @param graphComponent - Graph component containing labels
   * @param animated - Whether to animate the layout (default: false)
   * @returns Promise resolving when layout completes
   */
  private async runLabeling(graphComponent: GraphComponent, animated = false): Promise<void> {
    const labeling = new GenericLabeling({
      scope: 'node-labels',
      deterministic: true,
      reduceLabelOverlaps: true
    })

    const labelingData = new GenericLabelingData({
      nodeLabelingCosts: new LabelingCosts(LabelingOptimizationStrategy.LABEL_OVERLAPS)
    })

    await graphComponent.applyLayoutAnimated({
      layout: labeling,
      layoutData: labelingData,
      animateViewport: false,
      animationDuration: animated ? LABEL_ANIMATION_DURATION : 0
    })
  }

  /**
   * Adjusts Leaflet map viewport to show all visible filtered nodes.
   * Handles single node case separately with fixed zoom level.
   * Stops any in-progress pan/zoom before changing viewport.
   *
   * @param nodes - Array of nodes to fit in bounds
   */
  private fitMapToBounds(nodes: DashboardData['nodes']): void {
    if (!this.leafletMap) return

    // Extract valid coordinates from filtered nodes
    const coords = nodes
      .filter((n) => this.nodeFilter(n))
      .map((n) => n.location)
      .filter(
        (loc): loc is { lat: number; lng: number } =>
          loc !== undefined && (loc.lat !== 0 || loc.lng !== 0)
      )

    if (coords.length === 0) return

    // Stop any in-progress animation before changing viewport
    this.leafletMap.stop()

    // Special case: single node
    if (coords.length === 1) {
      this.leafletMap.setView([coords[0].lat, coords[0].lng], SINGLE_NODE_ZOOM, { animate: false })
      return
    }

    // Multiple nodes: fit bounds with padding
    const bounds = L.latLngBounds(coords.map((c) => [c.lat, c.lng] as [number, number]))
    this.leafletMap.fitBounds(bounds, {
      padding: FIT_BOUNDS_PADDING,
      maxZoom: FIT_BOUNDS_MAX_ZOOM,
      animate: false
    })
  }

  /**
   * Disables overlay display as filtered elements are dimmed instead.
   *
   * @returns Always false for map view
   */
  protected shouldShowOverlay(): boolean {
    return false
  }
}

customElements.define('map-view', MapViewComponent)
