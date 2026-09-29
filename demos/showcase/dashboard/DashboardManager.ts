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
import type { DashboardCard } from './components/dashboard-card/dashboard-card'
import type { CardHeader } from './components/card-header/card-header'
import { GraphViewBase } from './components/views/graph-view-base'
import type { MapViewComponent } from './components/views/map-view/MapViewComponent'
import { GRAPH_VIEW_SELECTOR } from './components/views/view-registry'

type CardBounds = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>

/**
 * Manages dashboard layout and card expansion/collapse state.
 * Handles transitions between grid view and single-card expanded view with sidebars.
 * Maintains original card order, manages event listeners, and coordinates view refreshes.
 */
export class DashboardManager {
  private dashboard: HTMLDivElement
  private boundExpandToggleHandler: ((e: Event) => Promise<void>) | null = null
  private boundExpandChangeHandler: ((e: Event) => void) | null = null
  private transitionPromise: Promise<void> | null = null
  // Original card order preserved for restore on collapse
  private originalCardOrder: DashboardCard[] = []
  // Click blocker for expanded card to prevent unintended interactions
  private expandedCardClickBlocker: ((e: Event) => void) | null = null
  // Reference to currently expanded card
  private currentExpandedCard: DashboardCard | null = null

  /**
   * Initializes a new DashboardManager instance.
   * Stores original card order and sets up event listeners.
   *
   * @param dashboardSelector - CSS selector for the dashboard container element
   * @throws { Error } if dashboard element not found
   */
  constructor(dashboardSelector: string) {
    const dashboard = document.querySelector<HTMLDivElement>(dashboardSelector)
    if (!dashboard) {
      throw new Error(`Dashboard element not found: ${dashboardSelector}`)
    }
    this.dashboard = dashboard
    this.storeOriginalOrder()
    this.setupListeners()
  }

  /**
   * Stores the current order of dashboard cards for later restoration.
   */
  private storeOriginalOrder(): void {
    this.originalCardOrder = [...this.dashboard.children].filter(
      (child) => child.tagName === 'DASHBOARD-CARD'
    ) as DashboardCard[]
  }

  /**
   * Sets up event listeners for card expand-toggle and expand-change events.
   * Delegates to handleExpand/handleCollapse based on event detail.
   */
  private setupListeners(): void {
    this.boundExpandToggleHandler = async (e: Event) => {
      const event = e as CustomEvent<{ expanded: boolean }>
      const header = event.target as CardHeader
      const card = header.closest<DashboardCard>('dashboard-card')
      if (!card) return

      if (event.detail.expanded && card.hasAttribute('expanded')) return
      if (!event.detail.expanded && !card.hasAttribute('expanded')) return

      if (event.detail.expanded) {
        await this.runTransition(() => this.handleExpand(card))
      } else {
        await this.runTransition(() => this.handleCollapse(card))
      }
    }

    this.boundExpandChangeHandler = (e: Event) => {
      const event = e as CustomEvent<{ expanded: boolean }>
      const card = event.target as DashboardCard

      if (event.target !== card) return

      const header = card.querySelector<CardHeader>('card-header')
      if (header) {
        header.setExpanded(event.detail.expanded)
      }
    }

    this.dashboard.addEventListener('expand-toggle', this.boundExpandToggleHandler as EventListener)
    this.dashboard.addEventListener('expand-change', this.boundExpandChangeHandler)
  }

  /**
   * Handles expand request for a card.
   * Expands the requested card directly when another card is already expanded.
   *
   * @param card - Card to expand
   * @param withAnimation - Whether to animate the expansion
   */
  private async handleExpand(card: DashboardCard, withAnimation: boolean = true): Promise<void> {
    const currentlyExpanded =
      this.currentExpandedCard ??
      this.dashboard.querySelector<DashboardCard>('dashboard-card[expanded]')

    // Collapse previously expanded card if different
    if (currentlyExpanded && currentlyExpanded !== card) {
      await this.performSwitch(currentlyExpanded, card, withAnimation)
    } else {
      await this.performExpand(card, withAnimation)
    }

    // Update button state only after the transition has completed.
    this.resetCardIcons(card)
  }

  /**
   * Resets the icon of the given expanded card.
   * @param expandedCard - The card that has been previously expanded
   */
  private resetCardIcons(expandedCard: DashboardCard | null = null): void {
    this.originalCardOrder.forEach((card) => {
      const header = card.querySelector<CardHeader>('card-header')
      if (header) {
        header.setExpanded(card === expandedCard)
      }
    })
  }

  /**
   * Handles collapse request for a card.
   *
   * @param card - Card to collapse
   */
  private async handleCollapse(card: DashboardCard): Promise<void> {
    await this.performCollapse(card)
  }

  /**
   * Runs one expand/collapse transition at a time and keeps all collapse buttons disabled while it runs.
   *
   * @param transition - Transition to execute
   * @returns Promise resolving when the transition and button state update are complete
   */
  private runTransition(transition: () => Promise<void>): Promise<void> {
    if (this.transitionPromise) {
      return this.transitionPromise
    }

    this.setCollapseButtonsEnabled(false)
    this.transitionPromise = transition().finally(() => {
      this.setCollapseButtonsEnabled(true)
      this.transitionPromise = null
    })

    return this.transitionPromise
  }

  /**
   * Enables or disables all collapse buttons in the dashboard.
   *
   * @param enabled - Whether collapse buttons should accept input
   */
  private setCollapseButtonsEnabled(enabled: boolean): void {
    this.dashboard.querySelectorAll<CardHeader>('card-header').forEach((header) => {
      header.setCollapseButtonEnabled(enabled)
    })
  }

  /**
   * Applies a dashboard layout change and animates cards between their previous and new bounds.
   *
   * @param cards - Cards whose bounds should be captured and animated
   * @param layoutChange - Layout mutation to apply between the two measurements
   * @param withAnimation - Whether to animate the layout change
   */
  private async runCardLayoutTransition(
    cards: DashboardCard[],
    layoutChange: () => void,
    withAnimation: boolean
  ): Promise<void> {
    const previousBounds = new Map<DashboardCard, CardBounds>()
    const originalTransformOrigins = new Map<DashboardCard, string>()
    const animations: Animation[] = []
    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    this.dashboard.classList.add('is-reorganizing')

    try {
      if (withAnimation && !reducedMotion) {
        cards.forEach((card) => {
          const bounds = card.getBoundingClientRect()
          if (bounds.width > 0 && bounds.height > 0) {
            previousBounds.set(card, bounds)
            originalTransformOrigins.set(card, card.style.transformOrigin)
          }
        })
      }

      layoutChange()

      // Force the final layout to be calculated before measuring and animating it.
      void this.dashboard.offsetHeight

      if (!withAnimation || reducedMotion) return

      cards.forEach((card) => {
        const before = previousBounds.get(card)
        const after = card.getBoundingClientRect()
        if (!before || after.width <= 0 || after.height <= 0) return

        const translateX = before.left - after.left
        const translateY = before.top - after.top
        const scaleX = before.width / after.width
        const scaleY = before.height / after.height
        if (translateX === 0 && translateY === 0 && scaleX === 1 && scaleY === 1) return

        card.style.transformOrigin = 'top left'
        animations.push(
          card.animate(
            [
              {
                transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`
              },
              { transform: 'translate(0, 0) scale(1, 1)' }
            ],
            { duration: 350, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'both' }
          )
        )
      })

      await this.waitForAnimations()
    } finally {
      animations.forEach((animation) => animation.cancel())
      originalTransformOrigins.forEach((transformOrigin, card) => {
        card.style.transformOrigin = transformOrigin
      })
      this.dashboard.classList.remove('is-reorganizing')
    }
  }

  /**
   * Performs card expansion with animation and layout reorganization.
   * Hides graph views temporarily, creates sidebars, rebuilds DOM structure,
   * then restores graph visibility and fits bounds.
   *
   * @param card - Card to expand
   * @param withAnimation - Whether to animate expansion (default: true)
   * @returns Promise resolving when expansion complete
   */
  private async performExpand(card: DashboardCard, withAnimation: boolean = true): Promise<void> {
    await this.performExpandedLayout(card, withAnimation)
  }

  /**
   * Performs an atomic switch from one expanded card to another.
   * Keeps the expanded layout active while both cards change state in one layout mutation.
   *
   * @param previousCard - Card that is currently expanded
   * @param card - Card to expand
   * @param withAnimation - Whether to animate the switch (default: true)
   * @returns Promise resolving when the switch is complete
   */
  private async performSwitch(
    previousCard: DashboardCard,
    card: DashboardCard,
    withAnimation: boolean = true
  ): Promise<void> {
    await this.performExpandedLayout(card, withAnimation, previousCard)
  }

  /**
   * Applies the expanded dashboard layout for a card, optionally replacing another expanded card.
   *
   * @param card - Card to expand
   * @param withAnimation - Whether to animate the layout change
   * @param previousCard - Card to collapse during an atomic switch
   * @returns Promise resolving when the layout change is complete
   */
  private async performExpandedLayout(
    card: DashboardCard,
    withAnimation: boolean,
    previousCard: DashboardCard | null = null
  ): Promise<void> {
    const isFirstExpand = !this.dashboard.classList.contains('has-expanded-card')

    await this.runCardLayoutTransition(
      this.originalCardOrder,
      () => {
        previousCard?.setExpanded(false)
        card.setExpanded(true)
        this.currentExpandedCard = card
        this.dashboard.classList.add('has-expanded-card')
        this.dashboard.style.display = 'flex'
        this.dashboard.style.flexDirection = 'row'

        // Store original order on first expand for restoration
        if (isFirstExpand) {
          this.originalCardOrder.forEach((c, index) => {
            c.setAttribute('data-original-order', String(index))
          })
        }

        // Separate expanded card from others
        const collapsedCards = this.originalCardOrder.filter((c) => c !== card)

        // Create left/right sidebars for collapsed cards
        const { leftSidebar, rightSidebar } = this.createSidebars(collapsedCards)

        // Hide graph views temporarily to prevent rendering artifacts
        this.dashboard.querySelectorAll<Element>(GRAPH_VIEW_SELECTOR).forEach((view) => {
          ;(view as HTMLElement).style.visibility = 'hidden'
        })

        // Rebuild DOM: left sidebar + expanded card + right sidebar
        this.dashboard.innerHTML = ''

        if (leftSidebar.children.length > 0) {
          leftSidebar.style.pointerEvents = 'none'
          this.dashboard.appendChild(leftSidebar)
        }

        this.dashboard.appendChild(card)

        if (rightSidebar.children.length > 0) {
          rightSidebar.style.pointerEvents = 'none'
          this.dashboard.appendChild(rightSidebar)
        }

        // Restore visibility and fit graph views after layout settles
        this.dashboard.querySelectorAll<Element>(GRAPH_VIEW_SELECTOR).forEach((view) => {
          ;(view as HTMLElement).style.removeProperty('visibility')
          if (view instanceof GraphViewBase) {
            view.animateLayout = false
            view.fitBounds()
          }
        })

        this.invalidateMapViews()
        this.dashboard.querySelectorAll<HTMLElement>('[data-sidebar]').forEach((sidebar) => {
          sidebar.style.pointerEvents = ''
        })
      },
      withAnimation
    )
  }

  /**
   * Performs card collapse returning to grid layout.
   * Restores original card order, re-enables animations on graph views,
   * and optionally animates the collapse transition.
   *
   * @param card - Card to collapse
   * @param withAnimation - Whether to animate collapse (default: true)
   * @param scrollToCollapsedCard - Whether to anchor the collapsed card after the transition
   * @returns Promise resolving when collapse complete
   */
  private async performCollapse(
    card: DashboardCard,
    withAnimation: boolean = true,
    scrollToCollapsedCard: boolean = true
  ): Promise<void> {
    const allCards = [...this.dashboard.querySelectorAll<DashboardCard>('dashboard-card')]

    // Remove click blocker from expanded card
    if (this.expandedCardClickBlocker && this.currentExpandedCard) {
      this.currentExpandedCard.removeEventListener('click', this.expandedCardClickBlocker)
      this.expandedCardClickBlocker = null
    }

    await this.runCardLayoutTransition(
      allCards,
      () => {
        this.currentExpandedCard = null
        // Collapse the selected card
        card.setExpanded(false)
        this.dashboard.classList.remove('has-expanded-card')
        this.dashboard.style.removeProperty('display')
        this.dashboard.style.removeProperty('flex-direction')
        this.dashboard.style.removeProperty('--sidebar-card-count')

        // Restore original card order
        allCards.sort(
          (a, b) =>
            Number(a.getAttribute('data-original-order')) -
            Number(b.getAttribute('data-original-order'))
        )

        this.dashboard.innerHTML = ''
        allCards.forEach((c) => {
          c.removeAttribute('data-original-order')
          c.style.removeProperty('visibility')
          this.dashboard.appendChild(c)
        })

        this.originalCardOrder = allCards

        // Restore animations and fit graph views
        this.dashboard.querySelectorAll<Element>(GRAPH_VIEW_SELECTOR).forEach((view) => {
          ;(view as HTMLElement).style.removeProperty('visibility')
          if (view instanceof GraphViewBase) {
            view.animateLayout = true
            view.fitBounds()
          }
        })

        this.invalidateMapViews()
      },
      withAnimation
    )

    if (scrollToCollapsedCard) {
      this.scrollCollapsedCardIntoView(card)
    }
    this.resetCardIcons()
  }

  /**
   * Keeps the collapsed card at the top of the dashboard on responsive layouts.
   *
   * @param card - Card that has just been returned to the grid
   */
  private scrollCollapsedCardIntoView(card: DashboardCard): void {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1300px)').matches) {
      const dashboardBounds = this.dashboard.getBoundingClientRect()
      const cardBounds = card.getBoundingClientRect()
      const paddingTop = Number.parseFloat(getComputedStyle(this.dashboard).paddingTop) || 0
      const scrollDelta = cardBounds.top - dashboardBounds.top - paddingTop
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth'

      this.dashboard.scrollTo({ top: this.dashboard.scrollTop + scrollDelta, behavior })
    }
  }

  /**
   * Waits for all finite CSS animations and transitions currently running in the dashboard.
   * Canceled animations are treated as completed because their visual transition has already
   * been interrupted by a newer layout change.
   */
  private async waitForAnimations(): Promise<void> {
    const animations = this.dashboard
      .getAnimations({ subtree: true })
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)

    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
  }

  /**
   * Invalidates all map views to force re-rendering after layout changes.
   * Calls invalidateMap() on each map-view component.
   */
  private invalidateMapViews(): void {
    this.dashboard.querySelectorAll<Element>('map-view').forEach((view) => {
      const mapView = view as MapViewComponent
      mapView.invalidateMap()
    })
  }

  /**
   * Programmatically expands a card.
   *
   * @param cardElement - Card to expand
   * @returns Promise resolving when expansion complete
   */
  async expand(cardElement: DashboardCard): Promise<void> {
    const header = cardElement.querySelector<CardHeader>('card-header')
    if (header) {
      await this.runTransition(async () => {
        header.setExpanded(true)
        await this.handleExpand(cardElement)
      })
    }
  }

  /**
   * Programmatically collapses a card.
   *
   * @param cardElement - Card to collapse
   * @returns Promise resolving when collapse complete
   */
  async collapse(cardElement: DashboardCard): Promise<void> {
    const header = cardElement.querySelector<CardHeader>('card-header')
    if (header) {
      await this.runTransition(async () => {
        header.setExpanded(false)
        await this.handleCollapse(cardElement)
      })
    }
  }

  /**
   * Creates left and right sidebars for collapsed cards during expansion.
   * Places description card in left sidebar, splits remaining cards evenly,
   * and hides any cards with hidden class.
   *
   * @param collapsedCards - Cards not expanded
   * @returns Object with leftSidebar and rightSidebar elements
   */
  private createSidebars(collapsedCards: DashboardCard[]): {
    leftSidebar: HTMLDivElement
    rightSidebar: HTMLDivElement
  } {
    const descriptionCard = collapsedCards.find((c) => c.id === 'description-card')
    const visibleCards = collapsedCards.filter(
      (c) => !c.classList.contains('hidden') && c.id !== 'description-card'
    )
    const hiddenCards = collapsedCards.filter(
      (c) => c.classList.contains('hidden') && c.id !== 'description-card'
    )

    // Split visible cards evenly between sidebars
    const half = Math.floor(visibleCards.length / 2)
    const leftCards = visibleCards.slice(0, half)
    const rightCards = visibleCards.slice(half)

    // Build left sidebar: description + left cards + hidden cards
    const leftSidebar = document.createElement('div')
    leftSidebar.className = 'cards-sidebar-left'
    leftSidebar.setAttribute('data-sidebar', 'left')

    if (descriptionCard) leftSidebar.appendChild(descriptionCard)
    leftCards.forEach((c) => leftSidebar.appendChild(c))
    hiddenCards.forEach((c) => leftSidebar.appendChild(c))
    leftSidebar.style.setProperty('--sidebar-card-count', String(leftCards.length))

    // Build right sidebar: right cards
    const rightSidebar = document.createElement('div')
    rightSidebar.className = 'cards-sidebar-right'
    rightSidebar.setAttribute('data-sidebar', 'right')
    rightCards.forEach((c) => rightSidebar.appendChild(c))
    rightSidebar.style.setProperty('--sidebar-card-count', String(rightCards.length))

    return { leftSidebar, rightSidebar }
  }

  /**
   * Destroys the DashboardManager and removes all event listeners.
   * Called when dashboard is being removed from page.
   */
  destroy(): void {
    if (this.expandedCardClickBlocker && this.currentExpandedCard) {
      this.currentExpandedCard.removeEventListener('click', this.expandedCardClickBlocker)
      this.expandedCardClickBlocker = null
      this.currentExpandedCard = null
    }

    if (this.boundExpandToggleHandler) {
      this.dashboard.removeEventListener(
        'expand-toggle',
        this.boundExpandToggleHandler as EventListener
      )
      this.boundExpandToggleHandler = null
    }

    if (this.boundExpandChangeHandler) {
      this.dashboard.removeEventListener('expand-change', this.boundExpandChangeHandler)
      this.boundExpandChangeHandler = null
    }
  }

  /**
   * Collapses the currently expanded card without animation.
   * Used when replacing the dashboard data for another example.
   *
   * @returns Promise resolving when the collapse is complete
   */
  async collapseExpanded(): Promise<void> {
    const expanded = this.dashboard.querySelector<DashboardCard>('dashboard-card[expanded]')
    if (expanded) {
      await this.runTransition(() => this.performCollapse(expanded, false, false))
    }
  }

  /**
   * Resets the dashboard scroll position before loading another example.
   */
  resetScrollPosition(): void {
    this.dashboard.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }
}
