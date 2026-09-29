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
import { type DashboardData, type DashboardEntry, formatLabel } from '../../../types'
import { DashboardViewBase } from '../dashboard-view-base'
import styles from './legend-view.css?inline'

const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(styles)

/**
 * Configuration object for a legend item.
 *
 * @property id - Unique identifier from dashboard entry
 * @property label - Display label for the item
 * @property color - CSS color value for the legend swatch
 * @property selected - Whether the item is currently selected
 * @property visible - Whether the item is visible in the dashboard
 */
export interface LegendItem {
  id: string | number
  label: string
  color: string
  selected: boolean
  visible: boolean
}

/**
 * Extracts a categorization value from a dashboard entry.
 * Used to group entries into legend categories.
 */
export type LegendValueProvider = (node: DashboardEntry) => string | undefined

/**
 * Returns a color for a dashboard entry based on its properties.
 * Takes precedence over default color palette.
 */
export type LegendColorProvider = (node: DashboardEntry) => string

/** Default color palette for legend items when no custom provider specified */
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

/**
 * Displays a categorized legend with selection management and visibility tracking.
 * Groups entries by value provider, supports custom colors, and renders in two columns.
 * Clicking legend items toggles selection of all entries in that category.
 *
 * Configuration:
 * - title: Legend title text (default: 'Types')
 * - valueProvider: Function to extract category value from entries
 * - colorProvider: Function to resolve color for each category
 */
export class LegendViewComponent extends DashboardViewBase {
  private container: HTMLDivElement | null = null
  private resizeObserver: ResizeObserver | null = null

  /** Display title for the legend */
  title: string = 'Types'
  /** Function to extract categorization value from entries */
  valueProvider?: LegendValueProvider
  /** Function to resolve color for entries */
  colorProvider?: LegendColorProvider

  protected get emptyMessage(): string | null {
    return null
  }

  /**
   * Creates the view container with legend-specific styling.
   *
   * @returns HTMLElement configured as legend container
   */
  protected createViewContainer(): HTMLElement {
    const div = super.createViewContainer()
    div.className = 'legend-container'
    return div
  }

  /**
   * Initializes the legend view with event listeners and observers.
   */
  protected setupView(container: HTMLElement): void {
    this.adoptStyleSheet(styleSheet)
    this.container = container as HTMLDivElement

    const rerender = (): void => this.render()
    this.watchVisibility({ added: rerender, removed: rerender })
    this.watchSelection({ added: rerender, removed: rerender })

    // Re-render when container size changes
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.render())
    })
    this.resizeObserver.observe(container)

    // Clear selection when clicking empty area
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement

      // If click didn't land on a legend item, clear all selections
      if (!target.closest('.legend-item')) {
        const selection = this.selection
        if (!selection) return
        selection.clear()
      }
    })
  }

  protected tearDownView(): void {
    this.container = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
  }

  /**
   * Called when dashboard data changes.
   * Triggers legend re-render with updated categories.
   */
  protected onDataChanged(data: DashboardData | null): void {
    if (data) {
      this.render()
    }
  }

  /**
   * Renders the legend with deduplicated categories and current selection/visibility state.
   * Updates legend items based on value provider and color provider.
   */
  private render(): void {
    if (!this.container || !this.data) {
      return
    }

    const { width, height } = this.getBoundingClientRect()
    if (width === 0 || height === 0) {
      return
    }

    const dashboardData = this.data.nodes
    // Deduplicate entries by their category value
    const data = dashboardData.filter(
      (d, index, array) => index === array.findIndex((e) => this.getValue(e) === this.getValue(d))
    )

    // Get unique selected categories
    const selectedTypes =
      this.selection && this.selection.size > 0
        ? this.selection
            .map((d) => this.getValue(d))
            .filter((d, index, array) => index === array.findIndex((t) => t === d))
            .toArray()
        : []

    // Get unique visible categories
    const visibleTypes = dashboardData
      .filter((d) => this.visibleElements?.includes(d.id))
      .map((d) => this.getValue(d))
      .filter((d, index, array) => index === array.findIndex((t) => t === d))

    // Build legend items from deduplicated categories
    const legendItems = data
      .filter((d) => !!this.getValue(d))
      .map((d, i): LegendItem => {
        const value = this.getValue(d)!
        return {
          label: value,
          color: this.resolveItemColor(d, i, data),
          selected: selectedTypes.includes(value),
          visible: visibleTypes.includes(value),
          id: d.id
        }
      })

    this.renderLegend(this.container, legendItems)
  }

  /**
   * Renders legend UI with items in two-column layout.
   * Each item shows color swatch, label, and current selection/visibility state.
   *
   * @param container - Container element to render into
   * @param items - Legend items to display
   */
  private renderLegend(container: HTMLDivElement, items: LegendItem[]): void {
    container.innerHTML = ''

    const legend = document.createElement('div')
    legend.classList.add('legend')

    // Create title
    const title = document.createElement('h3')
    title.classList.add('legend-title')
    title.innerText = this.title

    // Create two-column layout for legend items
    const legendColumns = document.createElement('div')
    legendColumns.classList.add('legend-columns')
    const legendColumn1 = document.createElement('div')
    legendColumn1.classList.add('legend-column')
    const legendColumn2 = document.createElement('div')
    legendColumn2.classList.add('legend-column')

    // Render each legend item with color swatch and label
    items
      .sort((a, b) => a.label.localeCompare(b.label))
      .forEach(({ label, color, selected, visible }, index) => {
        const item = document.createElement('div')
        item.className = 'legend-item'

        // Apply dimmed style if not visible
        if (!visible) {
          item.classList.add('legend-item--dimmed')
        }

        // Apply selected style if currently selected
        if (selected) {
          item.classList.add('legend-item--selected')
        }

        // Handle legend item click to toggle selection of category
        item.addEventListener('click', (e) => {
          e.stopPropagation()

          // Ignore clicks on dimmed items
          if (item.classList.contains('legend-item--dimmed')) {
            return
          }

          const selection = this.selection
          if (!selection) {
            return
          }

          // Clear all selections first
          selection.clear()

          // If not already selected, select all visible entries in this category
          if (!item.classList.contains('legend-item--selected')) {
            const allWithSameType =
              this.data?.nodes.filter((entry: DashboardEntry) => this.getValue(entry) === label) ??
              []

            allWithSameType.forEach((entry) => {
              if (this.visibleElements?.includes(entry.id)) {
                selection.add(entry)
              }
            })
          }
        })

        // Create color swatch
        const swatch = document.createElement('span')
        swatch.className = 'legend-swatch'
        swatch.style.backgroundColor = color

        // Create label text
        const text = document.createElement('span')
        text.className = 'legend-label'
        text.textContent = formatLabel(label)

        item.appendChild(swatch)
        item.appendChild(text)

        // Distribute items evenly across two columns
        if (index % 2 === 0) {
          legendColumn1.appendChild(item)
        } else {
          legendColumn2.appendChild(item)
        }
      })

    legend.appendChild(title)
    legendColumns.appendChild(legendColumn1)
    legendColumns.appendChild(legendColumn2)
    legend.appendChild(legendColumns)
    container.appendChild(legend)
  }

  /**
   * Resolves the color for a legend item.
   * Uses custom color provider if available, otherwise defaults to palette.
   *
   * @param d - Dashboard entry
   * @param i - Item index for palette lookup
   * @param nodes - All nodes in category (for provider lookup)
   * @returns CSS color string
   */
  private resolveItemColor(d: DashboardEntry, i: number, nodes: DashboardEntry[]): string {
    if (this.colorProvider) {
      const match = nodes.find((n) => this.getValue(n) === this.getValue(d))
      if (match) {
        return this.colorProvider(match)
      }
    }
    return DEFAULT_COLORS[i % DEFAULT_COLORS.length]
  }

  /**
   * Extracts the categorization value from an entry.
   * Uses value provider if configured, otherwise defaults to entry type.
   *
   * @param entry - Dashboard entry to extract value from
   * @returns Category value or undefined
   */
  private getValue(entry: DashboardEntry): string | undefined {
    return this.valueProvider ? this.valueProvider(entry) : entry.type
  }

  /**
   * Resets component to initial state, clearing all custom providers.
   */
  override resetToDefaults(): void {
    super.resetToDefaults()
    this.valueProvider = undefined
    this.colorProvider = undefined
  }
}

customElements.define('legend-view', LegendViewComponent)
