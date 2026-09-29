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
import type { GraphComponent, ObservableCollection } from '@yfiles/yfiles'
import { DashboardViewBase } from '../dashboard-view-base'
import styles from './filter-view.css?inline'
import { type DashboardEntry, formatLabel, getTag } from '../../../types'

const filterSheet = new CSSStyleSheet()
filterSheet.replaceSync(styles)

/**
 * Toggles the 'grayed-out' CSS class on an element.
 * Maintains other existing classes while adding or removing the grayed-out indicator.
 *
 * @param cssClass - Current CSS class string
 * @param grayed - Whether to add or remove the grayed-out class
 * @returns Updated CSS class string
 */
function toggleGrayOutClass(cssClass: string, grayed: boolean): string {
  const classes = cssClass
    .split(' ')
    .map((c) => c.trim())
    .filter((c) => c && c !== 'grayed-out')
  if (grayed) {
    classes.push('grayed-out')
  }
  return classes.join(' ')
}

/**
 * Applies a gray-out filter to a graph component based on visible elements.
 * Updates node, edge, and label styles to visually indicate filtered-out items.
 * Grays out edges if either source or target node is grayed out.
 *
 * @param graphComponent - The graph component to filter
 * @param visibleElements - Collection of visible element IDs to keep visible
 * @param filteringCallback - Optional callback fired after filtering completes
 */
export function applyGrayOutFilter(
  graphComponent: GraphComponent,
  visibleElements: ObservableCollection<number | string>,
  filteringCallback?: () => void
): void {
  const graph = graphComponent.graph
  const grayedNodeIds = new Set<unknown>()

  // Apply gray-out filter to all nodes and their labels
  for (const node of graph.nodes) {
    const id = getTag(node).id
    const grayed = !visibleElements.includes(id)
    if (grayed) {
      grayedNodeIds.add(id)
    }
    const style = node.style as { cssClass?: string }
    if (style.cssClass !== undefined) {
      style.cssClass = toggleGrayOutClass(style.cssClass, grayed)
    }

    for (const label of node.labels) {
      const style = label.style as { cssClass?: string }
      if (style.cssClass !== undefined) {
        style.cssClass = toggleGrayOutClass(style.cssClass, grayed)
      }
    }
  }

  // Apply gray-out filter to all edges and their labels
  // Edges are grayed if either connected node is grayed
  for (const edge of graph.edges) {
    const sourceGrayed = grayedNodeIds.has(getTag(edge.sourceNode!).id)
    const targetGrayed = grayedNodeIds.has(getTag(edge.targetNode!).id)
    const grayed = sourceGrayed || targetGrayed
    const style = edge.style as { cssClass?: string }
    if (style.cssClass !== undefined) {
      style.cssClass = toggleGrayOutClass(style.cssClass, grayed)
    }

    for (const label of edge.labels) {
      const style = label.style as { cssClass?: string }
      if (style.cssClass !== undefined) {
        style.cssClass = toggleGrayOutClass(style.cssClass, grayed)
      }
    }
  }
  graphComponent.invalidate()

  filteringCallback?.()
}

/** Supported filter control types */
type FilterControl = 'select' | 'datetime-local'

/**
 * Configuration object for a filter field.
 *
 * @property name - Internal field identifier
 * @property label - Display label for the field
 * @property control - Input control type to use
 * @property accessor - Function to extract field value from a DashboardEntry
 */
export type FilterField = {
  name: string
  label: string
  control: FilterControl
  accessor: (entry: DashboardEntry) => string
}

/** Map of filter field names to their selected values */
type FilterValues = Record<string, string | undefined>

/** Default filter fields if none are configured */
const DEFAULT_FIELDS: FilterField[] = [
  { name: 'type', label: 'Type', control: 'select', accessor: (e) => e.type },
  { name: 'country', label: 'Country', control: 'select', accessor: (e) => e.country ?? 'ZZ' }
]

/**
 * Provides dynamic filter controls to filter dashboard data by configurable fields.
 * Supports select dropdowns and datetime inputs with real-time filtering.
 * Automatically updates graph visibility and displays result counts.
 */
export class FilterViewComponent extends DashboardViewBase {
  private fields: FilterField[] = DEFAULT_FIELDS
  private fieldsContainer: HTMLDivElement | null = null

  /**
   * Sets the filter field configuration.
   * Replaces default fields and rebuilds the filter UI.
   *
   * @param value - Configuration object with optional fields array
   * @param [value.fields] - Optional array of filter field configurations
   */
  set config(value: { fields?: FilterField[] }) {
    if (value.fields) {
      this.fields = value.fields
      this.rebuildFields()
    }
  }

  protected get emptyMessage(): string | null {
    return null
  }

  protected createViewContainer(): HTMLElement {
    const div = super.createViewContainer()
    div.id = 'filtering-view'
    return div
  }

  /**
   * Initializes the filter view with event listeners.
   * Listens for change and input events to trigger filter application.
   */
  protected setupView(container: HTMLElement): void {
    this.adoptStyleSheet(filterSheet)
    this.fieldsContainer = container as HTMLDivElement
    this.fieldsContainer.addEventListener('change', (evt) => {
      if (evt.target instanceof HTMLSelectElement || evt.target instanceof HTMLInputElement) {
        this.applyFilters()
      }
    })
    this.fieldsContainer.addEventListener('input', (evt) => {
      if (evt.target instanceof HTMLInputElement && evt.target.type !== 'select') {
        this.applyFilters()
      }
    })
  }

  protected tearDownView(): void {
    this.fieldsContainer = null
  }

  /**
   * Called when data changes.
   * Rebuilds filter fields and resets filters to show all data.
   */
  protected onDataChanged(): void {
    this.rebuildFields()
    if (this.data && this.visibleElements) {
      this.applyFilters(true)
    }
  }

  /**
   * Resets all filters to their initial state, showing all entries.
   */
  reset(): void {
    if (!this.fieldsContainer) return
    this.clearFilterValues()
    this.applyFilters(true)
  }

  /**
   * Rebuilds the filter UI based on current fields and data.
   * Dynamically creates select or datetime inputs with appropriate options.
   */
  private rebuildFields(): void {
    if (!this.fieldsContainer || !this.data) return
    this.fieldsContainer.innerHTML = ''
    for (const field of this.fields) {
      const wrapper = document.createElement('div')
      wrapper.classList.add('filter-field')

      let input: HTMLInputElement | HTMLSelectElement
      if (field.control === 'select') {
        input = document.createElement('select')
        input.name = field.name
        input.required = true
        input.appendChild(new Option('', ''))
        const values = this.data.nodes
          .map(field.accessor)
          .filter((value) => value && value.length > 0)
          .sort()
        // Use Set to deduplicate values
        Array.from(new Set(values))
          .sort()
          .forEach((value) => input.appendChild(new Option(formatLabel(value), value)))
      } else {
        // datetime-local input
        input = document.createElement('input')
        input.type = field.control
        input.name = field.name
        const values = this.data.nodes
          .map(field.accessor)
          .filter((value) => value && value.length > 0)
          .sort()
        input.min = values[0]
        input.max = values[values.length - 1]
      }

      wrapper.appendChild(input)

      const label = document.createElement('label')
      label.textContent = field.label
      wrapper.appendChild(label)

      this.fieldsContainer.appendChild(wrapper)
    }

    // Add result counter element
    const resultText = document.createElement('div')
    resultText.id = 'filter-result'
    resultText.innerText = `Showing all ${this.data.nodes.length} results`
    this.fieldsContainer.appendChild(resultText)
  }

  /**
   * Applies current filter values to visible elements.
   * Updates the result counter and triggers graph filtering.
   *
   * @param showAll - If true, resets filters to show all entries
   */
  private applyFilters(showAll = false): void {
    if (!this.data || !this.visibleElements) {
      return
    }

    if (showAll) {
      this.clearFilterValues()
    }
    this.updateSelectOptions()

    const filters = this.readFilterValues()
    this.selection?.clear()

    // Filter nodes based on current filter values
    const matches = showAll ? this.data.nodes : filterEntries(this.data.nodes, filters, this.fields)
    this.visibleElements.clear()
    matches.forEach((entry) => this.visibleElements!.add(entry.id))

    // Update result counter text
    const filterResultElement =
      this.fieldsContainer?.querySelector<HTMLDivElement>('#filter-result')
    if (filterResultElement) {
      filterResultElement.innerText = showAll
        ? `Showing all ${this.data.nodes.length} results`
        : `Showing ${matches.length} of ${this.data.nodes.length} results`
    }
  }

  /**
   * Reads current filter values from input elements.
   *
   * @returns Object mapping field names to selected values
   */
  private readFilterValues(): FilterValues {
    const values: FilterValues = {}
    this.fields.forEach((field) => {
      const el = this.fieldsContainer?.querySelector<HTMLInputElement | HTMLSelectElement>(
        `[name="${field.name}"]`
      )
      values[field.name] = el?.value.trim() ? el.value : undefined
    })
    return values
  }

  /**
   * Updates the available options of all select-based filters based on the
   * current selections.
   *
   * Options that cannot produce a result together with the active filters are
   * disabled. Any selected option that becomes invalid is cleared.
   */
  private updateSelectOptions(): void {
    if (!this.fieldsContainer || !this.data) return

    const selectFields = this.fields.filter((field) => field.control === 'select')

    // Clear selections that became invalid, then recalculate until stable.
    let changed = true

    while (changed) {
      changed = false
      const currentValues = this.readFilterValues()

      for (const field of selectFields) {
        const select = this.fieldsContainer.querySelector<HTMLSelectElement>(
          `select[name="${CSS.escape(field.name)}"]`
        )
        if (!select) {
          continue
        }

        // Find entries matching all other active filters
        const matchingEntries = this.data.nodes.filter((entry) =>
          this.fields.every((otherField) => {
            if (otherField.name === field.name) {
              return true
            }
            const selectedValue = currentValues[otherField.name]
            return selectedValue === undefined || otherField.accessor(entry) === selectedValue
          })
        )

        // Values that are valid for this select
        const validValues = new Set(
          matchingEntries
            .map(field.accessor)
            .filter((value: string | undefined) => value !== undefined && value !== '')
        )

        // Enable/disable individual options
        for (const option of Array.from(select.options)) {
          // Keep the empty "reset" option enabled
          option.disabled = option.value !== '' && !validValues.has(option.value)
        }

        // Clear a selected value that is no longer valid
        if (select.value && !validValues.has(select.value)) {
          select.value = ''
          changed = true
        }
      }
    }

    // Recalculate disabled states after any invalid selections were cleared
    const currentValues = this.readFilterValues()

    for (const field of selectFields) {
      const select = this.fieldsContainer.querySelector<HTMLSelectElement>(
        `select[name="${CSS.escape(field.name)}"]`
      )

      if (!select) {
        continue
      }

      const matchingEntries = this.data.nodes.filter((entry) =>
        this.fields.every((otherField) => {
          if (otherField.name === field.name) {
            return true
          }
          const selectedValue = currentValues[otherField.name]
          return selectedValue === undefined || otherField.accessor(entry) === selectedValue
        })
      )

      const validValues = new Set(
        matchingEntries
          .map(field.accessor)
          .filter((value: string | undefined) => value !== undefined && value !== '')
      )
      for (const option of Array.from(select.options)) {
        option.disabled = option.value !== '' && !validValues.has(option.value)
      }
    }
  }

  /**
   * Clears all values from the filter controls.
   *
   * Resets every select and input element managed by this component to its
   * empty value. This method only updates the control values; it does not
   * reapply the filters or update the graph.
   */
  private clearFilterValues(): void {
    this.fieldsContainer
      ?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('select, input')
      .forEach((element) => {
        element.value = ''
      })
  }
}

/**
 * Filters dashboard entries using the currently active filter values.
 *
 * All active filters must match for an entry to be included. Filter values
 * are resolved through each field's accessor, which supports custom value
 * transformations and fallback values.
 *
 * If no filters are active, all entries are returned.
 *
 * @param nodes - Dashboard entries to filter.
 * @param filters - Selected filter values, keyed by filter field name.
 * @param fields - Filter field definitions used to access entry values.
 * @returns Entries matching all active filter criteria.
 */
function filterEntries(
  nodes: DashboardEntry[],
  filters: FilterValues,
  fields: FilterField[]
): DashboardEntry[] {
  const activeFilters = fields.filter((field) => filters[field.name] !== undefined)

  if (activeFilters.length === 0) {
    return nodes
  }

  return nodes.filter((entry) =>
    activeFilters.every((field) => field.accessor(entry) === filters[field.name])
  )
}

customElements.define('filter-view', FilterViewComponent)
