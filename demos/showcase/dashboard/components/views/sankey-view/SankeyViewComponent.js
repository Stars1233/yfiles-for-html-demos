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
  EdgePortCandidates,
  EdgeStyleIndicatorRenderer,
  GradientStop,
  GraphItemTypes,
  HierarchicalLayout,
  HierarchicalLayoutData,
  HierarchicalLayoutNodeDescriptor,
  IEdge,
  IncrementalNodeHint,
  INode,
  NodeStyleIndicatorRenderer,
  PolylineEdgeStyle,
  ShapeNodeStyle,
  Stroke,
  StyleIndicatorZoomPolicy
} from '@yfiles/yfiles'
import { GraphViewBase } from '../graph-view-base'
import { NodeResizingStage } from './NodeResizingStage'
import styles from './sankey-view.css?inline'

const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(styles)

/**
 * A Sankey diagram visualization showing flow between nodes.
 * Edge thickness represents flow magnitude, parallel edges are merged with
 * aggregated flow values. Supports timeframe-based filtering and heat mapping.
 */
export class SankeyViewComponent extends GraphViewBase {
  /** Optional function to extract numeric flow value from edge data */
  flowProvider
  // Flag indicating layout should use incremental mode for smoother updates
  isIncremental = false
  // Current timeframe interval for flow calculations
  interval = null

  /**
   * Configures graph component with group padding and input mode.
   * Enables node tooltips for Sankey display.
   */
  configureGraphComponent(graphComponent) {
    super.configureGraphComponent(graphComponent)

    const graph = graphComponent.graph
    const inputMode = graphComponent.inputMode
    inputMode.toolTipItems = GraphItemTypes.NODE

    inputMode.itemHoverInputMode.enabled = true
    inputMode.itemHoverInputMode.hoverItems = GraphItemTypes.NODE | GraphItemTypes.EDGE
    inputMode.itemHoverInputMode.addEventListener('hovered-item-changed', (evt) => {
      const highlights = graphComponent.highlights
      highlights.clear()

      const item = evt.item
      if (item instanceof INode) {
        graph.edgesAt(item).forEach((edge) => {
          highlights.add(edge)
          highlights.add(edge.opposite(item))
        })
        highlights.add(item)
      } else if (item instanceof IEdge) {
        highlights.add(item)
        highlights.add(item.sourceNode)
        highlights.add(item.targetNode)
      }
    })

    graph.decorator.nodes.highlightRenderer.addFactory((node) => {
      const style = node.style
      return !graph.isGroupNode(node)
        ? new NodeStyleIndicatorRenderer({
            nodeStyle: new ShapeNodeStyle({
              stroke: new Stroke(style.stroke.fill, style.stroke.thickness + 5),
              fill: style.stroke.fill,
              shape: 'round-rectangle'
            }),
            margins: 10,
            zoomPolicy: 'world-coordinates'
          })
        : null
    })

    graph.decorator.nodes.selectionRenderer.addFactory((node) => {
      const isUnit = !graph.isGroupNode(node)
      return new NodeStyleIndicatorRenderer({
        zoomPolicy: 'mixed',
        margins: 5,
        nodeStyle: new ShapeNodeStyle({
          shape: `${isUnit ? 'round-rectangle' : 'rectangle'}`,
          cssClass: `${isUnit ? 'node-selection' : 'node-selection-dashed'}`
        })
      })
    })

    graph.decorator.edges.highlightRenderer.addFactory((edge) => {
      const edgeStyle = edge.style
      return new EdgeStyleIndicatorRenderer({
        edgeStyle: new PolylineEdgeStyle({
          stroke: new Stroke(edgeStyle.stroke.fill, edgeStyle.stroke.thickness + 3),
          smoothingLength: edgeStyle.smoothingLength
        }),
        zoomPolicy: StyleIndicatorZoomPolicy.WORLD_COORDINATES
      })
    })
  }

  /**
   * Initializes Sankey view with timeframe change listener.
   * Updates flow calculations and applies incremental layout on timeframe changes.
   */
  setupView(container) {
    super.setupView(container)
    this.adoptStyleSheet(styleSheet)

    // Listen for timeframe changes and trigger incremental layout update
    this.getRootNode().addEventListener('timeframe-changed', (evt) => {
      const customEvent = evt
      const timeFrameData = customEvent.detail
      if (timeFrameData) {
        this.timeFrameElements = timeFrameData.timeFrameElements
        this.interval = timeFrameData.interval
      } else {
        this.timeFrameElements = null
        this.interval = null
      }
      this.isIncremental = true
      this.onDataChanged(this.data)
    })
  }

  /**
   * Called when data changes.
   * Merges parallel edges, recalculates flow values, and applies layout.
   */
  onDataChanged(data, applyLayout = true) {
    super.onDataChanged(data, applyLayout)

    this.removeParallelEdges(this.graphComponent.graph)
    void this.runLayout().then(() => {
      this.isIncremental = false
      this.refreshOverlay()
    })
  }

  /**
   * Determines whether overlay should be shown.
   * Shows overlay when no data or graph is empty.
   *
   * @returns True if overlay should display
   */
  shouldShowOverlay() {
    return !this.data || !this.graphComponent || this.graphComponent.graph.nodes.size === 0
  }

  /**
   * Runs hierarchical left-to-right layout with node resizing.
   * Uses incremental mode flag for smooth timeframe updates.
   * Configures edge ports and routing for Sankey appearance.
   *
   * @returns Promise resolving when layout completes
   */
  async runLayout() {
    if (!this.graphComponent) return

    const layout = new HierarchicalLayout({
      layoutOrientation: 'left-to-right',
      groupAlignmentPolicy: 'top',
      nodeLabelPlacement: 'consider',
      fromSketchMode: this.isIncremental,
      defaultNodeDescriptor: { borderToPortGapRatio: 1 },
      defaultEdgeDescriptor: {
        routingStyleDescriptor: { defaultRoutingStyle: 'polyline' },
        minimumFirstSegmentLength: 80,
        minimumLastSegmentLength: 80
      }
    })

    // Add node resizing stage to adjust node widths based on edge flow
    const nodeResizingStage = new NodeResizingStage(layout)
    nodeResizingStage.layoutOrientation = layout.layoutOrientation
    nodeResizingStage.portBorderGapRatio = 1
    layout.layoutStages.prepend(nodeResizingStage)

    const layoutData = new HierarchicalLayoutData({
      // Edge thickness derived from stroke width
      edgeThickness: (edge) => {
        const style = edge.style
        return style.stroke?.thickness ?? 1
      },
      ports: {
        sourcePortCandidates: new EdgePortCandidates().addFreeCandidate('right'),
        targetPortCandidates: new EdgePortCandidates().addFreeCandidate('left')
      },
      nodeDescriptors: (node) => {
        const descriptor = new HierarchicalLayoutNodeDescriptor({ minimumDistance: 50 })
        if (this.graphComponent?.graph.isGroupNode(node)) {
          descriptor.minimumDistance = 100
        }
        return descriptor
      },
      // Use exact coordinates for incremental updates, compute for full layout
      incrementalNodeHints: () => IncrementalNodeHint.EXACT_COORDINATES,
      incrementalEdges: () => true
    })

    await this.graphComponent.applyLayoutAnimated({
      layout,
      animationDuration: this.isIncremental ? '0.2s' : '0s',
      layoutData,
      targetBoundsPadding: [0, 20, 0, 20]
    })
  }

  /**
   * Merges parallel edges (multiple edges between same nodes) into single edges.
   * Aggregates flow values and calculates edge thickness based on total flow.
   * Applies thickness range scaling from minFlow to maxFlow.
   *
   * @param graph - Graph to process
   */
  removeParallelEdges(graph) {
    const edgesToRemove = new Set()
    const edge2flow = new Map()

    // Group edges by target node for each source
    for (const node of graph.nodes) {
      const edgesByTarget = new Map()

      for (const edge of graph.outEdgesAt(node)) {
        const target = edge.targetNode
        const edges = edgesByTarget.get(target) ?? []
        edges.push(edge)
        edgesByTarget.set(target, edges)
      }

      // Merge parallel edges: keep first, remove rest, aggregate flow
      for (const [_, edges] of edgesByTarget) {
        const [masterEdge, ...duplicates] = edges

        // Calculate total flow across parallel edges
        const flow = this.flowProvider
          ? edges.reduce((sum, edge) => sum + this.flowProvider(edge.tag), 0)
          : edges.length

        edge2flow.set(masterEdge, flow)
        duplicates.forEach((edge) => edgesToRemove.add(edge))
      }
    }

    // Remove duplicate edges from graph
    for (const edge of edgesToRemove) {
      graph.remove(edge)
    }

    // Scale edge thickness based on flow value range
    const flows = Array.from(edge2flow.values())
    const minFlow = Math.min(...flows)
    const maxFlow = Math.max(...flows)
    const minThickness = 10
    const maxThickness = 200

    const getThickness = (flow) => {
      if (maxFlow === minFlow) {
        return flow > 1 ? maxThickness : minThickness
      }
      const scale = (maxThickness - minThickness) / (maxFlow - minFlow)
      return Math.round(minThickness + (flow - minFlow) * scale)
    }

    // Update edge styles with calculated thickness
    if (this.edgeStyleProvider) {
      for (const edge of graph.edges) {
        const flow = edge2flow.get(edge) ?? 1
        const thickness = getThickness(flow)
        graph.setStyle(edge, this.edgeStyleProvider(edge.tag, thickness))
      }
    }
  }

  /**
   * Indicates whether heat map should be displayed for this view.
   *
   * @returns Always true for Sankey
   */
  shouldAddHeatMap() {
    return true
  }

  /**
   * Applies heat provider to edges and nodes.
   * Uses in-edge count as secondary parameter for heat calculation.
   * Applies gradient from cool blue to hot pink/red.
   */
  applyHeatProvider() {
    if (this.heatMapRenderer) {
      const provider = (item) => {
        if (this.interval) {
          const edgeCount = this.graphComponent?.graph.inEdgesAt(item).size
          return this._heatProvider?.(item, edgeCount) ?? 0
        }
        return this._heatProvider?.(item) ?? 0
      }

      this.heatMapRenderer.nodeHeatProvider = provider
      this.heatMapRenderer.edgeHeatProvider = provider
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
   * Resets component to initial state, clearing all custom providers and intervals.
   */
  resetToDefaults() {
    super.resetToDefaults()
    this.flowProvider = undefined
    this.interval = null
  }
}

customElements.define('sankey-graph-view', SankeyViewComponent)
