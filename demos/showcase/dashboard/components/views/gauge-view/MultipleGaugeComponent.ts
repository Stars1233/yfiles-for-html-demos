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
import type { DefaultArcObject } from 'd3'
import * as d3 from 'd3'
import type { GaugeConfig } from './gauge-types'
import styles from './multiple-gauge.css?inline'

const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(styles)

/**
 * A customizable gauge card displaying dual concentric ring progress indicators
 * with center labels and optional statistics panel. Supports dynamic data updates
 * and selection/visibility states via CSS classes.
 */
export class MultipleGaugeComponent extends HTMLElement {
  private _shadowRoot: ShadowRoot
  private config: GaugeConfig | null = null

  /**
   * Initializes a new instance of the MultipleGaugeComponent.
   */
  constructor() {
    super()
    this._shadowRoot = this.attachShadow({ mode: 'open' })
    this._shadowRoot.adoptedStyleSheets = [styleSheet]
  }

  /**
   * Adopts additional CSS stylesheets to the shadow DOM.
   * Merges with default component styles.
   *
   * @param sheets - Array of CSSStyleSheet objects to adopt
   */
  adoptExtraStyleSheets(sheets: CSSStyleSheet[]): void {
    this._shadowRoot.adoptedStyleSheets = [styleSheet, ...sheets]
  }

  /**
   * Called when the element is connected to the DOM.
   * Triggers initial render if data is available.
   */
  connectedCallback(): void {
    this.render()
  }

  /**
   * Sets the gauge configuration and re-renders the component.
   *
   * @param config - GaugeConfig object containing all display data
   */
  setData(config: GaugeConfig): void {
    this.config = config
    this.render()
  }

  /**
   * Sets the selected state of the gauge card.
   * Applies/removes the gauge-card--selected CSS class.
   *
   * @param selected - Whether the card should appear selected
   */
  setSelected(selected: boolean): void {
    this.classList.toggle('gauge-card--selected', selected)
  }

  /**
   * Sets the visibility state of the gauge card.
   * Applies/removes the gauge-card--dimmed CSS class based on visibility.
   *
   * @param dimmed - Whether the card should appear visible (false = dimmed)
   */
  setVisible(dimmed: boolean): void {
    this.classList.toggle('gauge-card--dimmed', !dimmed)
  }

  /**
   * Clears and re-renders the entire component from current config.
   */
  private render(): void {
    if (!this.config) return

    this._shadowRoot.innerHTML = ''
    this._shadowRoot.appendChild(this.createHeader())
    this._shadowRoot.appendChild(this.createBody())
  }

  /**
   * Creates the header section with title.
   *
   * @returns HTMLElement containing card title
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div')
    header.className = 'card-header'

    const title = document.createElement('h3')
    title.className = 'card-title'
    title.textContent = this.config!.title
    header.appendChild(title)

    return header
  }

  /**
   * Creates the main body containing gauge and optional stats panel.
   *
   * @returns HTMLElement containing gauge and stats sections
   */
  private createBody(): HTMLElement {
    const body = document.createElement('div')
    body.className = 'card-body'

    body.appendChild(this.createGaugePanel())

    // Add stats panel only if badge or stat items exist
    const { statusBadge, statItems } = this.config!
    if (statusBadge || statItems?.length) {
      body.appendChild(this.createStaffPanel())
    }

    return body
  }

  /**
   * Creates the gauge visualization panel with optional section label.
   *
   * @returns HTMLElement containing gauge SVG wrapper
   */
  private createGaugePanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'gauge-panel'

    // Add section label if configured
    const sectionLabel = this.config?.outerRing.sectionLabel
    if (sectionLabel) {
      const label = document.createElement('div')
      label.className = 'gauge-panel-label'
      label.textContent = sectionLabel
      panel.appendChild(label)
    }

    const svgWrapper = document.createElement('div')
    svgWrapper.className = 'gauge-svg-wrapper'
    svgWrapper.appendChild(this.createGaugeSvg())
    panel.appendChild(svgWrapper)

    return panel
  }

  /**
   * Creates the SVG element containing dual concentric gauge rings.
   * Sets up coordinate system and rendering groups.
   *
   * @returns SVGElement with gauge visualization
   */
  private createGaugeSvg(): SVGElement {
    const radius = 40
    const padding = 2
    const viewBoxSize = (radius + padding) * 2

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    svg.setAttribute(
      'viewBox',
      `${-(viewBoxSize / 2)} ${-(viewBoxSize / 2)} ${viewBoxSize} ${viewBoxSize}`
    )

    const rootGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.renderRings(rootGroup, radius)
    svg.appendChild(rootGroup)

    return svg
  }

  /**
   * Renders both outer and inner gauge rings.
   * Configures angles and thickness for all ring visualizations.
   *
   * @param rootGroup - SVG group to render rings into
   * @param radius - Base radius for gauge rings
   */
  private renderRings(rootGroup: SVGGElement, radius: number): void {
    const startAngle = -Math.PI * 0.75
    const endAngle = Math.PI * 0.75
    const ringThickness = radius * 0.2

    this.renderOuterRing(rootGroup, radius, ringThickness, startAngle, endAngle)
    this.renderInnerRing(rootGroup, radius, ringThickness, startAngle, endAngle)
  }

  /**
   * Renders the outer ring arc with percentage fill and center labels.
   * Uses load-based color scheme (green < 70%, yellow < 85%, red >= 85%).
   *
   * @param rootGroup - Parent SVG group
   * @param radius - Outer ring radius
   * @param ringThickness - Ring stroke width
   * @param startAngle - Arc start angle in radians
   * @param endAngle - Arc end angle in radians
   */
  private renderOuterRing(
    rootGroup: SVGGElement,
    radius: number,
    ringThickness: number,
    startAngle: number,
    endAngle: number
  ): void {
    const outerRing = this.config?.outerRing
    if (!outerRing) return

    const { percentage, centerLines } = outerRing

    const outerRadius = radius
    const innerRadius = radius - ringThickness
    const arc = d3.arc<void, DefaultArcObject>().innerRadius(innerRadius).outerRadius(outerRadius)
    // Calculate fill angle proportional to percentage
    const fillAngle = startAngle + (percentage / 100) * (endAngle - startAngle)

    // Draw track background and filled portion
    this.appendArc(rootGroup, arc, startAngle, endAngle, 'ring-track')
    this.appendArc(
      rootGroup,
      arc,
      startAngle,
      fillAngle,
      'ring-fill',
      this.getLoadColor(percentage)
    )

    // Add percentage text in center
    this.appendText(
      rootGroup,
      `${Math.round(percentage)}%`,
      0,
      -(outerRadius + innerRadius) / 2 + 13,
      'ring-percentage'
    )

    // Add optional center lines (e.g., labels, units)
    centerLines?.forEach(({ text, className }, i) => {
      this.appendText(rootGroup, text, 0, -17 + i * 5, className ?? 'ring-label-small')
    })
  }

  /**
   * Renders the inner ring arc with percentage fill and optional title.
   * Positioned below outer ring with inverse color scheme (green > 85%, yellow > 70%, red <= 70%).
   *
   * @param rootGroup - Parent SVG group
   * @param radius - Base radius for positioning
   * @param ringThickness - Ring stroke width
   * @param startAngle - Arc start angle in radians
   * @param endAngle - Arc end angle in radians
   */
  private renderInnerRing(
    rootGroup: SVGGElement,
    radius: number,
    ringThickness: number,
    startAngle: number,
    endAngle: number
  ): void {
    const innerRing = this.config?.innerRing
    if (!innerRing) return

    const { percentage, centerLines, arcTitle } = innerRing

    const innerRadius = radius * 0.55
    const innerTrackRadius = innerRadius - ringThickness
    const arc = d3
      .arc<void, DefaultArcObject>()
      .innerRadius(innerTrackRadius)
      .outerRadius(innerRadius)
    // Calculate fill angle proportional to percentage
    const fillAngle = startAngle + (percentage / 100) * (endAngle - startAngle)

    // Translate inner ring down for visual separation
    const yOffset = radius * 0.3
    const innerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    innerGroup.setAttribute('transform', `translate(0, ${yOffset})`)
    rootGroup.appendChild(innerGroup)

    // Draw track background and filled portion
    this.appendArc(innerGroup, arc, startAngle, endAngle, 'ring-track')
    this.appendArc(
      innerGroup,
      arc,
      startAngle,
      fillAngle,
      'ring-fill',
      this.getInverseColor(percentage)
    )

    // Add optional center lines
    centerLines?.forEach(({ text, className }, i) => {
      this.appendText(innerGroup, text, 0, -2 + i * 6, className ?? 'ring-label-small')
    })

    // Add optional arc title below ring
    if (arcTitle) {
      this.appendText(innerGroup, arcTitle, 0, 20, 'ring-arc-title')
    }
  }

  /**
   * Creates the statistics panel displaying status badge and stat items.
   * Only rendered if statusBadge or statItems are configured.
   *
   * @returns HTMLElement containing status and statistics information
   */
  private createStaffPanel(): HTMLElement {
    const { statusBadge, statItems } = this.config!

    const panel = document.createElement('div')
    panel.className = 'stat-panel'

    // Add status badge if configured
    if (statusBadge) {
      const badge = document.createElement('div')
      badge.className = 'status-badge-row'
      badge.innerHTML = `<span class="status-badge status-badge--${statusBadge.level}">${statusBadge.label}</span>`
      panel.appendChild(badge)
    }

    // Add stat items (label-value pairs)
    statItems?.forEach(({ label, value }) => {
      const row = document.createElement('div')
      row.className = 'stat-row'
      row.innerHTML = `
        <span class="stat-label">${label}</span>
        <span class="stat-value">${value}</span>
      `
      panel.appendChild(row)
    })

    return panel
  }

  /**
   * Appends an SVG arc path element to the specified group.
   * Used for rendering gauge ring backgrounds and fills.
   *
   * @param group - SVG group to append path to
   * @param arc - D3 arc generator configured with radius values
   * @param startAngle - Arc start angle in radians
   * @param endAngle - Arc end angle in radians
   * @param className - CSS class for styling
   * @param fill - Optional fill color (overrides CSS)
   */
  private appendArc(
    group: SVGGElement,
    arc: d3.Arc<void, DefaultArcObject>,
    startAngle: number,
    endAngle: number,
    className: string,
    fill?: string
  ): void {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('class', className)
    path.setAttribute(
      'd',
      arc({ startAngle, endAngle, padAngle: 0, innerRadius: 0, outerRadius: 0 }) || ''
    )
    if (fill) path.setAttribute('fill', fill)
    group.appendChild(path)
  }

  /**
   * Appends an SVG text element to the specified group.
   * Centers text horizontally at the given coordinates.
   *
   * @param group - SVG group to append text to
   * @param text - Text content to display
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param className - CSS class for styling
   */
  private appendText(
    group: SVGGElement,
    text: string,
    x: number,
    y: number,
    className: string
  ): void {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    el.setAttribute('class', className)
    el.setAttribute('x', x.toString())
    el.setAttribute('y', y.toString())
    el.setAttribute('text-anchor', 'middle')
    el.textContent = text
    group.appendChild(el)
  }

  /**
   * Determines fill color for outer ring based on percentage load.
   * Green: < 70%, Yellow: 70-85%, Red: >= 85%
   *
   * @param value - Percentage value (0-100)
   * @returns Hex color string
   */
  private getLoadColor(value: number): string {
    if (value < 70) return '#1FBF75'
    if (value < 85) return '#FFB020'
    return '#E5484D'
  }

  /**
   * Determines fill color for inner ring based on inverse percentage logic.
   * Green: > 85%, Yellow: 70-85%, Red: <= 70%
   *
   * @param value - Percentage value (0-100)
   * @returns Hex color string
   */
  private getInverseColor(value: number): string {
    if (value > 85) return '#1FBF75'
    if (value > 70) return '#FFB020'
    return '#E5484D'
  }
}

customElements.define('multiple-gauge', MultipleGaugeComponent)
