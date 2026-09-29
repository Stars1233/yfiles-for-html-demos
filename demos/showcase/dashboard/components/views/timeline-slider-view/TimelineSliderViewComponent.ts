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
import timelineStyles from './timeline-slider-view.css?inline'
import type { DashboardData } from '../../../types'

const timelineSheet = new CSSStyleSheet()
timelineSheet.replaceSync(timelineStyles)

/**
 * TimelineSliderViewComponent Web Component
 *
 * An interactive timeline slider for navigating timeseries data with playback controls.
 * Displays timestamps, plays through data at 1-second intervals, and shows event markers
 * that can be clicked to jump to specific timepoints.
 *
 * Features:
 * - Range slider with event tick marks and playback controls
 * - Automatic playback cycling through all timestamps
 * - Event tagging with formatted names and dates
 * - Updates node/edge currentTimestampData and lastTimestampData on slider change
 * - Dispatches custom 'dashboard-data-updated' event for dependent views
 * - Clears selection when play starts
 *
 * Data Expectations:
 * - Nodes/edges have optional timeseries array with { timestamp, event_tag, ...data }
 * - Uses first node with timeseries as timestamp source (assumes all nodes aligned)
 */
export class TimelineSliderViewComponent extends DashboardViewBase {
  private slider: HTMLInputElement | null = null
  private timestampDisplay: HTMLDivElement | null = null
  private playPauseButton: HTMLButtonElement | null = null
  private eventTagsContainer: HTMLDivElement | null = null
  // All unique timestamps from timeseries data
  private allTimestamps: string[] = []
  // Events extracted from timeseries with formatted names
  private events: { timestamp: string; tag: string; index: number }[] = []
  private isPlaying = false
  private playInterval: number | null = null

  /**
   * Initializes timeline UI with slider, controls, and event buttons.
   * Loads Material Symbols font for play/pause icons.
   */
  protected setupView(container: HTMLElement): void {
    this.adoptStyleSheet(timelineSheet)
    const fontLink = document.createElement('link')
    fontLink.rel = 'stylesheet'
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
    this.shadow.appendChild(fontLink)

    const controls = document.createElement('div')
    controls.className = 'timeline-controls'

    this.timestampDisplay = document.createElement('div')
    this.timestampDisplay.className = 'current-date'
    this.timestampDisplay.textContent = 'Select Timestamp'

    controls.appendChild(this.timestampDisplay)

    const sliderWrapper = document.createElement('div')
    sliderWrapper.className = 'slider-container'

    const sliderAndTicks = document.createElement('div')
    sliderAndTicks.className = 'slider-and-ticks'

    // Create range slider input
    this.slider = document.createElement('input')
    this.slider.type = 'range'
    this.slider.min = '0'
    this.slider.max = '0'
    this.slider.value = '0'
    this.slider.disabled = true

    // Stop playback and update data on manual slider move
    this.slider.addEventListener('input', () => {
      this.updateDataForTimestamp(parseInt(this.slider!.value))
      if (this.isPlaying) {
        this.stop()
      }
    })

    // Play/pause button
    this.playPauseButton = document.createElement('button')
    this.playPauseButton.className = 'play-pause-button'
    this.playPauseButton.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>'
    this.playPauseButton.title = 'Play'
    this.playPauseButton.onclick = () => this.togglePlay()

    sliderAndTicks.appendChild(this.slider)
    sliderWrapper.appendChild(sliderAndTicks)
    sliderWrapper.appendChild(this.playPauseButton)

    const eventsHeading = document.createElement('h3')
    eventsHeading.className = 'events-heading'
    eventsHeading.textContent = 'Events'

    this.eventTagsContainer = document.createElement('div')
    this.eventTagsContainer.className = 'event-tags-container'

    container.appendChild(controls)
    container.appendChild(sliderWrapper)
    container.appendChild(eventsHeading)
    container.appendChild(this.eventTagsContainer)
  }

  /**
   * Toggles between play and pause states.
   * Clears selection when starting playback.
   */
  private togglePlay(): void {
    this.selection?.clear()
    if (this.isPlaying) {
      this.stop()
    } else {
      this.play()
    }
  }

  /**
   * Starts timeline playback, advancing to next timestamp every 1 second.
   * Cycles back to start when reaching end.
   */
  private play(): void {
    if (this.isPlaying || this.allTimestamps.length === 0) return
    this.isPlaying = true
    this.playPauseButton!.innerHTML = '<span class="material-symbols-outlined">pause</span>'
    this.playPauseButton!.title = 'Pause'

    this.playInterval = window.setInterval(() => {
      let nextIndex = parseInt(this.slider!.value) + 1
      if (nextIndex >= this.allTimestamps.length) {
        nextIndex = 0
      }
      this.slider!.value = nextIndex.toString()
      this.updateDataForTimestamp(nextIndex)
    }, 1000)
  }

  /**
   * Stops timeline playback and updates button UI.
   */
  private stop(): void {
    if (!this.isPlaying) return
    this.isPlaying = false
    this.playPauseButton!.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>'
    this.playPauseButton!.title = 'Play'
    if (this.playInterval) {
      clearInterval(this.playInterval)
      this.playInterval = null
    }
  }

  private isUpdatingFromData = false

  /**
   * Formats event tag from snake_case to Title Case.
   * Example: "production_started" → "Production Started"
   *
   * @param name - Event tag to format
   * @returns Formatted event name
   */
  private formatEventName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Called when dashboard data changes.
   * Extracts timestamps and events from first node's timeseries.
   * Rebuilds slider range and event buttons.
   * Skips update if triggered by own data modification.
   *
   * @param data - Updated dashboard data
   */
  protected onDataChanged(data: DashboardData): void {
    if (this.isUpdatingFromData) {
      return
    }
    if (data.nodes.length > 0) {
      // Collect all unique timestamps and events from nodes
      const newTimestamps: string[] = []
      const newEvents: { timestamp: string; tag: string; index: number }[] = []

      // Use first node with timeseries as timestamp source (assumes all aligned)
      const firstNodeWithSeries = data.nodes.find((n) => n.timeseries && n.timeseries.length > 0)
      if (firstNodeWithSeries) {
        firstNodeWithSeries.timeseries?.forEach((ts) => {
          newTimestamps.push(ts.timestamp)
        })

        // Extract unique events across all nodes, maintain order
        const eventMap = new Map<string, { timestamp: string; tag: string; index: number }>()
        data.nodes.forEach((node) => {
          if (node.timeseries) {
            node.timeseries.forEach((ts, index) => {
              if (ts.event_tag && ts.event_tag.trim().length > 0) {
                if (!eventMap.has(ts.event_tag)) {
                  eventMap.set(ts.event_tag, {
                    timestamp: ts.timestamp,
                    tag: this.formatEventName(ts.event_tag),
                    index
                  })
                }
              }
            })
          }
        })
        newEvents.push(...Array.from(eventMap.values()).sort((a, b) => a.index - b.index))

        // Check if timestamps actually changed to avoid unnecessary resets
        const timestampsChanged =
          this.allTimestamps.length !== newTimestamps.length ||
          this.allTimestamps[0] !== newTimestamps[0] ||
          this.allTimestamps[this.allTimestamps.length - 1] !==
            newTimestamps[newTimestamps.length - 1]
        if (timestampsChanged) {
          this.allTimestamps = newTimestamps
          this.events = newEvents
          this.slider!.max = (this.allTimestamps.length - 1).toString()
          this.slider!.disabled = false
          this.slider!.value = '0'
          this.updateDataForTimestamp(0)
        } else {
          // Timestamps unchanged but DOM rebuilt — update events only
          this.events = newEvents
        }

        // Always refresh event buttons
        this.updateEventButtons()
      } else {
        this.allTimestamps = []
        this.events = []
        this.slider!.disabled = true
        this.timestampDisplay!.textContent = 'No timeseries data'
        this.updateEventButtons()
      }
    } else {
      this.allTimestamps = []
      this.events = []
      this.slider!.disabled = true
      this.updateEventButtons()
    }
  }

  /**
   * Rebuilds event buttons in the events container.
   * Each button shows event name and date, clicking jumps to that timestamp.
   */
  private updateEventButtons(): void {
    this.eventTagsContainer!.innerHTML = ''

    // Update datalist ticks for slider
    const dataList = this.slider?.parentElement?.querySelector('datalist')
    if (dataList) {
      dataList.innerHTML = ''

      // Add tick marks at event positions
      this.events.forEach((event) => {
        const option = document.createElement('option')
        option.value = event.index.toString()
        option.setAttribute('data-label', event.tag)
        dataList.appendChild(option)
      })
    }

    // Create clickable event buttons
    this.events.forEach((event) => {
      const btn = document.createElement('button')
      btn.className = 'event-button'

      const date = new Date(event.timestamp)
      const dateString = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      btn.innerHTML = `
        <div class="event-icon"><span class="material-symbols-outlined">event</span></div>
        <div class="event-content">
          <div class="event-title">${event.tag}</div>
          <div class="event-date">${dateString}</div>
        </div>
      `
      btn.onclick = () => {
        this.slider!.value = event.index.toString()
        this.updateDataForTimestamp(event.index)
        if (this.isPlaying) {
          this.stop()
        }
      }
      this.eventTagsContainer!.appendChild(btn)
    })
  }

  /**
   * Updates node and edge currentTimestampData/lastTimestampData for given timestamp index.
   * Dispatches 'dashboard-data-updated' event to notify other views.
   * Sets flag to prevent recursive data updates.
   *
   * @param index - Timestamp index to activate
   */
  private updateDataForTimestamp(index: number): void {
    const timestamp = this.allTimestamps[index]
    if (!timestamp || !this.data) return

    this.timestampDisplay!.textContent = new Date(timestamp).toLocaleTimeString()

    this.isUpdatingFromData = true
    try {
      // Update each node's current/last timestamp data
      this.data.nodes.forEach((node) => {
        if (node.timeseries) {
          const entry = node.timeseries.find((ts) => ts.timestamp === timestamp)
          if (entry) {
            node.lastTimestampData = node.currentTimestampData
            node.currentTimestampData = entry
          }
        }
      })

      // Update each edge's current/last timestamp data if present
      this.data.edges.forEach((edge) => {
        if (edge.timeseries) {
          const entry = edge.timeseries.find((ts) => ts.timestamp === timestamp)
          if (entry) {
            edge.lastTimestampData = edge.currentTimestampData
            edge.currentTimestampData = entry
          }
        }
      })

      // Notify other views of data update
      this.dispatchEvent(new CustomEvent('dashboard-data-updated', { bubbles: true }))
    } finally {
      this.isUpdatingFromData = false
    }
  }

  protected tearDownView(): void {
    this.stop()
  }

  protected get emptyMessage(): string | null {
    return null
  }

  protected shouldShowOverlay(): boolean {
    return false
  }
}

customElements.define('timeline-slider-view', TimelineSliderViewComponent)
