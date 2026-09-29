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
import { DashboardViewBase } from '../dashboard-view-base'
import styles from './gauge-view.css?inline'
import { MultipleGaugeComponent } from './MultipleGaugeComponent'

const gaugeSheet = new CSSStyleSheet()
gaugeSheet.replaceSync(styles)

/**
 * A generic gauge visualization component for displaying node metrics in a grid layout.
 * Supports dynamic configuration, selection management, visibility filtering,
 * and timeframe-based edge count aggregation for group nodes.
 *
 * @template TData - Dashboard data type
 * @template TNode - Node data type for gauge rendering
 */
export class GaugeViewComponent extends DashboardViewBase {
  container = null
  resizeObserver = null
  nodeFilter = null
  configBuilder = null
  nodeIdExtractor = null
  // Map from node id to gauge card component for quick lookup
  cardMap = new Map()
  // Currently active timeframe element ids for edge filtering
  timeFrameElements = null
  // Cached nodes from last render
  nodes = []

  extraStyleSheets = []
  configTransformer

  /**
   * Configures the gauge view with node filtering, config building, and id extraction logic.
   * Triggers initial render after configuration.
   *
   * @param nodeFilter - Function to extract nodes from dashboard data
   * @param configBuilder - Function to build gauge config from a node
   * @param nodeIdExtractor - Function to extract unique id from a node
   */
  configure(nodeFilter, configBuilder, nodeIdExtractor) {
    this.nodeFilter = nodeFilter
    this.configBuilder = configBuilder
    this.nodeIdExtractor = nodeIdExtractor
    this.render()
  }

  get emptyMessage() {
    return null
  }

  createViewContainer() {
    const div = super.createViewContainer()
    div.id = 'multiple-gauge-container'
    return div
  }

  /**
   * Initializes the gauge view with event listeners and observers.
   * Sets up visibility tracking, selection management, resize observation,
   * and timeframe change handling.
   */
  setupView(container) {
    this.adoptStyleSheet(gaugeSheet)
    this.container = container

    // Listen for visibility and selection changes from parent dashboard
    this.watchVisibility({ added: () => this.render(true), removed: () => this.render(true) })
    this.watchSelection({
      added: () => this.updateGaugeState(true),
      removed: () => this.updateGaugeState(true)
    })

    // Re-render gauges when container size changes
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.render())
    })
    this.resizeObserver.observe(container)

    // Listen for timeframe changes and update edge counts
    this.getRootNode().addEventListener('timeframe-changed', (evt) => {
      const customEvent = evt
      const timeFrameData = customEvent.detail
      this.timeFrameElements = timeFrameData?.timeFrameElements ?? null
      this.updateConfigs()
    })

    this.render()
  }

  tearDownView() {
    this.container = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.cardMap.clear()
    this.timeFrameElements = null
    this.nodes = []
  }

  /**
   * Called when dashboard data changes.
   * Triggers full re-render of gauge grid.
   */
  onDataChanged(_data) {
    this.render()
  }

  /**
   * Renders the gauge grid from filtered nodes.
   * Creates gauge cards, sets up click handlers for selection management,
   * and applies visibility/selection state.
   */
  render(scrollToCard = false) {
    if (!this.container || !this.data || !this.nodeFilter || !this.configBuilder) return

    this.container.innerHTML = ''
    this.cardMap.clear()

    const gridContainer = document.createElement('div')
    gridContainer.className = 'multiple-gauge-grid'

    this.nodes = this.nodeFilter(this.data)

    const edgeCountByChildId = this.buildEdgeCountByChildId()

    this.nodes.forEach((node) => {
      const card = new MultipleGaugeComponent()
      card.adoptExtraStyleSheets(this.extraStyleSheets)

      const id = this.nodeIdExtractor(node)
      const config = this.buildConfig(node, edgeCountByChildId)
      card.setData(config)

      this.cardMap.set(id, card)

      // Handle gauge card selection by toggling node in dashboard selection
      card.addEventListener('click', () => {
        if (!this.selection) {
          return
        }
        this.data.nodes.forEach((entry) => {
          if (entry.id === id && !this.selection?.includes(entry)) {
            this.selection?.add(entry)
          } else {
            this.selection?.remove(entry)
          }
        })
      })

      gridContainer.appendChild(card)
    })

    this.container.appendChild(gridContainer)
    this.updateGaugeState(scrollToCard)
  }

  /**
   * Counts timeframe edges per node id (as source and target).
   * Used for edge count metrics in gauges, typically for group nodes.
   * Returns empty map when no timeframe is active.
   *
   * @returns Map of node id to edge count within current timeframe
   */
  buildEdgeCountByChildId() {
    const map = new Map()
    if (!this.timeFrameElements || !this.data?.edges) return map

    for (const edge of this.data.edges) {
      if (this.timeFrameElements.includes(edge.id)) {
        map.set(edge.source, (map.get(edge.source) ?? 0) + 1)
        map.set(edge.target, (map.get(edge.target) ?? 0) + 1)
      }
    }

    return map
  }

  /**
   * Builds gauge configuration with optional transformer applied.
   * For group nodes, aggregates edge counts across all child nodes.
   * Edges connect unit nodes (children), not the group itself, so we sum child counts.
   *
   * @param node - The node to build config for
   * @param edgeCountByChildId - Pre-computed edge counts for all children
   * @returns Final gauge configuration
   */
  buildConfig(node, edgeCountByChildId) {
    const baseConfig = this.configBuilder(node)

    // Only apply transformer if timeframe is active AND transformer exists
    if (!this.configTransformer || !this.timeFrameElements || !this.data?.nodes) {
      return baseConfig
    }

    const nodeId = this.nodeIdExtractor(node)

    // Sum edge counts across all children of this group node
    const children = this.data.nodes.filter((n) => n.parentId === nodeId)
    const edgeCount = children.reduce(
      (sum, child) => sum + (edgeCountByChildId.get(child.id) ?? 0),
      0
    )

    return this.configTransformer(node, edgeCount, baseConfig)
  }

  /**
   * Rebuilds gauge configs when the timeframe changes without doing
   * a full DOM re-render. Preserves card order and selection state.
   */
  updateConfigs() {
    if (!this.configBuilder || !this.nodeIdExtractor || this.nodes.length === 0) return

    const edgeCountByChildId = this.buildEdgeCountByChildId()

    this.nodes.forEach((node) => {
      const id = this.nodeIdExtractor(node)
      const card = this.cardMap.get(id)
      if (card) {
        const config = this.buildConfig(node, edgeCountByChildId)
        card.setData(config)
      }
    })
  }

  /**
   * Updates gauge visual state based on selection and visibility.
   * Applies selected/visible classes and scrolls first selected card into view.
   * Intelligently shows gauges when single type is visible.
   */
  updateGaugeState(scrollToCard = false) {
    if (!this.data) return

    const selected = new Set(
      this.selection?.toArray().map((e) => {
        if (this.nodeIdExtractor) return this.nodeIdExtractor(e)
        return e.id
      }) ?? []
    )

    // Determine visible gauge types including parent groups of visible children
    const visibleTypes = new Set(this.visibleElements)
    this.data.nodes
      .filter((node) => this.visibleElements?.includes(node.id) && !node.isGroup)
      .forEach((node) => {
        if (node.parentId) visibleTypes.add(node.parentId)
      })

    const hasSelection = selected.size > 0
    let firstSelected
    let firstVisible

    for (const [id, card] of this.cardMap) {
      const isSelected = hasSelection && selected.has(id)
      const isVisible = visibleTypes.has(id)
      card.setSelected(isSelected)
      card.setVisible(isVisible)

      if (isSelected) {
        firstSelected ??= card
      }
      if (isVisible) {
        firstVisible ??= card
      }
    }

    if (scrollToCard) {
      // Scroll only after an explicit selection or visibility change. Rendering caused by layout
      // changes, such as dashboard card reorganization, must not change the scroll position.
      const cardToScroll = hasSelection ? firstSelected : firstVisible
      cardToScroll?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  /**
   * Resets component to initial state, clearing all configuration and cached data.
   */
  resetToDefaults() {
    super.resetToDefaults()
    this.nodeFilter = null
    this.configBuilder = null
    this.nodeIdExtractor = null
    this.cardMap.clear()
    this.extraStyleSheets = []
    this.configTransformer = undefined
    this.timeFrameElements = null
    this.nodes = []
  }
}

customElements.define('gauge-view', GaugeViewComponent)
