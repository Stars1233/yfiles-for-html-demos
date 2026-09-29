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
import { PieChartViewComponent } from './PieChartViewComponent'
import styles from './multiple-pie.css?inline'

const sheet = new CSSStyleSheet()
sheet.replaceSync(styles)

/**
 * A carousel-style container displaying multiple pie charts in sequence.
 * Supports navigation between datasets, synchronized selection/visibility,
 * and timeframe-based value transformation. Auto-navigates to selected/visible
 * dataset when selection changes.
 */
export class MultiplePieChartViewComponent extends DashboardViewBase {
  container = null
  resizeObserver = null
  nodesFilter = null
  cardSetupBuilder = null
  datasetIdExtractor = null
  selectionIdExtractor = null
  // Currently active timeframe element ids for edge filtering
  timeFrameElements = null

  /**
   * Optional transformer for value providers during active timeframe.
   * Receives edge count and base provider for custom value computation.
   */
  timeFrameValueTransformer

  /** Optional custom selection matching logic for pie slices. */
  selectionMatcher

  // Pie chart instances
  pies = []
  // Filtered datasets from data
  datasets = []
  // Currently displayed dataset index
  currentIndex = 0

  // UI elements
  titleEl = null
  pieWrapper = null
  prevButton = null
  nextButton = null
  counterEl = null

  /**
   * Configures the pie chart carousel with filtering and setup logic.
   * Triggers initial render if data is available.
   *
   * @param nodesFilter - Function to split data into pie chart datasets
   * @param cardSetupBuilder - Function to build config for each dataset
   * @param datasetIdExtractor - Optional function to extract dataset identifier for auto-navigation
   * @param selectionIdExtractor - Optional function to extract selection identifier for matching
   */
  configure(nodesFilter, cardSetupBuilder, datasetIdExtractor, selectionIdExtractor) {
    this.nodesFilter = nodesFilter
    this.cardSetupBuilder = cardSetupBuilder
    this.datasetIdExtractor = datasetIdExtractor ?? null
    this.selectionIdExtractor = selectionIdExtractor ?? null
    if (this.data) {
      this.datasets = this.nodesFilter(this.data)
      this.render()
    }
  }

  get emptyMessage() {
    return null
  }

  /**
   * Creates the view container with pie-chart styling.
   *
   * @returns HTMLElement configured as pie chart container
   */
  createViewContainer() {
    const div = super.createViewContainer()
    div.className = 'pie-chart'
    return div
  }

  /**
   * Initializes the pie carousel with layout, event listeners, and observers.
   * Sets up visibility/selection forwarding and timeframe change handling.
   */
  setupView(container) {
    this.adoptStyleSheet(sheet)
    this.container = container

    // Forward selection/visibility state to all pie charts
    const forwardState = () => this.forwardState()
    this.watchVisibility({ added: forwardState, removed: forwardState })
    this.watchSelection({ added: forwardState, removed: forwardState })

    // Re-render when container resizes
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.render())
    })
    this.resizeObserver.observe(container)

    // Listen for timeframe changes and update value providers
    this.getRootNode().addEventListener('timeframe-changed', (evt) => {
      const customEvent = evt
      const timeFrameData = customEvent.detail
      this.timeFrameElements = timeFrameData?.timeFrameElements ?? null
      this.updateValueProviders()
    })

    this.buildLayout()
    this.render()
  }

  /**
   * Updates value providers in all pie charts when timeframe changes.
   * Resets known types and applies timeframe-aware providers.
   */
  updateValueProviders() {
    if (!this.cardSetupBuilder) return
    this.pies.forEach((pie, i) => {
      const setup = this.cardSetupBuilder(this.datasets[i])
      pie.resetKnownTypes()
      pie.valueProvider = this.buildValueProvider(setup.valueProvider)
    })
  }

  /**
   * Builds a value provider that optionally applies timeframe transformation.
   * Aggregates edge counts for nodes within the active timeframe and
   * applies custom transformer if available.
   *
   * @param baseProvider - Base value provider function
   * @returns Value provider with optional timeframe transformation
   */
  buildValueProvider(baseProvider) {
    const timeFrameIds = this.timeFrameElements
    if (!timeFrameIds || !this.timeFrameValueTransformer || !this.data) return baseProvider
    const transformer = this.timeFrameValueTransformer

    // Build edge count map for timeframe elements
    const edgeCountByNodeId = new Map()
    for (const edge of this.data.edges) {
      if (timeFrameIds.includes(edge.id)) {
        edgeCountByNodeId.set(edge.source, (edgeCountByNodeId.get(edge.source) ?? 0) + 1)
        edgeCountByNodeId.set(edge.target, (edgeCountByNodeId.get(edge.target) ?? 0) + 1)
      }
    }

    return (node) => {
      const edgeCount = edgeCountByNodeId.get(node.id) ?? 0
      return transformer(node, edgeCount, baseProvider)
    }
  }

  tearDownView() {
    this.container = null
    this.pies = []
    this.datasets = []
    this.currentIndex = 0
    this.titleEl = null
    this.pieWrapper = null
    this.prevButton = null
    this.nextButton = null
    this.counterEl = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.timeFrameElements = null
  }

  /**
   * Called when dashboard data changes.
   * Recomputes datasets and re-renders carousel.
   */
  onDataChanged(data) {
    if (!data || !this.nodesFilter) return
    // Compute datasets once when data changes
    this.datasets = this.nodesFilter(data)
    this.render()
  }

  /**
   * Forwards current selection and visibility state to all pie charts.
   * Navigates to matching dataset if available.
   */
  forwardState() {
    this.pies.forEach((pie) => {
      pie.selection = this.selection
      pie.visibleElements = this.visibleElements
    })
    this.navigateToSelection()
  }

  /**
   * Auto-navigates carousel to dataset matching current selection or visible elements.
   * Priority: exact selection match > visible element's parent dataset > deselect.
   */
  navigateToSelection() {
    if (!this.datasetIdExtractor || !this.selectionIdExtractor || !this.data) return
    const selected = this.selection?.toArray()
    const visibleIds = this.visibleElements?.toArray() ?? []
    const visibleEntries = visibleIds
      .map((id) => this.data.nodes.find((n) => n.id === id))
      .filter((entry) => entry !== undefined)

    // Check if selection matches a dataset directly
    if (selected && selected.length > 0) {
      const selectedIds = new Set(selected.map((e) => this.selectionIdExtractor(e)))
      const index = this.datasets.findIndex((dataset) => {
        const datasetId = this.datasetIdExtractor(dataset)
        return selectedIds.has(datasetId)
      })

      if (index !== -1) {
        this.classList.add('pie-card--selected')
        if (index !== this.currentIndex) {
          this.currentIndex = index
          this.showCurrent()
        }
        return
      }
    }

    // Check if visible elements match a dataset's parent
    if (visibleEntries.length > 0) {
      const visibleParentIds = new Set()
      visibleEntries.forEach((entry) => {
        if (entry.parentId) {
          visibleParentIds.add(String(entry.parentId))
        }
      })

      const index = this.datasets.findIndex((dataset) =>
        visibleParentIds.has(this.datasetIdExtractor(dataset))
      )

      if (index !== -1) {
        this.classList.add('pie-card--selected')
        if (index !== this.currentIndex) {
          this.currentIndex = index
          this.showCurrent()
        }
        return
      }
    }

    // No match: deselect
    this.classList.remove('pie-card--selected')
  }

  /**
   * Builds the carousel UI with navigation controls and pie wrapper.
   * Creates prev/next buttons, counter display, and title/pie container.
   */
  buildLayout() {
    if (!this.container) return

    this.container.innerHTML = ''

    // Build navigation bar
    const nav = document.createElement('div')
    nav.className = 'pie-nav'

    this.prevButton = document.createElement('button')
    this.prevButton.className = 'pie-nav__button icon'
    this.prevButton.title = 'Previous'
    this.prevButton.textContent = 'keyboard_arrow_left'
    this.prevButton.addEventListener('click', () => this.navigate(-1))

    this.counterEl = document.createElement('span')
    this.counterEl.className = 'pie-nav__counter'

    this.nextButton = document.createElement('button')
    this.nextButton.className = 'pie-nav__button icon'
    this.nextButton.title = 'Next'
    this.nextButton.textContent = 'keyboard_arrow_right'
    this.nextButton.addEventListener('click', () => this.navigate(1))

    nav.appendChild(this.prevButton)
    nav.appendChild(this.counterEl)
    nav.appendChild(this.nextButton)

    // Build title and pie wrapper
    this.titleEl = document.createElement('div')
    this.titleEl.className = 'pie-card-title'

    this.pieWrapper = document.createElement('div')
    this.pieWrapper.className = 'pie-wrapper'

    this.container.appendChild(nav)
    this.container.appendChild(this.titleEl)
    this.container.appendChild(this.pieWrapper)
  }

  /**
   * Navigates carousel by offset, respecting boundaries.
   * Disables navigation at start/end of datasets.
   *
   * @param direction - Navigation direction (-1 or 1)
   */
  navigate(direction) {
    const next = this.currentIndex + direction
    if (next < 0 || next >= this.datasets.length) return
    this.currentIndex = next
    this.showCurrent()
  }

  /**
   * Displays the current dataset's pie chart.
   * Updates counter, disables nav buttons at boundaries, sets title.
   */
  showCurrent() {
    if (!this.pieWrapper || !this.titleEl || !this.counterEl) return

    const total = this.datasets.length
    const current = this.currentIndex

    // Update counter display
    this.counterEl.textContent = `${current + 1}/${total}`

    // Disable nav buttons at boundaries
    if (this.prevButton) this.prevButton.disabled = current === 0
    if (this.nextButton) this.nextButton.disabled = current === total - 1

    // Update title from setup
    const setup = this.cardSetupBuilder(this.datasets[current])
    this.titleEl.textContent = setup.title ?? ''
    this.titleEl.style.display = setup.title ? '' : 'none'

    // Show only current pie chart
    this.pies.forEach((pie, i) => {
      pie.style.display = i === current ? 'block' : 'none'
    })
  }

  /**
   * Renders all pie charts in the carousel.
   * Creates pie instances, applies configurations, and initializes visibility.
   */
  render() {
    if (
      !this.container ||
      !this.data ||
      !this.cardSetupBuilder ||
      !this.pieWrapper ||
      this.datasets.length === 0
    )
      return

    this.pies = []
    this.pieWrapper.innerHTML = ''

    // Clamp current index to valid range
    this.currentIndex = Math.min(this.currentIndex, Math.max(0, this.datasets.length - 1))

    // Create pie chart for each dataset
    this.datasets.forEach((slicedData) => {
      const setup = this.cardSetupBuilder(slicedData)

      const pie = new PieChartViewComponent()
      pie.style.display = 'none'
      pie.style.width = '100%'
      pie.style.height = '100%'
      pie.style.flex = '1 1 0'
      pie.style.minHeight = '0'
      pie.style.overflow = 'hidden'

      // Apply timeframe-aware value provider
      pie.valueProvider = this.buildValueProvider(setup.valueProvider)
      pie.groupKeyProvider = setup.groupKeyProvider
      if (setup.colorProvider) pie.colorProvider = setup.colorProvider
      if (this.selectionMatcher) pie.selectionMatcher = this.selectionMatcher

      pie.data = slicedData
      pie.selection = this.selection
      pie.visibleElements = this.visibleElements

      this.pieWrapper.appendChild(pie)
      this.pies.push(pie)
    })

    this.showCurrent()
  }

  /**
   * Resets component to initial state, clearing all configuration and datasets.
   */
  resetToDefaults() {
    super.resetToDefaults()
    this.nodesFilter = null
    this.cardSetupBuilder = null
    this.datasets = []
    this.selectionMatcher = undefined
    this.timeFrameValueTransformer = undefined
    this.timeFrameElements = null
  }
}

customElements.define('multiple-pie-chart-view', MultiplePieChartViewComponent)
