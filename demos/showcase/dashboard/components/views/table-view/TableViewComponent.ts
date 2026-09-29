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
import type { ObservableCollection } from '@yfiles/yfiles'
import type { DashboardData, DashboardEntry } from '../../../types'
import { DashboardViewBase } from '../dashboard-view-base'
import styles from './table-view.css?inline'

const tableSheet = new CSSStyleSheet()
tableSheet.replaceSync(styles)

/**
 * Displays dashboard entries in a dynamic HTML table with three columns:
 * Name, Type, and Country. Rows are added/removed based on visibility filtering.
 * Supports row selection with highlighting and smooth scrolling to selected rows.
 */
export class TableViewComponent extends DashboardViewBase {
  private table: HTMLTableElement | null = null
  private tbody: HTMLTableSectionElement | null = null

  /**
   * Returns empty message shown when no data or all rows filtered.
   *
   * @returns Empty state message
   */
  protected get emptyMessage(): string | null {
    return 'No data available for the current filter.'
  }

  /**
   * Determines whether overlay should be shown.
   * Shows overlay when data is empty or all rows filtered out.
   *
   * @returns True if overlay should display
   */
  protected shouldShowOverlay(): boolean {
    if (!this.data) return false
    if (this.data.nodes.length === 0) return true
    if (!this.tbody) return false
    return this.tbody.querySelectorAll('tr').length === 0
  }

  /**
   * Initializes the table with header and watches selection/visibility changes.
   * Rows are dynamically added/removed based on visibility filtering.
   */
  protected setupView(container: HTMLElement): void {
    this.adoptStyleSheet(tableSheet)
    this.table = document.createElement('table')
    this.table.className = 'table'
    this.table.id = 'table'
    this.table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Country</th>
        </tr>
      </thead>
      <tbody></tbody>
    `
    this.tbody = this.table.querySelector('tbody')!
    container.insertBefore(this.table, container.firstChild)

    // Highlight and scroll to selected row
    this.watchSelection({
      added: (item) => {
        this.highlightRow(item.id)
        this.scrollToRow(item.id)
      },
      removed: () => this.clearHighlights()
    })

    // Add/remove rows when visibility changes (from filter view)
    this.watchVisibility({
      added: (id) => {
        if (!this.tbody || this.tbody.querySelector(`tr[data-id="${id}"]`)) return
        const entry = this.data?.nodes.find((n) => n.id === id)
        if (entry) {
          this.tbody.appendChild(this.createRow(entry))
          this.refreshOverlay()
        }
      },
      removed: (id) => {
        this.tbody?.querySelector(`tr[data-id="${id}"]`)?.remove()
        this.refreshOverlay()
      }
    })
  }

  protected tearDownView(): void {
    this.table = null
    this.tbody = null
  }

  /**
   * Called when dashboard data changes.
   * Clears and rebuilds entire table from data nodes.
   */
  protected onDataChanged(data: DashboardData | null): void {
    if (!this.tbody) return
    this.tbody.innerHTML = ''
    if (!data) return
    for (const node of data.nodes) {
      this.tbody.appendChild(this.createRow(node))
    }
    this.refreshOverlay()
  }

  /**
   * Called when dashboard selection changes.
   * Updates row highlighting for all selected entries.
   *
   * @param selection - Current dashboard selection or null
   */
  protected onSelectionChanged(selection: ObservableCollection<DashboardEntry> | null): void {
    this.clearHighlights()
    if (!selection) return
    selection
      .map((item) => item.id)
      .toArray()
      .forEach((id) => this.highlightRow(id))
  }

  /**
   * Creates a table row element for an entry.
   * Displays name, type, and country. Attaches click handler for selection.
   *
   * @param node - Dashboard entry to create row for
   * @returns HTML table row element
   */
  private createRow(node: DashboardEntry): HTMLTableRowElement {
    const tr = document.createElement('tr')
    tr.dataset.id = String(node.id)
    if (this.selection?.includes(node)) {
      tr.classList.add('row-selected')
    }
    tr.innerHTML = `<td>${node.name}</td><td>${node.type}</td><td>${node.country}</td>`

    // Handle row click to toggle selection
    tr.addEventListener('click', () => {
      if (!this.selection) {
        return
      }
      if (!tr.classList.contains('row-selected')) {
        this.selection.clear()
        this.selection.add(node)
      } else {
        this.selection.clear()
      }
    })
    return tr
  }

  /**
   * Adds row-selected class to row with given id.
   *
   * @param id - Entry id to highlight
   */
  private highlightRow(id: number | string): void {
    this.tbody?.querySelector(`tr[data-id="${id}"]`)?.classList.add('row-selected')
  }

  /**
   * Scrolls table to show row with given id.
   * Uses smooth behavior and nearest alignment.
   *
   * @param id - Entry id to scroll to
   */
  private scrollToRow(id: number | string): void {
    const tr = this.tbody?.querySelector<HTMLTableRowElement>(`tr[data-id="${id}"]`)
    tr?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  /**
   * Removes row-selected class from all rows.
   */
  private clearHighlights(): void {
    this.tbody?.querySelectorAll('tr.row-selected').forEach((tr) => {
      tr.classList.remove('row-selected')
    })
  }
}

customElements.define('table-view', TableViewComponent)
