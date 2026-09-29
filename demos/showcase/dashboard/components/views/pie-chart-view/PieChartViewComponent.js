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
/**
 * A donut chart that groups and aggregates dashboard entries by type with customizable colors.
 * It intelligently handles labels with auto-wrapping and overlap resolution, displays dynamic center
 * content on hover or when zero-value items are selected, and supports interactive slicing through clicks.
 * The component respects dashboard selection and filtering states with smart opacity handling, dims when
 * selected items have no value, and uses efficient mutable state objects to enable smooth transitions
 * between data changes.
 */
import { formatLabel } from '../../../types'
import { DashboardViewBase } from '../dashboard-view-base'
import * as d3 from 'd3'
import styles from './pie-chart-view.css?inline'

const pieSheet = new CSSStyleSheet()
pieSheet.replaceSync(styles)

/** Default color palette for pie slices */
const DEFAULT_COLORS = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac'
]

// ============================================================================
// Label/geometry tuning constants
// ============================================================================
const FONT_SIZE = 11
const LINE_HEIGHT = 12
const LABEL_GAP_Y = 1
const VIEW_PAD = 2
const MIN_RADIUS = 56
const DONUT_INNER_RATIO = 0.55
const ELBOW_OFFSET = 4
const LABEL_OFFSET = 16
const MAX_LABEL_WIDTH_MIN = 45
const MAX_LABEL_WIDTH_MAX = 95
const MAX_LABEL_WIDTH_RATIO = 0.18
const TRANSITION_MS = 600

export class PieChartViewComponent extends DashboardViewBase {
  _valueProvider
  /** Function to group entries by category (default: entry.type) */
  groupKeyProvider
  /** Function to determine slice colors (default: palette) */
  colorProvider
  /** Optional predicate to filter entries before aggregation */
  filter
  /** Optional custom selection matching for complex selection logic */
  selectionMatcher

  container = null
  resizeObserver = null

  svg = null
  root = null

  // Mutable state objects updated in place during transitions
  // Maps type string to current arc angles
  arcStateByType = new Map()
  // Maps type string to current label positions
  labelStateByType = new Map()

  // All types ever seen in insertion order (prevents slice set from shrinking)
  knownTypes = []

  defaultValueProvider = () => 1
  defaultGroupKeyProvider = (node) => node.type

  /**
   * Gets or sets the value provider function.
   * Setting triggers re-render with new aggregation.
   */
  get valueProvider() {
    return this._valueProvider
  }

  set valueProvider(provider) {
    this._valueProvider = provider
    this.render()
  }

  get emptyMessage() {
    return null
  }

  /**
   * Clears known type tracking and state maps.
   * Call when changing data source to force re-initialization of states.
   */
  resetKnownTypes() {
    this.knownTypes = []
    this.arcStateByType.clear()
    this.labelStateByType.clear()
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
   * Initializes the pie chart with event listeners and observers.
   * Re-renders on visibility/selection changes and container resize.
   */
  setupView(container) {
    this.adoptStyleSheet(pieSheet)
    this.container = container

    // Re-render on visibility changes and selection changes
    const rerender = () => this.render()
    this.watchVisibility({ added: rerender, removed: rerender })
    this.watchSelection({ added: rerender, removed: rerender })

    // Re-render on resize to keep chart responsive
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.render())
    })
    this.resizeObserver.observe(container)
  }

  tearDownView() {
    this.container = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.svg = null
    this.root = null
    this.arcStateByType.clear()
    this.labelStateByType.clear()
    this.knownTypes = []
  }

  /**
   * Called when dashboard data changes.
   * Triggers re-aggregation and re-render.
   */
  onDataChanged(data) {
    if (!data) return
    this.render()
  }

  /**
   * Resets component to initial state, clearing all custom providers.
   */
  resetToDefaults() {
    super.resetToDefaults()
    this._valueProvider = undefined
    this.groupKeyProvider = undefined
    this.colorProvider = undefined
    this.filter = undefined
    this.selectionMatcher = undefined
  }

  /**
   * Main render pipeline orchestration:
   * 1. Compute responsive layout from container dimensions
   * 2. Aggregate and filter data into pie slices
   * 3. Build pie arcs with proper angle calculations
   * 4. Compute selection state and opacity
   * 5. Measure and position labels with overlap resolution
   * 6. Draw SVG elements with transitions
   * 7. Attach interaction handlers
   */
  render() {
    if (!this.container || !this.data) return

    const sel = d3.select(this.container)
    const layout = this.computeLayout()
    if (!layout) return

    // Apply defaults if properties not set
    const groupKeyProvider = this.groupKeyProvider ?? this.defaultGroupKeyProvider
    const valueProvider = this._valueProvider ?? this.defaultValueProvider

    // Compute ALL grouped data before filtering (for color/state tracking)
    const allGroupedData = this.computeGroupedData(this.data.nodes, valueProvider, groupKeyProvider)
    // Filter and group data for display
    const filteredData = this.filter ? this.data.nodes.filter(this.filter) : this.data.nodes
    const filteredGroupedData = this.computeGroupedData(
      filteredData,
      valueProvider,
      groupKeyProvider
    )

    if (allGroupedData.length === 0) return

    // Track types with non-zero flow for consistent color assignment
    for (const d of allGroupedData) {
      if (d.flow > 0 && !this.knownTypes.includes(d.type)) {
        this.knownTypes.push(d.type)
      }
    }

    // Build stable data array using known types (preserves order)
    const stableData = this.buildStableData(filteredGroupedData)
    const arcs = this.buildArcs(stableData)
    const visibleArcs = arcs.filter((a) => a.data.flow > 0)

    // Compute selection state from current dashboard selection
    const pieState = this.computePieState(visibleArcs, allGroupedData, groupKeyProvider)
    this.updateDimmedState(pieState)

    // Compute label positions with overlap resolution
    const labels = this.computeLabels(visibleArcs, arcs, layout)
    this.resolveOverlaps(
      labels.filter((l) => l.side === 'right'),
      layout
    )
    this.resolveOverlaps(
      labels.filter((l) => l.side === 'left'),
      layout
    )

    // Create/update SVG and root group
    const svg = this.getOrCreateSvg(sel, layout)
    const root = this.getOrCreateRoot(svg, layout)

    root
      .interrupt('layout')
      .transition('layout')
      .duration(TRANSITION_MS)
      .ease(d3.easeCubicInOut)
      .attr('transform', `translate(${layout.cx},${layout.cy})`)

    const opacityFn = this.makeOpacityFn(pieState)

    // Draw all chart elements with transitions
    const slices = this.drawSlices(
      root,
      arcs,
      filteredData,
      groupKeyProvider,
      opacityFn,
      pieState.selectedTypes,
      layout
    )

    const { centerLabel, centerValue } = this.drawCenterText(root)
    const labelItems = this.drawLabels(root, labels, filteredData, groupKeyProvider, opacityFn)

    // Attach interaction handlers for hover and click
    this.setupInteractions({
      svg,
      slices,
      labelItems,
      centerLabel,
      centerValue,
      groupKeyProvider,
      pieState,
      opacityFn,
      allGroupedData
    })

    // Initialize center content based on selection state
    this.updateCenterContent(centerLabel, centerValue, null, pieState, allGroupedData)
  }

  /**
   * Builds stable data array by iterating known types.
   * Fills in zero flows for types not present in filtered data.
   *
   * @param filteredGroupedData - Grouped data from filtered entries
   * @returns Stable array with all known types in consistent order
   */
  buildStableData(filteredGroupedData) {
    const flowByType = new Map(filteredGroupedData.map((d) => [d.type, d.flow]))
    return this.knownTypes.map((type) => ({ type, flow: flowByType.get(type) ?? 0 }))
  }

  /**
   * Groups raw entries into {type, flow} buckets using D3 rollup.
   *
   * @param data - Entries to aggregate
   * @param valueProvider - Function extracting numeric value per entry
   * @param groupKeyProvider - Function extracting category per entry
   * @returns Array of grouped data with type and summed flow
   */
  computeGroupedData(data, valueProvider, groupKeyProvider) {
    return Array.from(
      d3.rollup(
        data,
        (v) => d3.sum(v, (d) => valueProvider(d)),
        (d) => groupKeyProvider(d)
      ),
      ([type, flow]) => ({ type, flow })
    )
  }

  /**
   * Builds pie arc data from grouped flows using D3 pie layout.
   * Only includes positive flows in calculations.
   *
   * @param stableData - Grouped data array
   * @returns Array of arc objects with angle information
   */
  buildArcs(stableData) {
    const pie = d3
      .pie()
      .value((d) => Math.max(0, d.flow))
      .sort(null)

    return pie(stableData)
  }

  /**
   * Computes selected and visible type sets from dashboard selection/visibility.
   * Used for opacity calculations and center content.
   *
   * @param visibleArcs - Arcs with non-zero flow
   * @param allGroupedData - All grouped data for fallback lookup
   * @param groupKeyProvider - Function to extract type from entries
   * @returns PieState with selected/visible types and all grouped data
   */
  computePieState(visibleArcs, allGroupedData, groupKeyProvider) {
    const visibleTypes = new Set()
    const selectedTypes = new Set()

    // Collect visible types from visibleElements
    if (this.visibleElements && this.visibleElements.size > 0) {
      this.visibleElements.forEach((id) => {
        const node = this.data?.nodes.find((d) => d.id === id)
        if (node) {
          visibleTypes.add(groupKeyProvider(node))
        }
      })
    }

    // Collect selected types from selection
    if (this.selection && this.selection.size > 0) {
      const selectionArray = this.selection.toArray()
      const matchesSlice = (entry, sliceType) => {
        if (this.selectionMatcher) {
          return this.selectionMatcher(entry, sliceType, this.data.nodes)
        }
        return groupKeyProvider(entry) === sliceType
      }
      visibleArcs.forEach((arc) => {
        if (selectionArray.some((entry) => matchesSlice(entry, arc.data.type))) {
          selectedTypes.add(arc.data.type)
        }
      })
    }
    return { selectedTypes: [...selectedTypes], visibleTypes: [...visibleTypes], allGroupedData }
  }

  /**
   * Dims the pie card when selected items have zero value.
   * Applies pie-card--dimmed CSS class for visual feedback.
   *
   * @param pieState - Current selection/visibility state
   */
  updateDimmedState(pieState) {
    const groupKeyProvider = this.groupKeyProvider ?? this.defaultGroupKeyProvider

    // Only dim if selection exists and all selected types are zero-value
    let shouldDim = false

    if (this.selection && this.selection.size > 0) {
      const selectionArray = this.selection.toArray()
      const selectedTypes = new Set(selectionArray.map((e) => groupKeyProvider(e)))

      const anyPositiveValue = Array.from(selectedTypes).some(
        (type) => (pieState.allGroupedData.find((g) => g.type === type)?.flow ?? 0) > 0
      )

      shouldDim = !anyPositiveValue
    }

    this.classList.toggle('pie-card--dimmed', shouldDim)
  }

  /**
   * Creates opacity function based on selected/visible types.
   * Returns reduced opacity for items outside visible/selected sets.
   *
   * @param pieState - Current selection/visibility state
   * @returns Function mapping PieChartData to opacity (0-1)
   */
  makeOpacityFn(pieState) {
    const visible = new Set(pieState.visibleTypes)
    const selected = new Set(pieState.selectedTypes)

    return (data) => {
      if (data.flow <= 0) {
        return 0
      }
      if (visible.has(data.type) || selected.has(data.type)) {
        return 1
      }
      return 0.35
    }
  }

  /**
   * Computes responsive layout from container dimensions.
   * All positioning is derived from these values.
   *
   * @returns LayoutConfig or null if container has zero size
   */
  computeLayout() {
    const { width, height } = this.container.getBoundingClientRect()
    if (width === 0 || height === 0) return null

    const radius = Math.max(MIN_RADIUS, Math.min(width, height) * 0.36)
    const donutInnerRadius = radius * DONUT_INNER_RATIO
    const leaderStartRadius = donutInnerRadius + (radius - donutInnerRadius) * 0.5
    const elbowRadius = radius + ELBOW_OFFSET
    const elbowX = radius + ELBOW_OFFSET
    const labelX = radius + LABEL_OFFSET

    const maxLabelWidth = Math.max(
      MAX_LABEL_WIDTH_MIN,
      Math.min(MAX_LABEL_WIDTH_MAX, width * MAX_LABEL_WIDTH_RATIO)
    )

    return {
      width,
      height,
      cx: width / 2,
      cy: height * 0.47,
      radius,
      donutInnerRadius,
      leaderStartRadius,
      elbowRadius,
      elbowX,
      labelX,
      maxLabelWidth,
      yMin: -height / 2 + VIEW_PAD,
      yMax: height / 2 - VIEW_PAD
    }
  }

  /**
   * Computes label positions from measured text and layout geometry.
   * Calculates leader line start/end points and label anchor coordinates.
   * Note: Actual vertical overlap adjustment happens in resolveOverlaps().
   *
   * @param visibleArcs - Arcs with non-zero flow to label
   * @param allArcs - All arcs for color index lookup
   * @param layout - Layout configuration with positioning constants
   * @returns Array of SliceLabel with computed leader and text positions
   */
  computeLabels(visibleArcs, allArcs, layout) {
    const measured = this.measureLabels(visibleArcs, layout.maxLabelWidth)

    return measured.map((m) => {
      const { arc, side, midAngle, lines, labelW, labelH } = m
      const colorIndex = allArcs.findIndex((a) => a.data.type === arc.data.type)
      const dx = Math.sin(midAngle) * layout.leaderStartRadius
      const dy = -Math.cos(midAngle) * layout.leaderStartRadius
      const bx = side === 'right' ? layout.elbowX : -layout.elbowX
      const by = -Math.cos(midAngle) * layout.elbowRadius
      const lx = side === 'right' ? layout.labelX : -layout.labelX
      const ly = by

      return { arc, colorIndex, midAngle, side, lines, labelW, labelH, dx, dy, bx, by, lx, ly }
    })
  }

  /**
   * Measures label text widths and wraps lines using offscreen SVG.
   * Determines left/right placement based on mid-angle.
   *
   * @param arcs - Arcs to measure
   * @param maxLabelWidth - Maximum width for text wrapping
   * @returns Array of measured labels with wrapped text lines
   */
  measureLabels(arcs, maxLabelWidth) {
    // Create hidden SVG for getBBox() measurements
    const tmpSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    tmpSvg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
    this.shadow.appendChild(tmpSvg)

    try {
      const measureText = (text) => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        el.style.fontSize = `${FONT_SIZE}px`
        el.textContent = text
        tmpSvg.appendChild(el)

        const w = el.getBBox().width
        tmpSvg.removeChild(el)
        return w
      }

      return arcs.map((arc) => {
        // Mid-angle determines left/right placement
        const midAngle = (arc.startAngle + arc.endAngle) / 2
        const side = Math.sin(midAngle) >= 0 ? 'right' : 'left'

        const rawText = formatLabel(arc.data.type)
        const lines = this.wrapText(rawText, maxLabelWidth, measureText)

        const lineWidths = lines.map((line) => measureText(line))
        const labelW = lineWidths.length > 0 ? Math.max(...lineWidths) : 0
        const labelH = Math.max(LINE_HEIGHT, lines.length * LINE_HEIGHT)

        return { arc, side, midAngle, lines, labelW, labelH }
      })
    } finally {
      this.shadow.removeChild(tmpSvg)
    }
  }

  /**
   * Resolves vertical label overlaps for a group (left or right side).
   * Applies clamping and iterative adjustments to prevent gaps.
   *
   * @param group - Labels on one side to adjust
   * @param layout - Layout config with vertical bounds
   */
  resolveOverlaps(group, layout) {
    if (group.length === 0) return

    // Sort by y position to process in order
    group.sort((a, b) => a.ly - b.ly)

    // Clamp within bounds first
    for (const label of group) {
      const half = label.labelH / 2
      label.ly = Math.max(layout.yMin + half, Math.min(layout.yMax - half, label.ly))
    }

    // Push down to resolve overlaps going forward
    for (let i = 1; i < group.length; i++) {
      const prevBottom = group[i - 1].ly + group[i - 1].labelH / 2
      const currTop = group[i].ly - group[i].labelH / 2
      if (currTop < prevBottom + LABEL_GAP_Y) {
        group[i].ly += prevBottom + LABEL_GAP_Y - currTop
      }
    }

    // If last label overflows, shift entire group up
    const last = group[group.length - 1]
    const overflow = last.ly + last.labelH / 2 - layout.yMax
    if (overflow > 0) {
      for (const label of group) label.ly -= overflow
    }

    // Push up to resolve remaining overlaps
    for (let i = group.length - 2; i >= 0; i--) {
      const nextTop = group[i + 1].ly - group[i + 1].labelH / 2
      const currBottom = group[i].ly + group[i].labelH / 2
      if (currBottom > nextTop - LABEL_GAP_Y) {
        group[i].ly -= currBottom - (nextTop - LABEL_GAP_Y)
      }
    }

    // Final clamp after all adjustments
    for (const label of group) {
      const half = label.labelH / 2
      label.ly = Math.max(layout.yMin + half, Math.min(layout.yMax - half, label.ly))
    }
  }

  /**
   * Gets or creates SVG element with proper dimensions.
   *
   * @param sel - D3 selection of container
   * @param layout - Layout configuration
   * @returns D3 selection of SVG element
   */
  getOrCreateSvg(sel, layout) {
    if (!this.svg) {
      this.svg = sel.append('svg').attr('class', 'pie-svg')
    }
    this.svg
      .attr('width', layout.width)
      .attr('height', layout.height)
      .attr('viewBox', `0 0 ${layout.width} ${layout.height}`)
    return this.svg
  }

  /**
   * Gets or creates root group translated to chart center.
   *
   * @param svg - SVG selection
   * @param layout - Layout configuration
   * @returns D3 selection of root group
   */
  getOrCreateRoot(svg, layout) {
    if (!this.root) {
      this.root = svg.append('g').attr('transform', `translate(${layout.cx},${layout.cy})`)
    }
    return this.root
  }

  /**
   * Draws pie slice paths with smooth transitions and gap rendering.
   * Stores arc state in map for frame-by-frame updates.
   *
   * @param root - Root SVG group
   * @param arcs - All arc data
   * @param data - Filtered entries for selection handling
   * @param groupKeyProvider - Function to extract type from entries
   * @param opacityFn - Function computing opacity per slice
   * @param selectedTypes - Currently selected types
   * @param layout - Layout configuration
   * @returns D3 selection of slice paths
   */
  drawSlices(root, arcs, data, groupKeyProvider, opacityFn, selectedTypes, layout) {
    // Arc generator using layout radii
    const arcGen = d3.arc().innerRadius(layout.donutInnerRadius).outerRadius(layout.radius)

    // Half gap in radians — shrinks each slice on both sides
    const halfGap = 1.5 / layout.radius

    const joined = root.selectAll('path.slice').data(arcs, (d) => d.data.type)

    const entered = joined
      .enter()
      .append('path')
      .attr('class', (d) => `slice ${d.data.type}`)
      .attr('fill', (d, i) => this.resolveSliceColor(d, i, data, groupKeyProvider))
      .attr('stroke', (d, i) => this.resolveSliceColor(d, i, data, groupKeyProvider))
      .attr('opacity', 0)

    joined
      .attr('class', (d) => {
        const selected = selectedTypes.includes(d.data.type)
        return `slice ${d.data.type}${selected ? ' selected' : ''}`
      })
      .attr('fill', (d, i) => this.resolveSliceColor(d, i, data, groupKeyProvider))

    const merged = entered.merge(joined)

    merged.each((d, _i, nodes) => {
      const node = nodes[_i]
      const type = d.data.type

      // Initialize or get mutable state for this type
      if (!this.arcStateByType.has(type)) {
        // Brand new: start collapsed at target start angle
        this.arcStateByType.set(type, { startAngle: d.startAngle, endAngle: d.startAngle })
      }

      const state = this.arcStateByType.get(type)

      const targetStart = d.startAngle + halfGap
      const targetEnd = d.endAngle - halfGap

      // Snapshot current state before transition
      const fromStart = state.startAngle
      const fromEnd = state.endAngle

      const interpStart = d3.interpolateNumber(fromStart, targetStart)
      const interpEnd = d3.interpolateNumber(fromEnd, targetEnd)

      d3.select(node)
        .interrupt('slice')
        .transition('slice')
        .duration(TRANSITION_MS)
        .ease(d3.easeCubicInOut)
        .attr('opacity', opacityFn(d.data))
        .attrTween('d', () => (t) => {
          // Mutate state in place so next render starts from here
          state.startAngle = interpStart(t)
          state.endAngle = interpEnd(t)
          return arcGen(state) ?? ''
        })
    })

    // Handle slice click to select/deselect entries
    merged.on('click', (event, d) => {
      event.stopPropagation()
      const selection = this.selection
      if (!selection) {
        return
      }

      data.forEach((entry) => {
        if (
          groupKeyProvider(entry) === d.data.type &&
          !selection.includes(entry) &&
          this.visibleElements?.includes(entry.id)
        ) {
          selection.add(entry)
        } else {
          const selectedItem = selection.find((selectedItem) => selectedItem.id === entry.id)
          if (selectedItem) {
            selection.remove(selectedItem)
          }
        }
      })
    })

    return merged
  }

  /**
   * Creates or updates center text elements for label and value display.
   *
   * @param root - Root SVG group
   * @returns Object with centerLabel and centerValue selections
   */
  drawCenterText(root) {
    let centerLabel = root.select('text.center-label')
    if (centerLabel.empty()) {
      centerLabel = root
        .append('text')
        .attr('class', 'center-label')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('opacity', 0)
    }

    let centerValue = root.select('text.center-value')
    if (centerValue.empty()) {
      centerValue = root
        .append('text')
        .attr('class', 'center-value')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .attr('opacity', 0)
    }

    return { centerLabel, centerValue }
  }

  /**
   * Draws label groups containing leader lines and wrapped text.
   * Updates positions via transition tweens for smooth animation.
   *
   * @param root - Root SVG group
   * @param labels - Computed label positions
   * @param data - Filtered entries for color lookup
   * @param groupKeyProvider - Function to extract type from entries
   * @param opacityFn - Function computing opacity per slice
   * @returns D3 selection of label groups
   */
  drawLabels(root, labels, data, groupKeyProvider, opacityFn) {
    let labelGroup = root.select('g.labels')
    if (labelGroup.empty()) {
      labelGroup = root.append('g').attr('class', 'labels')
    }

    const joined = labelGroup.selectAll('g.label-item').data(labels, (d) => d.arc.data.type)

    const entered = joined
      .enter()
      .append('g')
      .attr('class', (d) => `label-item label-item--${d.arc.data.type}`)
      .attr('opacity', 0)

    // Create leader line and text inside group
    entered.append('path').attr('class', 'label-leader')
    entered.append('text').attr('class', 'slice-label')

    const merged = entered.merge(joined)

    merged.each((ld, i, nodes) => {
      const g = d3.select(nodes[i])
      const type = ld.arc.data.type
      const { side, dx, dy, bx, lx, ly, lines } = ld
      const isRight = side === 'right'

      // Initialize label state for new types
      if (!this.labelStateByType.has(type)) {
        this.labelStateByType.set(type, { dx, dy, bx, ly, lx })
      }

      const state = this.labelStateByType.get(type)

      // Snapshot current position before transition
      const fromDx = state.dx
      const fromDy = state.dy
      const fromBx = state.bx
      const fromLy = state.ly
      const fromLx = state.lx

      const interpDx = d3.interpolateNumber(fromDx, dx)
      const interpDy = d3.interpolateNumber(fromDy, dy)
      const interpBx = d3.interpolateNumber(fromBx, bx)
      const interpLy = d3.interpolateNumber(fromLy, ly)
      const interpLx = d3.interpolateNumber(fromLx, lx)

      // Style leader and text (non-positional attributes)
      g.select('path.label-leader')
        .attr('fill', 'none')
        .attr('stroke', '#6b7280')
        .attr('stroke-width', 1.25)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('vector-effect', 'non-scaling-stroke')

      const text = g.select('text.slice-label').attr('font-size', FONT_SIZE)

      // Update tspan text (cannot be interpolated)
      const startOffset = -((lines.length - 1) * LINE_HEIGHT) / 2
      const tspans = text.selectAll('tspan').data(lines)
      tspans
        .enter()
        .append('tspan')
        .merge(tspans)
        .attr('dy', (_, idx) => (idx === 0 ? `${startOffset}px` : `${LINE_HEIGHT}px`))
        .text((line) => line)
      tspans.exit().remove()

      // Single transition handles all positional changes
      g.interrupt('label')
        .transition('label')
        .duration(TRANSITION_MS)
        .ease(d3.easeCubicInOut)
        .attr('opacity', opacityFn(ld.arc.data))
        .attrTween('transform', () => (t) => {
          // Mutate state in place
          state.dx = interpDx(t)
          state.dy = interpDy(t)
          state.bx = interpBx(t)
          state.ly = interpLy(t)
          state.lx = interpLx(t)

          // Translate group to text anchor position
          return `translate(${state.lx},${state.ly})`
        })
        .tween('contents', () => (_t) => {
          // Recompute leader and text position each frame
          const localDx = state.dx - state.lx
          const localDy = state.dy - state.ly
          const localBx = state.bx - state.lx

          // Leader: slice surface -> elbow -> text anchor (local 0,0)
          const leaderEndLocalX = isRight ? -4 : 4
          const leaderPath = `M ${localDx},${localDy} L ${localBx},0 L ${leaderEndLocalX},0`
          g.select('path.label-leader').attr('d', leaderPath)

          // Text position in local coordinates
          const localTextX = 0
          text
            .attr('text-anchor', isRight ? 'start' : 'end')
            .attr('x', localTextX)
            .attr('y', 0)
          text.selectAll('tspan').attr('x', localTextX)
        })
    })

    // Remove exiting labels with transition
    joined
      .exit()
      .interrupt('label-exit')
      .transition('label-exit')
      .duration(TRANSITION_MS)
      .ease(d3.easeCubicInOut)
      .attr('opacity', 0)
      .remove()

    return merged
  }

  /**
   * Sets up hover and click interactions for slices and labels.
   * Updates center content on hover and handles selection clicks.
   */
  setupInteractions({
    svg,
    slices,
    labelItems,
    centerLabel,
    centerValue,
    groupKeyProvider,
    pieState,
    opacityFn,
    allGroupedData
  }) {
    // Background for deselect on click
    let background = svg.select('rect.chart-background')
    if (background.empty()) {
      background = svg
        .insert('rect', ':first-child')
        .attr('class', 'chart-background')
        .attr('fill', 'transparent')
        .on('click', () => this.selection?.clear())
    }
    background.attr('width', svg.attr('width')).attr('height', svg.attr('height'))

    // Update label opacity on hover
    const updateLabelOpacity = (hoveredType) => {
      labelItems.each((ld, i, nodes) => {
        const value = opacityFn(ld.arc.data)
        d3.select(nodes[i])
          .interrupt('hover')
          .transition('hover')
          .duration(180)
          .ease(d3.easeCubicOut)
          .attr('opacity', value)
      })
    }

    // Update slice opacity on hover
    const updateSliceOpacity = (hoveredType) => {
      slices
        .classed('slice-hovered', (s) => hoveredType !== null && s.data.type === hoveredType)
        .interrupt('hover')
        .transition('hover')
        .duration(180)
        .ease(d3.easeCubicOut)
        .attr('opacity', (s) => opacityFn(s.data))
    }

    // Combined hover handler
    const onHover = (hovered) => {
      const type = hovered?.data.type ?? null
      updateSliceOpacity(type)
      updateLabelOpacity(type)
      this.updateCenterContent(centerLabel, centerValue, hovered, pieState, allGroupedData)
    }

    slices
      .on('pointerenter', (_, d) => {
        if (d.data.flow > 0) onHover(d)
      })
      .on('pointerleave', () => onHover(null))
  }

  /**
   * Updates center text with appropriate label and value.
   * Shows hovered slice info, or selected/zero-value info when not hovering.
   *
   * @param centerLabel - Center label text element
   * @param centerValue - Center value text element
   * @param hovered - Currently hovered arc data or null
   * @param pieState - Selection/visibility state
   * @param allGroupedData - All aggregated data for lookup
   */
  updateCenterContent(centerLabel, centerValue, hovered, pieState, allGroupedData) {
    let nextLabel = ''
    let nextValue = ''

    if (hovered) {
      // Show hovered slice info
      nextLabel = formatLabel(hovered.data.type)
      nextValue = `${hovered.data.flow}`
    } else {
      // Show selected or zero-value info
      const groupKeyProvider = this.groupKeyProvider ?? this.defaultGroupKeyProvider
      const selectionArray = this.selection?.toArray()
      const typesToCheck =
        pieState.selectedTypes.length > 0
          ? pieState.selectedTypes
          : selectionArray?.map((e) => groupKeyProvider(e))

      if (typesToCheck) {
        for (const type of typesToCheck) {
          const groupData = allGroupedData.find((g) => g.type === type)
          if (groupData && groupData.flow <= 0) {
            nextLabel = formatLabel(type)
            nextValue = '0'
            break
          }
        }
      }
    }

    const fadeDuration = TRANSITION_MS / 2

    // Cross-fade text content
    const crossFade = (el, nextText) => {
      if (el.text() === nextText) return
      const targetOpacity = nextText !== '' ? 1 : 0
      el.interrupt('center-fade')
        .transition('center-fade')
        .duration(fadeDuration)
        .ease(d3.easeCubicInOut)
        .attr('opacity', 0)
        .on('end', function () {
          d3.select(this)
            .text(nextText)
            .interrupt('center-fade-in')
            .transition('center-fade-in')
            .duration(fadeDuration)
            .ease(d3.easeCubicInOut)
            .attr('opacity', targetOpacity)
        })
    }

    crossFade(centerLabel, nextLabel)
    crossFade(centerValue, nextValue)
  }

  /**
   * Resolves slice color from provider or default palette.
   *
   * @param d - Arc data
   * @param i - Arc index
   * @param nodes - Entries for color provider lookup
   * @param groupKeyProvider - Function to extract type from entries
   * @returns CSS color string
   */
  resolveSliceColor(d, i, nodes, groupKeyProvider) {
    if (this.colorProvider) {
      const match = nodes.find((n) => groupKeyProvider(n) === d.data.type)
      if (match) return this.colorProvider(match)
    }
    return DEFAULT_COLORS[i % DEFAULT_COLORS.length]
  }

  /**
   * Wraps text into lines based on measured width.
   * Tries word wrapping, then hyphen splitting, then character wrapping.
   *
   * @param text - Text to wrap
   * @param maxWidth - Maximum width in pixels
   * @param measure - Function measuring text width
   * @returns Array of wrapped lines
   */
  wrapText(text, maxWidth, measure) {
    const normalized = text.trim().replace(/\s+/g, ' ')
    if (!normalized) return ['']
    if (measure(normalized) <= maxWidth) return [normalized]

    // Prefer word wrapping
    const words = normalized.split(' ')
    if (words.length > 1) {
      return this.wrapByWords(words, maxWidth, measure)
    }

    // Then hyphen wrapping
    if (normalized.includes('-')) {
      return this.wrapByHyphens(normalized, maxWidth, measure)
    }

    // Finally character wrapping
    return this.wrapByCharacters(normalized, maxWidth, measure)
  }

  /**
   * Wraps text by words respecting spaces.
   *
   * @param words - Array of words
   * @param maxWidth - Maximum width
   * @param measure - Width measurement function
   * @returns Wrapped lines
   */
  wrapByWords(words, maxWidth, measure) {
    const lines = []
    let current = words[0]

    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`
      if (measure(candidate) <= maxWidth) {
        current = candidate
      } else {
        lines.push(current)
        current = words[i]
      }
    }

    lines.push(current)
    return lines
  }

  /**
   * Wraps text by hyphens preserving hyphen breaks.
   *
   * @param text - Text to wrap
   * @param maxWidth - Maximum width
   * @param measure - Width measurement function
   * @returns Wrapped lines
   */
  wrapByHyphens(text, maxWidth, measure) {
    const parts = text.split('-').filter(Boolean)
    if (parts.length === 0) return [text]

    const lines = []
    let current = ''

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1
      const piece = isLast ? parts[i] : `${parts[i]}-`

      if (!current) {
        current = piece
        continue
      }

      const candidate = `${current}${piece}`
      if (measure(candidate) <= maxWidth) {
        current = candidate
      } else {
        lines.push(current)
        current = piece
      }
    }

    if (current) lines.push(current)
    return lines
  }

  /**
   * Wraps text by individual characters as last resort.
   *
   * @param text - Text to wrap
   * @param maxWidth - Maximum width
   * @param measure - Width measurement function
   * @returns Wrapped lines
   */
  wrapByCharacters(text, maxWidth, measure) {
    const lines = []
    let current = ''

    for (const ch of text) {
      const candidate = current + ch
      if (!current || measure(candidate) <= maxWidth) {
        current = candidate
      } else {
        lines.push(current)
        current = ch
      }
    }

    if (current) lines.push(current)
    return lines
  }
}

customElements.define('pie-chart-view', PieChartViewComponent)
