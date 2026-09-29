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
import { License, ObservableCollection } from '@yfiles/yfiles'
import licenseData from '../../../lib/license.json'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import type { DashboardEntry } from './types'
import { GraphViewBase } from './components/views/graph-view-base'
import { FilterViewComponent } from './components/views/filter-view/FilterViewComponent'
import { NeighborhoodViewComponent } from './components/views/neighborhood-view/NeighborhoodViewComponent'
import { DashboardManager } from './DashboardManager'
import type { CardHeader } from './components/card-header/card-header'
import type { FloatingToolbar, ToolbarButton } from './components/floating-toolbar/floating-toolbar'
import './dashboard.css'
import './components/dashboard-card/dashboard-card'
import './components/card-header/card-header'
import './components/card-menu/card-menu'
import './components/floating-toolbar/floating-toolbar'
import type { ResolvedViews, UseCase } from './use-cases/use-case'
import { HealthcareUseCase } from './use-cases/healthcare-use-case/healthcare-use-case'
import { type AnyView, VIEW_REGISTRY, type ViewId } from './components/views/view-registry'
import { ElectricityUseCase } from './use-cases/electricity-use-case/electricity-use-case'
import { startTour } from '@yfiles/demo-app/modern/tour'
import { tour } from './tour/tour'
import { TimelineViewComponent } from './components/views/timeline-view'
import { showLoadingIndicator } from '@yfiles/demo-app/modern/element-utils'

const USE_CASES: UseCase[] = [HealthcareUseCase, ElectricityUseCase]
const dashboardManager = new DashboardManager('.demo-page__main-dashboard')

/** Map from viewId to the dashboard-card selector that hosts it */
const CARD_FOR_VIEW: Partial<Record<ViewId, string>> = {
  legend: '#legend-card',
  topology: '#topology-card',
  sankey: '#sankey-card',
  gauge: '#gauge-card',
  pie: '#pie-card',
  multiplePie: '#multiple-pie-card',
  map: '#map-card',
  neighborhood: '#neighborhood-card',
  filter: '#filter-card',
  table: '#table-card',
  timeline: '#timeline-card',
  timelineSlider: '#timeline-slider-card',
  properties: '#properties-card'
}

/**
 * Bootstraps the demo application.
 * Initializes use case selector, loads initial use case from URL, and enables guided tour.
 *
 * @returns Promise resolving when demo is ready
 */
async function run(): Promise<void> {
  License.value = licenseData

  addExamplesButton(USE_CASES)
  const urlParams = new URLSearchParams(window.location.search)
  const example = urlParams.get('usecase')
  const useCase = USE_CASES.find((uc) => uc.id === example) ?? USE_CASES[0]
  await applyUseCase(useCase)

  // Enable guided tour
  const guidedTourTriggers = document.querySelectorAll<HTMLElement>('.guided-tour-trigger')
  for (const guidedTourTrigger of guidedTourTriggers) {
    guidedTourTrigger.classList.remove('hidden')
    guidedTourTrigger.addEventListener('click', async () => {
      startTour(tour)
    })
  }
}

let activeSelection: ObservableCollection<DashboardEntry> | null = null
let activeVisibleElements: ObservableCollection<number | string> | null = null
let activeAbortController: AbortController | null = null
let popstateHandler: (() => void) | null = null

/**
 * Applies a use case to the dashboard.
 * Tears down previous use case state, resolves and configures views, updates UI,
 * and syncs URL state for back/forward navigation.
 * Views are persistent DOM elements, never destroyed on use case switch.
 *
 * @param useCase - Use case to apply
 * @returns Promise resolving when use case fully applied
 */
async function applyUseCase(useCase: UseCase): Promise<void> {
  await showLoadingIndicator(true)

  // Collapse any expanded card before switching.
  await dashboardManager.collapseExpanded()

  // Clear previous state
  activeSelection?.clear()
  activeVisibleElements?.clear()
  activeAbortController?.abort()

  // Initialize fresh state for this use case
  const abortController = new AbortController()
  const signal = abortController.signal
  const selection = new ObservableCollection<DashboardEntry>()
  const visibleElements = new ObservableCollection<number | string>()
  const data = useCase.loadData()

  activeSelection = selection
  activeVisibleElements = visibleElements
  activeAbortController = abortController

  // Update card visibility based on use case's declared views
  syncCardVisibility(useCase.viewIds as ViewId[])

  // Resolve persistent view instances from registry
  const views = resolveViews(useCase.viewIds)

  // Reset all views to default state before reconfiguring
  for (const view of Object.values(views) as AnyView[]) {
    view?.resetToDefaults()
  }

  // Configure views according to use case requirements
  useCase.configureViews(views)

  // Pre-populate visibleElements with all nodes so filter predicate is never empty
  for (const node of data.nodes) {
    visibleElements.add(node.id)
  }

  // Wire views: attach selection/visibility and set up listeners
  for (const [name, view] of Object.entries(views) as [ViewId, AnyView][]) {
    if (view) {
      view.selection = selection
      view.visibleElements = visibleElements

      // When one view updates data (e.g., timeline), refresh others
      view.addEventListener(
        'dashboard-data-updated',
        () => {
          for (const otherView of Object.values(views)) {
            if (otherView !== view) {
              otherView?.refresh()
            }
          }
        },
        { signal }
      )

      wireToolbar(name, view)
      wireFilterReset(view, signal)
    }
  }

  // Set data last — triggers onDataChanged with visibleElements already populated
  for (const view of Object.values(views) as AnyView[]) {
    if (view) {
      view.data = data
    }
  }

  wireNeighborhoodHeader(views)
  wireHelp(views)

  updateToggleButton(useCase)

  updateDescriptionCard(useCase)

  // Sync URL state for browser history
  const urlParams = new URLSearchParams(window.location.search)
  urlParams.set('usecase', useCase.id)
  window.history.pushState(null, '', `?${urlParams.toString()}`)

  // Handle back/forward navigation
  if (popstateHandler) {
    window.removeEventListener('popstate', popstateHandler)
  }

  popstateHandler = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const example = urlParams.get('usecase')
    const activeUseCase = USE_CASES.find((uc) => uc.id === example)
    if (activeUseCase) {
      void applyUseCase(activeUseCase)
    }
  }

  window.addEventListener('popstate', popstateHandler)

  document.querySelector<HTMLElement>('.demo-page__main-dashboard')!.style.visibility = ''
  document.querySelector<HTMLElement>('.description-panel')!.style.visibility = ''
  // Reset after the new views and card layout have finished updating.
  dashboardManager.resetScrollPosition()
  await showLoadingIndicator(false)
}

/**
 * Updates the description card UI to show the active use case label and description.
 *
 * @param useCase - Active use case
 */
function updateDescriptionCard(useCase: UseCase): void {
  const cardTitle = document.querySelector<HTMLElement>('#dashboard-title')
  if (cardTitle) {
    cardTitle.textContent = `${useCase.label} Dashboard`
  }

  const healthcareDesc = document.querySelector<HTMLElement>('#healthcare-description')
  const electricityDesc = document.querySelector<HTMLElement>('#electricity-description')

  if (healthcareDesc) {
    healthcareDesc.style.display = useCase.id === 'healthcare' ? 'block' : 'none'
  }
  if (electricityDesc) {
    electricityDesc.style.display = useCase.id === 'electricity' ? 'block' : 'none'
  }
}

/**
 * Shows or hides dashboard cards based on which views are active in the use case.
 *
 * @param activeIds - View IDs that should be visible
 */
function syncCardVisibility(activeIds: ViewId[]): void {
  const activeSet = new Set(activeIds)

  for (const [viewId, selector] of Object.entries(CARD_FOR_VIEW) as [ViewId, string][]) {
    const card = document.querySelector<HTMLElement>(selector)
    if (!card) continue
    card.classList.toggle('hidden', !activeSet.has(viewId))
  }
}

/**
 * Resolves view instances from the registry by ID.
 * Returns only the views declared by the use case.
 *
 * @param ids - View IDs to resolve
 * @returns Typed map of view instances
 */
function resolveViews<TIds extends ViewId>(ids: TIds[]): ResolvedViews<TIds> {
  return Object.fromEntries(ids.map((id) => [id, VIEW_REGISTRY[id]()])) as ResolvedViews<TIds>
}

/**
 * Wires the toolbar for a specific view.
 * Adds zoom/fit buttons for GraphViewBase, fit/update buttons for TimelineViewComponent.
 *
 * @param name - View ID
 * @param view - View instance
 */
function wireToolbar(name: ViewId, view: AnyView): void {
  const toolbar = document.querySelector<FloatingToolbar>(`#${name}__toolbar`)
  if (!toolbar) {
    return
  }
  toolbar.clearButtons()

  if (view instanceof GraphViewBase) {
    const buttons: ToolbarButton[] = [
      {
        id: 'fit',
        icon: 'zoom_out_map',
        label: 'Fit to View',
        className: 'toolbar__button--info',
        onClick: () => view.fitBounds()
      },
      {
        id: 'zoom-in',
        icon: 'zoom_in',
        label: 'Zoom In',
        className: 'toolbar__button--primary',
        onClick: () => view.increaseZoom()
      },
      {
        id: 'zoom-out',
        icon: 'zoom_out',
        label: 'Zoom Out',
        className: 'toolbar__button--primary',
        onClick: () => view.decreaseZoom()
      }
    ]
    toolbar.addButtons(buttons)
  } else if (view instanceof TimelineViewComponent) {
    toolbar.addButton({
      id: 'fit',
      icon: 'zoom_out_map',
      label: 'Fit to View',
      className: 'toolbar__button--info',
      onClick: () => {
        view.fitContent()
        view.updateTimeFilter(true)
      }
    })
  }
}

/**
 * Wires the filter reset button to clear all active filters in FilterViewComponent.
 *
 * @param view - View instance
 * @param signal - Abort signal for cleanup
 */
function wireFilterReset(view: AnyView, signal: AbortSignal): void {
  if (!(view instanceof FilterViewComponent)) return
  document
    .querySelector<HTMLButtonElement>('#reset-filters')
    ?.addEventListener('click', () => view.reset(), { signal })
}

/**
 * Wires the help button to show the help popup window.
 *
 * @param views - Resolved view instances
 */
function wireHelp(views: Partial<Record<ViewId, AnyView>>): void {
  const timeline = views.timeline
  if (!(timeline instanceof TimelineViewComponent)) {
    return
  }
  const header = document.querySelector<CardHeader>('#timeline-view__header')!
  header.helpContent = timeline.helpContent
}

/**
 * Wires the neighborhood view header with direction toggle buttons.
 * Adds buttons to switch between predecessors, successors, and both directions.
 *
 * @param views - Resolved view instances
 */
function wireNeighborhoodHeader(views: Partial<Record<ViewId, AnyView>>): void {
  const neighborhood = views.neighborhood
  if (!(neighborhood instanceof NeighborhoodViewComponent)) {
    return
  }

  const header = document.querySelector<CardHeader>('#neighborhood__header')
  if (!header) return

  header.buttons = [
    {
      label: 'Predecessors',
      action: () => {
        neighborhood.direction = 'predecessor'
      }
    },
    {
      label: 'Successors',
      action: () => {
        neighborhood.direction = 'successor'
      }
    },
    {
      label: 'Both',
      action: () => {
        neighborhood.direction = 'both'
      }
    }
  ]
}

/**
 * Creates and inserts the use case selector button and popover into the navbar.
 * Allows switching between different dashboard examples.
 *
 * @param useCases - Available use cases
 */
function addExamplesButton(useCases: UseCase[]): void {
  const btn = document.createElement('button')
  btn.id = 'examples-button'
  btn.setAttribute('data-tip-id', 'switch-examples')
  btn.ariaLabel = 'Example Dashboards'
  btn.title = 'Choose a dashboard example'
  btn.innerHTML = `
  <span class="icon">list</span>
  <span class="label">Examples</span>
    `

  // Create popover with use case options
  const currentUrl = new URL(window.location.href)
  const healthcareUrl = new URL(currentUrl)
  healthcareUrl.searchParams.set('usecase', 'healthcare')
  const electricityUrl = new URL(currentUrl)
  electricityUrl.searchParams.set('usecase', 'electricity')

  const popover = document.createElement('div')
  popover.id = 'examples-popover'
  popover.popover = 'auto'
  popover.classList.add('rail-popover', 'dialog', 'text-content')
  popover.innerHTML = `
    <div class="examples-container">
      <div class="example" id="healthcare-example">Healthcare Dashboard</div>
      <div class="example" id="electricity-example">Electricity Dashboard</div>
    </div>`

  // Wire up example selection
  popover.querySelectorAll('.example').forEach((example, index) => {
    if (example.id === 'healthcare-example' && window.location.search.includes('healthcare')) {
      example.classList.add('selected')
    } else if (
      example.id === 'electricity-example' &&
      window.location.search.includes('electricity')
    ) {
      example.classList.add('selected')
    }

    example.addEventListener('click', () => {
      popover.querySelectorAll('.example').forEach((s) => s.classList.remove('selected'))
      example.classList.add('selected')
      popover.hidePopover()
      void applyUseCase(useCases[index])
    })
  })

  // Link button to popover
  btn.setAttribute('popovertarget', 'examples-popover')

  document.body.appendChild(popover)

  const navbar = document.querySelector<HTMLButtonElement>('.navbar>nav')
  navbar?.prepend(btn)
}

/**
 * Updates the use case toggle button text to show the next available use case.
 *
 * @param useCase - Currently active use case
 */
function updateToggleButton(useCase: UseCase): void {
  const btn = document.getElementById('use-case-toggle') as HTMLButtonElement | null
  if (!btn) return
  const next = USE_CASES.find((uc) => uc.id !== useCase.id)
  btn.dataset.current = useCase.id
  btn.textContent = `Go to ${next?.label} Dashboard`
}

// ============================================================================
// Boot Application
// ============================================================================
void run().then(finishLoading)
