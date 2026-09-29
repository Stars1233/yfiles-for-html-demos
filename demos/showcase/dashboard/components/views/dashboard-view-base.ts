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
import electricityStyles from '../../use-cases/electricity-use-case/component-styles-electricity.css?inline'
import healthcareStyles from '../../use-cases/healthcare-use-case/component-styles-healthcare.css?inline'
import type { DashboardData, DashboardEntry } from '../../types'

/** Shared across all component instances — created once at module load. */
const healthcareSheet = new CSSStyleSheet()
healthcareSheet.replaceSync(healthcareStyles)

const electricitySheet = new CSSStyleSheet()
electricitySheet.replaceSync(electricityStyles)

type Disposer = () => void

type SelectionWatcher = {
  added?: (item: DashboardEntry) => void
  removed?: (item: DashboardEntry) => void
  cleanup?: Disposer
}

type VisibilityWatcher = {
  added?: (id: number | string) => void
  removed?: (id: number | string) => void
  cleanup?: Disposer
}

/**
 * Common base for all dashboard view components (graphs, tables, charts, etc.).
 */
export abstract class DashboardViewBase extends HTMLElement {
  protected readonly shadow: ShadowRoot

  protected _data: DashboardData | null = null
  private _selection: ObservableCollection<DashboardEntry> | null = null
  private _visibleElements: ObservableCollection<number | string> | null = null

  private selectionWatchers: SelectionWatcher[] = []
  private visibilityWatchers: VisibilityWatcher[] = []

  protected initialized = false
  private themeObserver: MutationObserver | null = null

  protected viewContainer: HTMLElement | null = null
  protected overlayElement: HTMLDivElement | null = null

  private _helpContent: string | null = null

  /**
   * Predicate to filter which selection items this view reacts to.
   * Default: accept all non-null items.
   *
   * Override from outside to restrict: `views.pie.acceptsSelectionItem = (item) => item?.type.startsWith('producer')`
   */
  acceptsSelectionItem: (item: DashboardEntry | null) => boolean = (item) => item != null

  /**
   * Transform selected items before adding to selection (e.g., child → parent).
   * Return null to suppress selection.
   * Default: identity (no transform).
   *
   * Override to resolve: `views.gauge.selectionTransform = (item, data) => data?.nodes.find(n => n.id === item.parentId) ?? item`
   */
  selectionTransform: (item: DashboardEntry, data: DashboardData | null) => DashboardEntry | null =
    (item) => item

  /**
   * Initializes a new instance of the DashboardViewBase.
   * Attaches closed shadow root and adopts shared use-case stylesheets.
   */
  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'closed' })
    this.shadow.adoptedStyleSheets = [healthcareSheet, electricitySheet]
  }

  /**
   * Gets the current dashboard data.
   *
   * @returns Data or null
   */
  get data(): DashboardData | null {
    return this._data
  }

  /**
   * Sets dashboard data and triggers onDataChanged if initialized.
   *
   * @param value - New data
   */
  set data(value: DashboardData | null) {
    this._data = value
    if (this.initialized) {
      this.onDataChanged(value)
    }
  }

  /**
   * Gets the selection collection.
   *
   * @returns Selection collection or null
   */
  get selection(): ObservableCollection<DashboardEntry> | null {
    return this._selection
  }

  /**
   * Sets selection collection and updates all registered watchers.
   * Auto-reattaches handlers when collection is reassigned.
   *
   * @param value - New selection collection
   */
  set selection(value: ObservableCollection<DashboardEntry> | null) {
    this.detachSelectionWatchers()
    this._selection = value
    this.attachSelectionWatchers()
    if (this.initialized) {
      this.onSelectionChanged(value)
      this.refreshOverlay()
    }
  }

  /**
   * Gets the visible elements collection.
   *
   * @returns Collection of visible element IDs or null
   */
  get visibleElements(): ObservableCollection<number | string> | null {
    return this._visibleElements
  }

  /**
   * Sets visible elements collection and updates all registered watchers.
   * Auto-reattaches handlers when collection is reassigned.
   *
   * @param value - New visible elements collection
   */
  set visibleElements(value: ObservableCollection<number | string> | null) {
    this.detachVisibilityWatchers()
    this._visibleElements = value
    this.attachVisibilityWatchers()
    if (this.initialized) {
      this.onVisibleElementsChanged(value)
      this.refreshOverlay()
    }
  }

  /**
   * Called when element is connected to DOM.
   * Initializes view, sets up listeners and watchers on first connect.
   * Re-attaches watchers and syncs theme on reconnect.
   */
  connectedCallback(): void {
    if (this.initialized) {
      this.attachSelectionWatchers()
      this.attachVisibilityWatchers()
      this.syncTheme()
      this.themeObserver = new MutationObserver(() => this.syncTheme())
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      })
      return
    }

    // Initial setup
    this.syncTheme()
    this.themeObserver = new MutationObserver(() => this.syncTheme())
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })

    // Size host element to fill parent
    this.style.display = 'block'
    this.style.width = '100%'
    this.style.height = '100%'

    // Create view container
    this.viewContainer = this.createViewContainer()
    this.shadow.appendChild(this.viewContainer)

    // Create optional overlay
    const message = this.emptyMessage
    if (message !== null) {
      this.overlayElement = document.createElement('div')
      this.overlayElement.classList.add('card__overlay')
      this.overlayElement.textContent = message
      this.viewContainer.appendChild(this.overlayElement)
    }

    // Call subclass setup
    this.setupView(this.viewContainer)

    // Built-in watchers for overlay synchronization
    const selectionChanged = (): void => {
      this.onSelectionChanged(this._selection)
      this.refreshOverlay()
    }
    const visibilityChanged = (): void => {
      this.onVisibleElementsChanged(this._visibleElements)
      this.refreshOverlay()
    }
    this.watchSelection({ added: selectionChanged, removed: selectionChanged })
    this.watchVisibility({ added: visibilityChanged, removed: visibilityChanged })

    this.initialized = true

    // Trigger initial callbacks
    if (this._data) this.onDataChanged(this._data)
    if (this._selection) this.onSelectionChanged(this._selection)
    if (this._visibleElements) this.onVisibleElementsChanged(this._visibleElements)
    this.refreshOverlay()
  }

  /**
   * Called when element is disconnected from DOM.
   * Cleans up all listeners and watchers.
   */
  disconnectedCallback(): void {
    this.themeObserver?.disconnect()
    this.themeObserver = null
    this.detachSelectionWatchers()
    this.detachVisibilityWatchers()
  }

  /**
   * Permanently destroys this view and releases all resources.
   * Call only when element is truly removed from page, NOT during
   * DOM moves (expand/collapse) or use-case switches (use resetToDefaults instead).
   */
  destroy(): void {
    this.themeObserver?.disconnect()
    this.themeObserver = null
    this.detachSelectionWatchers()
    this.detachVisibilityWatchers()
    this.selectionWatchers = []
    this.visibilityWatchers = []
    this.tearDownView()

    this.viewContainer?.remove()
    this.viewContainer = null
    this.overlayElement = null
    this.initialized = false
  }

  /**
   * Re-runs the data render path.
   * Selection/visibility changes are reactive via watchers and don't need explicit refresh.
   */
  refresh(): void {
    if (this.initialized && this._data) this.onDataChanged(this._data)
  }

  /**
   * Applies selectionTransform to item and adds result to selection.
   * Use in subclasses instead of direct _selection assignment.
   *
   * @param item - Entry to transform and add
   */
  protected applySelectionTransformAndAdd(item: DashboardEntry): void {
    if (!this._selection) return
    const transformed = this.selectionTransform(item, this._data)
    if (transformed != null) {
      this._selection.clear()
      this._selection.add(transformed)
    }
  }

  /**
   * Adopts an additional CSSStyleSheet into this component's shadow root.
   *
   * @param sheet - CSSStyleSheet to adopt
   */
  protected adoptStyleSheet(sheet: CSSStyleSheet): void {
    this.shadow.adoptedStyleSheets = [...this.shadow.adoptedStyleSheets, sheet]
  }

  /**
   * Registers sticky handlers for selection changes.
   * Handlers are auto-reattached when selection collection is reassigned.
   * Safe to call from setupView before selection is assigned.
   * Only fires for items passing acceptsSelectionItem predicate.
   *
   * @param handlers - Object with optional callbacks that are invoked when items are added/removed
   * @param [handlers.added] - Callback invoked when an item is added to the selection
   * @param [handlers.removed] - Callback invoked when an item is removed from the selection
   */
  protected watchSelection(handlers: {
    added?: (item: DashboardEntry) => void
    removed?: (item: DashboardEntry) => void
  }): void {
    const watcher: SelectionWatcher = { ...handlers }
    this.selectionWatchers.push(watcher)
    if (this._selection) {
      watcher.cleanup = this.attachSelectionListeners(this._selection, watcher)
    }
  }

  /**
   * Registers sticky handlers for visibility changes.
   * Same semantics as watchSelection.
   *
   * @param handlers - Object with optional added/removed callbacks
   * @param [handlers.added] - Callback invoked when an id is added to visibility
   * @param [handlers.removed] - Callback invoked when an id is removed from visibility
   */
  protected watchVisibility(handlers: {
    added?: (id: number | string) => void
    removed?: (id: number | string) => void
  }): void {
    const watcher: VisibilityWatcher = { ...handlers }
    this.visibilityWatchers.push(watcher)
    if (this._visibleElements) {
      watcher.cleanup = this.attachVisibilityListeners(this._visibleElements, watcher)
    }
  }

  /**
   * Syncs component data-theme attribute with document.
   */
  private syncTheme(): void {
    const theme = document.documentElement.getAttribute('data-theme')
    if (theme) {
      this.setAttribute('data-theme', theme)
    } else {
      this.removeAttribute('data-theme')
    }
  }

  /**
   * Returns overlay message text. Return null to suppress overlay entirely.
   *
   * @returns Message string or null
   */
  protected get emptyMessage(): string | null {
    return 'No data matches the current filters.'
  }

  /**
   * Predicate driving overlay visibility.
   * Recomputed whenever selection or visibility changes.
   * Default: show when no elements visible.
   * Override for selection-driven overlays (Properties, Neighborhood).
   *
   * @returns True if overlay should be shown
   */
  protected shouldShowOverlay(): boolean {
    return !this._data || !this._visibleElements || this._visibleElements.size === 0
  }

  /**
   * Creates the view-specific container element.
   * Default: neutral div filling shadow root.
   * Graph views typically override to add graph-component CSS class.
   *
   * @returns Container HTMLElement
   */
  protected createViewContainer(): HTMLElement {
    const div = document.createElement('div')
    div.style.width = '100%'
    div.style.height = '100%'
    return div
  }

  /**
   * Subclass implementation: build the view visualization.
   *
   * @param container - View container element
   */
  protected abstract setupView(container: HTMLElement): void

  /**
   * Subclass cleanup: tear down view resources.
   */
  protected tearDownView(): void {}

  /**
   * Template method: called when data changes.
   *
   * @param _data - New data or null
   */
  protected onDataChanged(_data: DashboardData | null): void {}

  /**
   * Template method: called when selection changes.
   *
   * @param _selection - New selection or null
   */
  protected onSelectionChanged(_selection: ObservableCollection<DashboardEntry> | null): void {}

  /**
   * Template method: called when visible elements change.
   *
   * @param _visibleElements - New visible elements or null
   */
  protected onVisibleElementsChanged(
    _visibleElements: ObservableCollection<number | string> | null
  ): void {}

  /**
   * Updates overlay visibility based on shouldShowOverlay predicate.
   */
  protected refreshOverlay(): void {
    if (this.overlayElement) {
      this.overlayElement.classList.toggle('visible', this.shouldShowOverlay())
    }
  }

  /**
   * Resets component settings to defaults.
   * Override to add view-specific resets.
   */
  resetToDefaults(): void {
    this.acceptsSelectionItem = (item) => item != null
    this.selectionTransform = (item) => item
  }

  private detachSelectionWatchers(): void {
    for (const w of this.selectionWatchers) {
      w.cleanup?.()
      w.cleanup = undefined
    }
  }

  private attachSelectionWatchers(): void {
    if (!this._selection) return
    for (const w of this.selectionWatchers) {
      w.cleanup = this.attachSelectionListeners(this._selection, w)
    }
  }

  private detachVisibilityWatchers(): void {
    for (const w of this.visibilityWatchers) {
      w.cleanup?.()
      w.cleanup = undefined
    }
  }

  private attachVisibilityWatchers(): void {
    if (!this._visibleElements) return
    for (const w of this.visibilityWatchers) {
      w.cleanup = this.attachVisibilityListeners(this._visibleElements, w)
    }
  }

  /**
   * Attaches collection listeners and returns disposer.
   * Filters added items through acceptsSelectionItem predicate.
   */
  private attachSelectionListeners(
    collection: ObservableCollection<DashboardEntry>,
    watcher: SelectionWatcher
  ): Disposer {
    const onAdded = watcher.added
      ? ({ item }: { item: DashboardEntry }): void => {
          if (this.acceptsSelectionItem(item)) {
            watcher.added!(item)
          }
        }
      : null
    const onRemoved = watcher.removed
      ? ({ item }: { item: DashboardEntry }): void => {
          if (this.acceptsSelectionItem(item)) {
            watcher.removed!(item)
          }
        }
      : null
    if (onAdded) collection.addEventListener('item-added', onAdded)
    if (onRemoved) collection.addEventListener('item-removed', onRemoved)
    return () => {
      if (onAdded) collection.removeEventListener('item-added', onAdded)
      if (onRemoved) collection.removeEventListener('item-removed', onRemoved)
    }
  }

  /**
   * Attaches collection listeners and returns disposer.
   * No filtering for visibility watchers.
   */
  private attachVisibilityListeners(
    collection: ObservableCollection<number | string>,
    watcher: VisibilityWatcher
  ): Disposer {
    const onAdded = watcher.added
      ? ({ item }: { item: number | string }): void => watcher.added!(item)
      : null
    const onRemoved = watcher.removed
      ? ({ item }: { item: number | string }): void => watcher.removed!(item)
      : null
    if (onAdded) collection.addEventListener('item-added', onAdded)
    if (onRemoved) collection.addEventListener('item-removed', onRemoved)
    return () => {
      if (onAdded) collection.removeEventListener('item-added', onAdded)
      if (onRemoved) collection.removeEventListener('item-removed', onRemoved)
    }
  }

  /**
   * Gets the content for the help component.
   * Displayed in help popover when help button is clicked.
   *
   * @returns HTML string with usage instructions
   */
  get helpContent(): string | null {
    return this._helpContent
  }

  /**
   * Gets the content for the help component.
   * Displayed in help popover when help button is clicked.
   *
   * @param value - The help content to be set
   */
  set helpContent(value: string | null) {
    this._helpContent = value
  }
}
