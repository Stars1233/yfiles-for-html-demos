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
import type { DashboardEntry } from '../../../types'
import { DashboardViewBase } from '../dashboard-view-base'
import styles from './properties-view.css?inline'

const propertiesSheet = new CSSStyleSheet()
propertiesSheet.replaceSync(styles)

/**
 * Displays detailed properties of a single selected entity in a key-value table.
 */
export class PropertiesViewComponent extends DashboardViewBase {
  private list: HTMLDivElement | null = null
  /** Optional whitelist of property keys to display. If null, shows all properties. */
  validKeys: Array<string | number> | null = null

  /**
   * Returns empty message shown when no single entity selected.
   *
   * @returns Empty state message
   */
  protected get emptyMessage(): string | null {
    return 'Select a single entity to see its properties.'
  }

  /**
   * Determines whether overlay should be shown.
   * Shows overlay when no selection or multiple entities selected.
   *
   * @returns True if overlay should display
   */
  protected shouldShowOverlay(): boolean {
    return !this.selection || this.selection.size === 0 || this.selection.size > 1
  }

  /**
   * Creates the view container with properties-view id.
   *
   * @returns HTMLElement configured as properties container
   */
  protected createViewContainer(): HTMLElement {
    const div = super.createViewContainer()
    div.id = 'properties-view'
    return div
  }

  /**
   * Initializes the properties view with selection listener.
   * Renders entry when single item selected, clears otherwise.
   */
  protected setupView(container: HTMLElement): void {
    this.adoptStyleSheet(propertiesSheet)
    this.list = document.createElement('div')
    this.list.id = 'properties-list'
    container.insertBefore(this.list, container.firstChild)

    this.watchSelection({
      added: (item) => (this.selection?.size === 1 ? this.renderEntry(item) : this.clearList()),
      removed: () => this.clearList()
    })
  }

  protected tearDownView(): void {
    this.list = null
  }

  /**
   * Renders properties of a single entry as key-value rows.
   * Filters by `validKeys` if set, skips undefined/empty values.
   * Applies intelligent formatting to keys and values.
   *
   * @param entry - Dashboard entry to display
   */
  private renderEntry(entry: DashboardEntry): void {
    if (!this.list) return
    this.list.innerHTML = Object.entries(entry)
      .filter(
        ([key, value]) =>
          (!this.validKeys || this.validKeys.includes(key)) &&
          typeof value !== 'undefined' &&
          value !== ''
      )
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return ''
        }
        const label = formatKey(key)
        const display = formatValue(key, value)
        return `<div class="property-row" aria-label="${label}: ${display}">
          <span class="property-key">${label}</span>
          <span class="property-value">${display}</span>
        </div>`
      })
      .join('')
  }

  /**
   * Clears all properties from the list.
   */
  private clearList(): void {
    if (this.list) this.list.innerHTML = ''
  }
}

/**
 * Converts camelCase or snake_case keys to Title Case with spaces.
 * Example: "firstName" → "First Name", "first_name" → "First Name"
 *
 * @param key - Property key to format
 * @returns Formatted key string
 */
function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
}

/**
 * Formats property values with intelligent type-specific handling.
 * Handles coordinates, dates, objects, and primitives.
 *
 * @param key - Property key (used for date detection)
 * @param value - Value to format
 * @returns Formatted value string
 */
function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'

  if (typeof value === 'object') {
    // Check if object is geographic coordinates
    const loc = value as { lat?: number; lng?: number }
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      const latDir = loc.lat >= 0 ? 'N' : 'S'
      const lngDir = loc.lng >= 0 ? 'E' : 'W'
      return `${Math.abs(loc.lat).toFixed(4)}° ${latDir}, ${Math.abs(loc.lng).toFixed(4)}° ${lngDir}`
    }
    return JSON.stringify(value)
  }

  // Format ISO date strings for startTime/endTime keys
  if (typeof value === 'string' && (key === 'startTime' || key === 'endTime')) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  return String(value)
}

customElements.define('properties-view', PropertiesViewComponent)
