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
import styles from './tooltips.css?inline'

/**
 * Configuration object for a tooltip statistic entry.
 *
 * @property label - Label text for the statistic
 * @property value - Value text to display
 * @property accent - Optional flag to highlight the stat value
 */
export type TooltipStat = { label: string; value: string; accent?: boolean }

/**
 * Configuration object for node tooltip data.
 *
 * @property typeColor - CSS color value for type indicator
 * @property icon - Icon content or class name to display
 * @property title - Node title/name
 * @property location - Location or region text
 * @property stats - Array of statistic entries to display
 * @property progress - Progress value between 0 and 1
 * @property progressLabel - Label for the progress bar
 * @property progressText - Text to display next to progress value
 */
export type NodeTooltipData = {
  typeColor: string
  icon: string
  title: string
  location: string
  stats: TooltipStat[]
  progress: number
  progressLabel: string
  progressText: string
}

/**
 * A detailed tooltip element displaying node information with header, statistics,
 * and progress visualization.
 */
export class NodeTooltip extends HTMLElement {
  private readonly shadow: ShadowRoot

  /**
   * Initializes a new instance of the NodeTooltip with DOM structure.
   */
  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    this.shadow.innerHTML = `
      <style>${styles}</style>

      <div class="tooltip-content">
        <div class="header">
          <span class="icon"></span>
          <div class="header-text">
            <div class="title"></div>
            <div class="location">
              <span class="location-icon">location_on</span>
              <span class="location-text"></span>
            </div>
          </div>
        </div>

        <div class="divider"></div>
        <div class="stats"></div>
        <div class="progress-header">
          <span class="progress-label"></span>
          <span class="progress-value"></span>
        </div>

        <div class="progress-track">
          <div class="progress-fill"></div>
        </div>
      </div>
    `
  }

  /**
   * Populates the tooltip with data and renders all elements.
   * Updates header, statistics, progress bar, and type color styling.
   * Progress value is clamped between 0 and 1.
   *
   * @param data - NodeTooltipData object containing all tooltip information
   */
  setData(data: NodeTooltipData): void {
    const s = this.shadow

    // Type color
    const card = s.querySelector<HTMLElement>('.tooltip-content')!
    card.style.setProperty('--type-color', data.typeColor)

    // Header
    s.querySelector('.icon')!.textContent = data.icon
    s.querySelector('.title')!.textContent = data.title
    s.querySelector('.location-text')!.textContent = data.location

    // Stats
    const body = s.querySelector('.stats')!
    body.innerHTML = ''

    for (const stat of data.stats) {
      const statEl = document.createElement('div')
      statEl.className = 'stat'

      const label = document.createElement('div')
      label.className = 'stat-label'
      label.textContent = stat.label

      const value = document.createElement('div')
      value.className = `stat-value${stat.accent ? ' accent' : ''}`
      value.textContent = stat.value

      statEl.append(label, value)
      body.appendChild(statEl)
    }

    // Progress
    s.querySelector('.progress-label')!.textContent = data.progressLabel
    s.querySelector('.progress-value')!.textContent = data.progressText

    const fill = s.querySelector<HTMLElement>('.progress-fill')!
    fill.style.width = `${Math.min(Math.max(data.progress, 0), 1) * 100}%`
  }
}

customElements.define('node-tooltip', NodeTooltip)
