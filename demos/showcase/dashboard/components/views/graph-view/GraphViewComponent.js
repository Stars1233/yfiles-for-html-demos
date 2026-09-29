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
  Animator,
  BridgeCrossingStyle,
  BridgeManager,
  GradientStop,
  GraphObstacleProvider,
  GridComponentDescriptor,
  HierarchicalLayout,
  HierarchicalLayoutData,
  HierarchicalLayoutEdgeDescriptor,
  HierarchicalLayoutRoutingStyle,
  Insets,
  LabelStyle,
  PolylineEdgeStyle,
  RoutingStyleDescriptor,
  ShapeNodeStyle,
  Size,
  StretchNodeLabelModel,
  TemporaryGroupDescriptor,
  TemporaryGroupInsertionData,
  TemporaryGroupInsertionStage
} from '@yfiles/yfiles'
import { GraphViewBase } from '../graph-view-base'
import styles from './graph-view.css?inline'

const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(styles)

/**
 * A yFiles-based graph visualization component supporting hierarchical layouts,
 * heat map rendering, edge bridges, and dynamic topology filtering.
 * Automatically animates layout transitions and interpolates heat values over time.
 */
export class GraphViewComponent extends GraphViewBase {
  time = 0

  /**
   * Initializes a new instance of the GraphViewComponent.
   * Sets up default node/edge styling and layout configuration.
   */
  constructor() {
    super()

    // Configure node styling
    this.nodeStyleProvider = (dataItem) =>
      new ShapeNodeStyle({ cssClass: `node ${dataItem.type.toLowerCase()}`, shape: 'ellipse' })
    this.nodeSizeProvider = new Size(288, 138)

    // Configure node label styling
    this.nodeLabelStyleProvider = (_dataItem) =>
      new LabelStyle({
        verticalTextAlignment: 'center',
        horizontalTextAlignment: 'center',
        wrapping: 'wrap-word',
        cssClass: 'label'
      })
    this.nodeLabelLayoutParameterProvider = (_dataItem) => StretchNodeLabelModel.CENTER

    // Configure edge styling
    this.edgeStyleProvider = (_dataItem) =>
      new PolylineEdgeStyle({
        smoothingLength: 10,
        stroke: '6px solid currentColor',
        cssClass: 'edge'
      })
  }

  static get observedAttributes() {
    return ['layout']
  }

  /**
   * Called when the element is connected to the DOM.
   * Initializes graph component and applies component styles.
   */
  setupView(container) {
    super.setupView(container)
    this.adoptStyleSheet(styleSheet)
  }

  /**
   * Called when an observed attribute changes.
   * Triggers layout recalculation when layout attribute changes.
   *
   * @param name - The attribute name
   * @param oldValue - The old attribute value
   * @param newValue - The new attribute value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'layout' && oldValue !== newValue && this.graphComponent) {
      void this.runLayout()
    }
  }

  /**
   * Configures the yFiles graph component with bridge support for edge crossings.
   * Sets up obstacle detection to handle edge routing around nodes.
   */
  configureGraphComponent(graphComponent) {
    super.configureGraphComponent(graphComponent)

    // Enable bridge crossing style for cleaner edge rendering
    const bridgeManager = new BridgeManager({
      canvasComponent: graphComponent,
      defaultBridgeCrossingStyle: BridgeCrossingStyle.GAP
    })
    bridgeManager.addObstacleProvider(new GraphObstacleProvider())
  }

  /**
   * Called when dashboard data changes.
   * Applies layout without animation on initial load, then animates heat values over time.
   *
   * @param data - The new dashboard data
   * @param applyLayout - Whether to apply layout (default: true)
   */
  async onDataChanged(data, applyLayout = true) {
    super.onDataChanged(data, applyLayout)

    if (applyLayout) {
      // Disable animation on data load to avoid timing/fitting conflicts
      const previousAnimateLayout = this.animateLayout
      this.animateLayout = false

      void this.runLayout().then(() => {
        this.animateLayout = previousAnimateLayout
        this.refreshOverlay()
      })
    }

    // Animate time parameter for smooth heat map interpolation during transitions
    if (this.graphComponent) {
      await new Animator(this.graphComponent).animate({
        callback: (time) => {
          this.time = time
        },
        duration: 1000
      })
      this.graphComponent.updateVisual()
    }
  }

  /**
   * Runs the hierarchical layout algorithm on the current graph.
   * Uses left-to-right orientation with stage-based layout processing.
   *
   * @returns Promise resolving when layout completes
   */
  async runLayout() {
    await this.graphComponent?.applyLayoutAnimated(
      this.createLayout(),
      this.animateLayout ? '1s' : 0,
      this.createLayoutData(this.graphComponent.graph)
    )
  }

  /**
   * Creates the hierarchical layout algorithm with custom configuration.
   * Includes temporary group insertion stage for distributor grouping.
   *
   * @returns Configured layout algorithm
   */
  createLayout() {
    const hierarchicalLayout = new HierarchicalLayout({
      layoutOrientation: 'left-to-right',
      nodeToEdgeDistance: 50,
      minimumLayerDistance: 80
    })
    hierarchicalLayout.layoutStages.prepend(new TemporaryGroupInsertionStage())
    return hierarchicalLayout
  }

  /**
   * Creates layout data with electricity-specific constraints and grouping.
   * Groups producers, distributors, and consumers into layers.
   * Creates temporary groups for improved layout organization.
   *
   * @param graph - The graph to layout
   * @returns Combined layout data for hierarchical and temporary group stages
   */
  createLayoutData(graph) {
    // Helper functions to classify node types
    function isProducer(node) {
      return node.tag.type.startsWith('producer')
    }
    function isDistributor(node) {
      return node.tag.type.startsWith('distributor')
    }
    function isConsumer(node) {
      return node.tag.type.startsWith('consumer')
    }

    // Configure hierarchical layout rules
    const hierarchicalLayoutData = new HierarchicalLayoutData({
      nodeTypes: (node) => node.tag.type,
      nodeMargins: (_) => new Insets(20),
      edgeDescriptors: (edge) => {
        // Use octilinear routing for distributor-to-distributor edges
        if (isDistributor(edge.sourceNode) && isDistributor(edge.targetNode)) {
          return new HierarchicalLayoutEdgeDescriptor({
            minimumDistance: 80,
            routingStyleDescriptor: new RoutingStyleDescriptor({
              routingStyle: HierarchicalLayoutRoutingStyle.OCTILINEAR
            })
          })
        }
        return new HierarchicalLayoutEdgeDescriptor({
          routingStyleDescriptor: new RoutingStyleDescriptor({
            routingStyle: HierarchicalLayoutRoutingStyle.OCTILINEAR
          })
        })
      },
      // Group consumers by their source producer
      targetGroupIds: (edge) => {
        if (isProducer(edge.sourceNode)) {
          return `target ${edge.targetNode.tag.id}`
        }
        return null
      }
    })

    // Place distributors in same layer for horizontal alignment
    graph.edges.forEach((edge) => {
      if (isDistributor(edge.sourceNode) && isDistributor(edge.targetNode)) {
        hierarchicalLayoutData.layerConstraints.placeInSameLayer(edge.sourceNode, edge.targetNode)
      }
    })

    // Create grid structure for consumer connections from distributors
    const consumerGrid = hierarchicalLayoutData.gridComponents.add(
      new GridComponentDescriptor({ maximumNodesBeforeBus: 1, maximumNodesAfterBus: 1 })
    )
    consumerGrid.source = graph.edges.filter(
      (edge) => isDistributor(edge.sourceNode) && isConsumer(edge.targetNode)
    )

    // Create temporary groups for visual organization
    const temporaryGroupInsertionLayoutData = new TemporaryGroupInsertionData()
    const temporaryDistributorGroup = temporaryGroupInsertionLayoutData.temporaryGroups.add(
      new TemporaryGroupDescriptor({ margins: new Insets(0, 260, 0, 260) })
    )

    // Group all distributors and their consumer branches
    graph.nodes.forEach((node) => {
      if (isDistributor(node)) {
        temporaryDistributorGroup.items.add(node)

        // Create sub-group for each distributor's consumers
        const temporaryGroup = temporaryGroupInsertionLayoutData.temporaryGroups.add(
          new TemporaryGroupDescriptor({ margins: new Insets(40, 0, 40, 0) })
        )
        temporaryGroup.items = graph
          .outEdgesAt(node)
          .filter((edge) => isConsumer(edge.targetNode))
          .map((edge) => edge.targetNode)
      }
    })

    return hierarchicalLayoutData.combineWith(temporaryGroupInsertionLayoutData)
  }

  /**
   * Determines whether tooltips should be shown based on zoom level.
   * Hides tooltips when zoomed out below 70% to reduce visual clutter.
   *
   * @returns True if zoom level is >= 0.7
   */
  shouldShowTooltips() {
    return (this.graphComponent?.zoom ?? 1) < 0.7
  }

  /**
   * Determines whether to display the empty state overlay.
   * Shows overlay when no data loaded or graph is empty.
   *
   * @returns True if graph component unavailable or has no nodes
   */
  shouldShowOverlay() {
    return !this.data || !this.graphComponent || this.graphComponent.graph.nodes.size === 0
  }

  /**
   * Indicates whether heat map visualization should be enabled for this view.
   *
   * @returns Always true for graph view
   */
  shouldAddHeatMap() {
    return true
  }

  /**
   * Applies heat provider function to render edge/node heatmaps.
   * Uses interpolated time value for smooth transitions.
   * Configures gradient colors from cool (blue) to hot (pink/red).
   */
  applyHeatProvider() {
    if (this.heatMapRenderer) {
      // Create provider that interpolates heat values based on animation time
      const provider = (item) => {
        return this._heatProvider?.(item, this.time) ?? 0
      }
      this.heatMapRenderer.nodeHeatProvider = provider
      this.heatMapRenderer.edgeHeatProvider = provider
      // Configure gradient colors: cool blue → hot pink/red
      this.heatMapRenderer.gradient = [
        new GradientStop('#a8c5e8', 0),
        new GradientStop('#5b8def', 0.35),
        new GradientStop('#7c3aed', 0.7),
        new GradientStop('#a21caf', 1)
      ]
      this.graphComponent?.invalidate()
    }
  }

  /**
   * Refreshes the graph visualization without re-applying layout.
   * Updates visuals based on current data state.
   */
  refresh() {
    if (this.initialized) {
      void this.onDataChanged(this._data, false)
    }
  }
}

customElements.define('graph-view', GraphViewComponent)
