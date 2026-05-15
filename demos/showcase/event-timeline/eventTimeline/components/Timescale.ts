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
interface TimeScaleOptions {
  containerId: string
  visibleRange: [Date, Date]
  edgeTickDates: Date[]
  onEdgeTickHover?: (date: Date) => void
  onEdgeTickUnhover?: () => void
  onRangeSelect?: (start: Date, end: Date) => void
  timescaleHeight?: number
}

type HighlightEdgeTick = { time: Date; yStart: number }

type TickResolution = 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year'
type TickType = 'higher' | 'lower' | 'highlight'

/**
 * The TimeScale object responsible for the timeline visualized atop the event timeline.
 */
export class TimeScale {
  private timescaleHeight: number = 100

  static readonly SECOND = 1000
  static readonly MINUTE = 60 * TimeScale.SECOND
  static readonly HOUR = 60 * TimeScale.MINUTE
  static readonly DAY = 24 * TimeScale.HOUR
  static readonly MONTH = 30 * TimeScale.DAY
  static readonly YEAR = 365 * TimeScale.DAY

  static readonly DESIRED_TIMESTEPS = [
    10 * TimeScale.SECOND,
    15 * TimeScale.SECOND,
    30 * TimeScale.SECOND,
    1 * TimeScale.MINUTE,
    2 * TimeScale.MINUTE,
    5 * TimeScale.MINUTE,
    10 * TimeScale.MINUTE,
    15 * TimeScale.MINUTE,
    30 * TimeScale.MINUTE,
    1 * TimeScale.HOUR,
    2 * TimeScale.HOUR,
    3 * TimeScale.HOUR,
    4 * TimeScale.HOUR,
    6 * TimeScale.HOUR,
    12 * TimeScale.HOUR,
    1 * TimeScale.DAY,
    2 * TimeScale.DAY,
    3 * TimeScale.DAY,
    4 * TimeScale.DAY,
    7 * TimeScale.DAY,
    14 * TimeScale.DAY,
    30 * TimeScale.DAY,
    90 * TimeScale.DAY,
    180 * TimeScale.DAY
  ]

  private container: HTMLElement
  readonly svg: SVGSVGElement
  readonly markerGroup: SVGGElement
  private visibleRange: [Date, Date]
  private animationSourceRange: [Date, Date] | null = null

  readonly edgeTickDates: Date[] = []
  readonly onEdgeTickHover?: (date: Date) => void
  readonly onEdgeTickUnhover?: () => void
  readonly onRangeSelect?: (start: Date, end: Date) => void
  private isDragging = false
  private dragStartX: number = 0
  private selectionRect: SVGRectElement | null = null
  highlightEdgeTicks: HighlightEdgeTick[] = []

  private tickInterval: number
  private normalTick: TickResolution = 'hour'
  private higherOrderTick: TickResolution = 'day'

  // Animation properties
  targetRange: [Date, Date] | null = null

  private tickSlots: SVGGElement[] = []
  private tickSignature: string | null = null

  // Edge ticks can remain data-driven (timestamp identity)
  private edgeCirclesByMs = new Map<number, SVGCircleElement>()
  private edgeHighlightCirclesByMs = new Map<
    number,
    [circle: SVGCircleElement, tickGroup: SVGGElement | undefined]
  >()

  // Separator exists once
  private separatorLine: SVGLineElement | null = null

  /**
   * Instantiates a new TimeScale object.
   * @param options A TimeScaleOptions object.
   */
  constructor(options: TimeScaleOptions) {
    const container = document.getElementById(options.containerId)
    if (!container) throw new Error(`Container ${options.containerId} not found`)

    this.container = container
    this.visibleRange = [...options.visibleRange] as [Date, Date]
    this.edgeTickDates = options.edgeTickDates
    this.tickInterval = this.calculateTickInterval(20)
    this.onEdgeTickHover = options.onEdgeTickHover
    this.onEdgeTickUnhover = options.onEdgeTickUnhover
    this.onRangeSelect = options.onRangeSelect

    // 1. Container Styles
    this.container.style.overflow = 'hidden'
    this.container.style.position = 'absolute'
    this.container.style.width = '100%'
    this.container.style.height = '100%'

    // 2. Initialize SVG
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.svg.classList.add('time-scale-content')
    this.svg.setAttribute('width', '100%')
    this.svg.setAttribute('height', '100%')
    this.svg.setAttribute('cursor', 'crosshair')
    this.svg.style.display = 'block'

    this.markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.svg.appendChild(this.markerGroup)
    this.container.appendChild(this.svg)

    this.initDragEvents()
    this.renderMarkers()
  }

  /**
   * Method with which to map a date to pixels.
   * @param date The Date object to be mapped to be pixels.
   * @private
   * @returns The pixel value of the provided Date object.
   */
  private dateToPixels(date: Date): number {
    const startMs = this.visibleRange[0].getTime()
    const endMs = this.visibleRange[1].getTime()
    const totalVisibleDuration = endMs - startMs
    const elapsed = date.getTime() - startMs
    return (elapsed / totalVisibleDuration) * this.container.clientWidth
  }

  /**
   * Method with which to map a pixel value to a Date.
   * @param x The pixel value to be mapped to a date.
   * @private
   * @returns The Date corresponding to the provided pixel value.
   */
  private pixelsToDate(x: number): Date {
    const startMs = this.visibleRange[0].getTime()
    const endMs = this.visibleRange[1].getTime()
    const totalVisibleDuration = endMs - startMs
    const percentage = x / this.container.clientWidth
    return new Date(startMs + percentage * totalVisibleDuration)
  }

  /**
   * Initializes a mouse click-and-drag event.
   * @private
   */
  private initDragEvents(): void {
    this.svg.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return
      e.preventDefault()

      const rect = this.svg.getBoundingClientRect()
      this.isDragging = true
      this.dragStartX = e.clientX - rect.left

      if (!this.selectionRect) {
        this.selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        this.selectionRect.classList.add('time-selection')
        this.selectionRect.setAttribute('pointer-events', 'none')
        this.markerGroup.appendChild(this.selectionRect)
      }

      this.selectionRect.setAttribute('x', this.dragStartX.toString())
      this.selectionRect.setAttribute('y', '0')
      this.selectionRect.setAttribute('width', '0')
      this.selectionRect.setAttribute('height', this.container.clientHeight.toString())
      this.selectionRect.style.display = 'block'
    })

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging || !this.selectionRect) return
      const rect = this.svg.getBoundingClientRect()
      const currentX = Math.max(0, Math.min(e.clientX - rect.left, this.container.clientWidth))

      const x = Math.min(this.dragStartX, currentX)
      const width = Math.abs(currentX - this.dragStartX)

      this.selectionRect.setAttribute('x', x.toString())
      this.selectionRect.setAttribute('width', width.toString())
    })

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.isDragging) return
      if (e.key === 'Escape') {
        this.isDragging = false
        if (this.selectionRect) this.selectionRect.style.display = 'none'
      }
    })

    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (!this.isDragging) return
      this.isDragging = false

      if (this.selectionRect) {
        const x = parseFloat(this.selectionRect.getAttribute('x') || '0')
        const width = parseFloat(this.selectionRect.getAttribute('width') || '0')

        this.selectionRect.style.display = 'none'
        if (width > 2 && this.onRangeSelect) {
          const startDate = this.pixelsToDate(x)
          const endDate = this.pixelsToDate(x + width)
          this.onRangeSelect(startDate, endDate)
        }
      }
    })
  }

  /**
   * Method with which create a tick group.
   * @private
   * @returns A tick group.
   */
  private createTickGroup(): SVGGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    //const shortId = 'path-' + crypto.randomUUID().split('-')[0]
    const shortId = 'path-' + Math.round(100000 * Math.random())
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('id', shortId)
    g.appendChild(path)

    const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath')
    textPath.setAttribute('href', `#${shortId}`)
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('dy', '-5px')
    text.appendChild(textPath)

    g.appendChild(text)

    this.markerGroup.appendChild(g)
    return g
  }

  /**
   * Update the SVGPathElement describing a tick.
   * @param svgPath The original SVGPathElement.
   * @param xPos The tick's x position.
   * @param startY The tick's y coordinate (start point).
   * @param endY The tick's y coordinate (end point).
   * @param label The tick's label string.
   * @param flip A boolean flag indicating whether to render the tick to the right or left.
   * @private
   */
  private updateTickPath(
    svgPath: SVGPathElement,
    xPos: number,
    startY: number,
    endY: number,
    label: string,
    flip: boolean = false
  ): void {
    const flagWidth = label.length * 5
    const flagHeight = label.length * -5
    const tipY = startY + flagHeight

    let pathD: string

    if (!flip) {
      const tipX = xPos + flagWidth
      pathD = `M ${xPos} ${endY} L ${xPos} ${startY} L ${tipX} ${tipY}`
    } else {
      const tipX = xPos - flagWidth
      pathD = `M ${tipX} ${tipY} L ${xPos} ${startY} L ${xPos} ${endY}`
    }

    svgPath.setAttribute('d', pathD)
  }

  /**
   * Method with which to update a tick group's SVGGElement.
   * @param g The SVGGElement to be updated.
   * @param xPos The group's x position.
   * @param startY The group's y coordinate (start point).
   * @param endY The group's y coordinate (end point).
   * @param label The group's label string.
   * @param tickClass The group's tick class.
   * @param flip A boolean flag indicating whether to render the tick left or right facing.
   * @private
   */
  private updateTickGroup(
    g: SVGGElement,
    xPos: number,
    startY: number,
    endY: number,
    label: string,
    tickClass: string,
    flip: boolean = false
  ): void {
    const path = g.querySelector<SVGPathElement>('path')
    const text = g.querySelector<SVGTextPathElement>('textPath')
    if (!path || !text) return

    this.updateTickPath(path, xPos, startY, endY, label, flip)
    path.setAttribute('class', tickClass)

    // Label
    text.textContent = label
    text.setAttribute('class', tickClass + '-label')
    text.setAttribute('text-anchor', 'end')
    text.setAttribute('startOffset', '100%')
    if (flip) {
      text.setAttribute('text-anchor', 'start')
      text.setAttribute('startOffset', '0%')
    }
  }

  private readonly circleMarkerRadius = 6

  /**
   * Method with which to render the timescale's markers.
   */
  renderMarkers(): void {
    const viewStart = this.visibleRange[0].getTime()
    const viewEnd = this.visibleRange[1].getTime()

    if (this.selectionRect) {
      this.selectionRect.setAttribute('height', this.container.clientHeight.toString())
    }

    // Recompute tick types for this interval
    this.normalTick = this.determineTickType(this.tickInterval)
    this.higherOrderTick = this.determineTickType(this.tickInterval, true)

    // Identity regime: only changes when tick types change
    const nextSignature = `${this.normalTick}|${this.higherOrderTick}`
    if (this.tickSignature !== nextSignature) {
      for (const g of this.tickSlots) g.remove()
      this.tickSlots = []
      this.tickSignature = nextSignature
    }

    // Separator line: create once and just update its geometry
    if (!this.separatorLine) {
      this.separatorLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      this.separatorLine.classList.add('separator-line')
      this.markerGroup.appendChild(this.separatorLine)
    }
    this.separatorLine.x1.baseVal.value = 0
    this.separatorLine.y1.baseVal.value = this.timescaleHeight - this.circleMarkerRadius
    this.separatorLine.x2.baseVal.value = this.container.clientWidth
    this.separatorLine.y2.baseVal.value = this.timescaleHeight - this.circleMarkerRadius

    // Compute the tick sequence for current viewport
    // Note: firstTick can be < viewStart; that's fine (it will render slightly off-screen if needed),
    // but neededCount is computed from aligned ticks within viewport extents.
    const firstTick = Math.floor(viewStart / this.tickInterval) * this.tickInterval
    const lastTick = Math.floor(viewEnd / this.tickInterval) * this.tickInterval
    const neededCount = Math.max(0, Math.floor((lastTick - firstTick) / this.tickInterval) + 1)

    // Ensure we have exactly the amount of tick DOM groups we need
    while (this.tickSlots.length < neededCount) {
      this.tickSlots.push(this.createTickGroup())
    }
    while (this.tickSlots.length > neededCount) {
      const g = this.tickSlots.pop()
      if (g) g.remove()
    }

    // Update existing slot DOM nodes in place
    for (let i = 0; i < neededCount; i++) {
      const tickMs = firstTick + i * this.tickInterval
      const currentDate = new Date(tickMs)
      const xPos = this.dateToPixels(currentDate)

      const currentHigherOrder = this.getHigherOrderValue(currentDate)
      const lastHigherOrder = this.getHigherOrderValue(new Date(tickMs - this.tickInterval))

      let startY: number
      let endY: number
      let label: string
      let tickClass: string

      if (currentHigherOrder !== lastHigherOrder) {
        startY = this.timescaleHeight * 0.7
        endY = this.container.clientHeight
        label = this.formatByScale(currentDate, this.higherOrderTick)
        tickClass = 'higher-order-tick'
      } else {
        startY = this.timescaleHeight * 0.9
        endY = this.timescaleHeight
        label = this.formatByScale(currentDate, this.normalTick)
        tickClass = 'normal-tick'
      }

      this.updateTickGroup(this.tickSlots[i], xPos, startY, endY, label, tickClass)
    }

    // Edge ticks: reconcile (add/update/remove) based on viewport
    const seenEdgeTime = new Set<number>()
    for (const date of this.edgeTickDates) {
      const time = date.getTime()
      if (time < viewStart || time > viewEnd) continue

      const xPos = this.dateToPixels(date)
      let circle = this.edgeCirclesByMs.get(time)
      if (!circle) {
        circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.classList.add('edge-tick-circle')
        circle.r.baseVal.value = this.circleMarkerRadius
        circle.cy.baseVal.value = this.timescaleHeight - this.circleMarkerRadius
        circle.addEventListener('mouseover', () => {
          this.onEdgeTickHover?.(date)
        })
        circle.addEventListener('mouseout', () => this.onEdgeTickUnhover?.())
        this.markerGroup.appendChild(circle)
        this.edgeCirclesByMs.set(time, circle)
      }
      circle.cx.baseVal.value = xPos
      seenEdgeTime.add(time)
    }

    for (const [ms, circle] of this.edgeCirclesByMs) {
      if (!seenEdgeTime.has(ms)) {
        circle.remove()
        this.edgeCirclesByMs.delete(ms)
      }
    }

    // Edge ticks: reconcile (add/update/remove) based on viewport
    const seenHighlightedEdgeTime = new Set<number>()
    this.highlightEdgeTicks.forEach(({ time: date, yStart }, index) => {
      const time = date.getTime()
      if (!(time < viewStart) && !(time > viewEnd)) {
        const xPos = this.dateToPixels(date)
        const svgElements = this.edgeHighlightCirclesByMs.get(time)
        let circle, tickGroup
        if (!svgElements) {
          circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          circle.classList.add('edge-tick-circle-highlight')
          circle.r.baseVal.value = this.circleMarkerRadius
          circle.cy.baseVal.value = this.timescaleHeight - this.circleMarkerRadius
          this.markerGroup.appendChild(circle)

          if (index === 0 || index === this.highlightEdgeTicks.length - 1) {
            tickGroup = this.createTickGroup()
          }
          this.edgeHighlightCirclesByMs.set(time, [circle, tickGroup])
        } else {
          circle = svgElements[0]
          tickGroup = svgElements[1]
        }
        circle.cx.baseVal.value = xPos
        if (tickGroup) {
          this.updateTickGroup(
            tickGroup,
            xPos,
            this.timescaleHeight * 0.7,
            this.timescaleHeight,
            this.formatByScale(date, this.normalTick),
            'edge-tick-highlight',
            index === 0 && this.highlightEdgeTicks.length > 1
          )
        }

        seenHighlightedEdgeTime.add(time)
      }
    })

    for (const [ms, [circle, tickGroup]] of this.edgeHighlightCirclesByMs) {
      if (!seenHighlightedEdgeTime.has(ms)) {
        circle.remove()
        tickGroup?.remove()
        this.edgeHighlightCirclesByMs.delete(ms)
      }
    }
  }

  /**
   * Method with which to determine the type of tick (second, minute, hour, day, month, year).
   * @param interval The tick's interval.
   * @param higherOrder The higher order tick type.
   */
  determineTickType(interval: number, higherOrder: boolean = false): TickResolution {
    if (!higherOrder) {
      if (interval <= TimeScale.MINUTE) return 'second'
      else if (interval <= TimeScale.HOUR) return 'minute'
      else if (interval <= TimeScale.DAY) return 'hour'
      else if (interval <= TimeScale.MONTH) return 'day'
      else if (interval <= TimeScale.YEAR) return 'month'
      else return 'year'
    } else {
      if (interval <= TimeScale.MINUTE) return 'minute'
      else if (interval <= TimeScale.HOUR) return 'hour'
      else if (interval <= TimeScale.DAY) return 'day'
      else if (interval <= TimeScale.YEAR) return 'month'
      else return 'year'
    }
  }

  /**
   * Method with which to get the higher order tick type.
   * @param date The Date to be rendered as a higher order tick.
   */
  private getHigherOrderValue = (date: Date): number => {
    switch (this.higherOrderTick) {
      case 'year':
        return date.getFullYear()
      case 'month':
        return date.getMonth()
      default:
      case 'day':
        return date.getDate()
      case 'hour':
        return date.getHours()
      case 'minute':
        return date.getMinutes()
    }
  }

  /**
   * Method with which to format a given date as a function of the tick resolution.
   * @param date The Date object to be formated.
   * @param type The type of tick.
   * @private
   * @returns The formated date.
   */
  private formatByScale(date: Date, type: TickResolution): string {
    const options: Record<TickResolution, Intl.DateTimeFormatOptions> = {
      second: { timeZone: 'UTC', second: '2-digit' },
      minute: { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' },
      hour: { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' },
      day: { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' },
      month: { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' },
      year: { timeZone: 'UTC', year: 'numeric' }
    }

    const formatter = new Intl.DateTimeFormat('en-GB', options[type])
    return formatter.format(date)
  }

  /**
   * Method with which to calculate the interval between ticks.
   * @param desiredTickNumber A number indicating the desired number of ticks in the visualization.
   * @returns The tick interval.
   */
  private calculateTickInterval = (desiredTickNumber: number): number => {
    const visibleRangeMs = this.visibleRange[1].getTime() - this.visibleRange[0].getTime()
    const rawStep = visibleRangeMs / desiredTickNumber

    let actualStepSize = TimeScale.DESIRED_TIMESTEPS.find((step) => step >= rawStep)

    if (!actualStepSize) {
      const yearsRequired = rawStep / TimeScale.YEAR

      const magnitude = Math.pow(10, Math.floor(Math.log10(yearsRequired)))
      const normalized = yearsRequired / magnitude

      let stepYears: number
      if (normalized <= 1.5) stepYears = 1
      else if (normalized <= 3) stepYears = 2
      else if (normalized <= 7) stepYears = 5
      else stepYears = 10

      actualStepSize = stepYears * magnitude * TimeScale.YEAR
    }

    return Math.max(1, actualStepSize)
  }

  /**
   * Method with which to arm animations.
   * @param target The target date range towards which to animate.
   */
  armAnimation(target: [Date, Date]): void {
    this.animationSourceRange = this.visibleRange
    this.targetRange = target
  }

  /**
   * `Method with which to animate a change in the timescale.
   * @param t The step in the animation.
   */
  animate = (t: number): void => {
    if (!this.targetRange || !this.animationSourceRange) return

    const startBound = this.animationSourceRange[0].getTime()
    const endBound = this.animationSourceRange[1].getTime()
    const tarStart = this.targetRange[0].getTime()
    const tarEnd = this.targetRange[1].getTime()

    const nextStart = startBound + (tarStart - startBound) * t
    const nextEnd = endBound + (tarEnd - endBound) * t

    this.visibleRange = [new Date(nextStart), new Date(nextEnd)]
    this.tickInterval = this.calculateTickInterval(20)
    this.renderMarkers()
  }

  /**
   * Method with which to render a timescale around particular interval.
   * @param interval The interval around which to render the timescale.
   */
  renderTimescaleAtInterval(interval: [Date, Date]): void {
    this.visibleRange = interval
    this.tickInterval = this.calculateTickInterval(20)
    this.renderMarkers()
  }
}
