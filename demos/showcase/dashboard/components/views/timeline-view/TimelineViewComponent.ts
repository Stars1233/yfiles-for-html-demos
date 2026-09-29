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
import type { DashboardConnection, DashboardData, DashboardEntry } from '../../../types'
import { EventTimeline } from './eventTimeline/EventTimeline'
import { DashboardViewBase } from '../dashboard-view-base'
import styles from './timeline-view.css?inline'
import timelineStyles from './eventTimeline/eventTimeline.css?inline'
import {
  type GraphViewerInputMode,
  type IEdge,
  type INode,
  MarqueeSelectionInputMode
} from '@yfiles/yfiles'
import { adjustPreventScrolling } from '../graph-view-base'

export type TimeFrameData = {
  timeFrameElements: (string | number)[] | null
  interval: Date[] | null
}

const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(styles)
const timelineSheet = new CSSStyleSheet()
timelineSheet.replaceSync(timelineStyles)

/**
 * Displays events organized chronologically as a timeline graph.
 * Supports interactive exploration with hover tooltips, zooming, panning,
 * and time-region selection for filtering. Edges represent events positioned
 * by timestamp, nodes represent entities involved.
 */
export class TimelineViewComponent extends DashboardViewBase {
  private timeline: EventTimeline | null = null
  private resizeObserver: ResizeObserver | null = null

  /**
   * Creates the view container with graph-component styling.
   *
   * @returns HTMLElement configured as timeline container
   */
  protected createViewContainer(): HTMLElement {
    const div = super.createViewContainer()
    div.classList.add('graph-component')
    return div
  }

  /**
   * Returns empty state message shown when no events available.
   *
   * @returns Message string or null
   */
  protected get emptyMessage(): string | null {
    return 'No events found.'
  }

  /**
   * Determines whether overlay should be shown.
   * Shows overlay when no edges or no visible elements.
   *
   * @returns True if overlay should display
   */
  protected shouldShowOverlay(): boolean {
    if (!this.data) return false
    return this.data.edges.length === 0 || !this.visibleElements || this.visibleElements.size === 0
  }

  /**
   * Initializes the EventTimeline with accessors and configuration.
   * Sets up marquee selection listener for time-region filtering.
   * Configures viewport interaction prevention on small screens.
   *
   * @param container - Container element for timeline
   */
  protected setupView(container: HTMLElement): void {
    this.adoptStyleSheet(styleSheet)
    this.adoptStyleSheet(timelineSheet)
    this.timeline = new EventTimeline({
      selector: container as unknown as string,
      accessors: {
        // Extract timestamp from edge for positioning
        timeAccessorFunction: (edge: IEdge) => {
          const sourceEntry = edge.tag as DashboardConnection
          return sourceEntry.time ? new Date(sourceEntry.time) : new Date(Date.now())
        },
        // Extract display name from node
        nodeLabelAccessor: (node: INode) => (node.tag as DashboardEntry).name,
        // Extract event type from edge
        edgeLabelAccessor: (edge: IEdge) => (edge.tag as DashboardConnection).type,
        // Group nodes by parent for hierarchy
        nodeGroupAccessor: (node: INode) => String((node.tag as DashboardEntry).parentId)
      },
      config: {
        defaultColors: ['#e8536a'],
        edgeThickness: 2,
        edgeRadius: 1,
        edgeAggregationDelta: 3,
        hideLowDetailLabel: true
      }
    })

    const graphComponent = this.timeline.graphComponent
    const inputMode = graphComponent.inputMode as GraphViewerInputMode
    const marqueeMode = inputMode
      .getSortedModes()
      .filter(
        (m): m is MarqueeSelectionInputMode =>
          m instanceof MarqueeSelectionInputMode && m !== inputMode.marqueeSelectionInputMode
      )
      .at(0)!
    // Listen for time region selection via marquee drag
    marqueeMode.addEventListener('drag-finished', () => {
      this.updateTimeFilter()
    })

    adjustPreventScrolling(graphComponent, this.parentElement?.parentElement)
  }

  /**
   * Updates time-based filtering by calculating visible time range in viewport.
   * Dispatches 'timeframe-changed' event with filtered edge IDs and time interval.
   * Pass reset=true to clear all filters and show all edges.
   *
   * @param reset - If true, clears filters and shows all data (default: false)
   */
  updateTimeFilter(reset: boolean = false): void {
    const graphComponent = this.timeline?.graphComponent
    if (!graphComponent || !this.data || !this.visibleElements) {
      return
    }

    if (reset) {
      this.dispatchEvent(new CustomEvent('timeframe-changed', { bubbles: true, detail: null }))
    } else {
      const timeFrameElements: (string | number)[] = []
      const interval = this.timeline!.viewportManager.calculateVisibleRange(graphComponent.viewport)
      const [start, end] = interval
      // Filter edges that fall within visible time range
      this.data.edges
        .filter((edge) => {
          if (!edge.time) return false
          const ts = Date.parse(edge.time)
          return !Number.isNaN(ts) && ts >= start.getTime() && ts <= end.getTime()
        })
        .forEach((edge) => {
          timeFrameElements.push(edge.id)
        })
      this.dispatchEvent(
        new CustomEvent('timeframe-changed', {
          bubbles: true,
          detail: { timeFrameElements, interval }
        })
      )
    }
  }

  /**
   * Cleans up timeline on view teardown.
   */
  protected tearDownView(): void {
    this.timeline = null
  }

  /**
   * Called when dashboard data changes.
   * Updates timeline with filtered nodes (excluding groups) and all edges.
   * Resets zoom to fit all content.
   *
   * @param data - New dashboard data or null
   */
  protected async onDataChanged(data: DashboardData | null): Promise<void> {
    if (!this.timeline || !data) {
      return
    }
    await this.timeline.setData(
      { nodes: data.nodes.filter((node) => !node.isGroup), edges: data.edges },
      true
    )
    await this.timeline.resetZoom()
  }

  /**
   * Called when element is inserted into DOM.
   * Sets up resize observer to fit content on resize.
   */
  connectedCallback(): void {
    super.connectedCallback()
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.fitContent()
      })
    })
    this.resizeObserver.observe(this)
  }

  /**
   * Called when element is removed from DOM.
   * Cleans up resize observer.
   */
  disconnectedCallback(): void {
    this.resizeObserver?.disconnect()
  }

  /**
   * Fits timeline content to current viewport by resetting zoom.
   */
  fitContent(): void {
    void this.timeline?.resetZoom()
  }
}

customElements.define('timeline-view', TimelineViewComponent)
