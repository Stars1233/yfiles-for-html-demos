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
import { TimescaleGridlineVisual, TimescaleVisual } from './TimescaleVisual'

/**
 * The TimeScale object responsible for the timeline visualized atop the event timeline.
 */
export class TimeScale {
  static SECOND = 1000
  static MINUTE = 60 * TimeScale.SECOND
  static HOUR = 60 * TimeScale.MINUTE
  static DAY = 24 * TimeScale.HOUR
  static MONTH = 30 * TimeScale.DAY
  static YEAR = 365 * TimeScale.DAY

  static DESIRED_TIMESTEPS = [
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

  graphComponent
  coordinateMapping
  visibleRange
  animationSourceRange = null

  edgeTickDates = []
  onEdgeTickHover
  onEdgeTickUnhover
  config
  isDragging = false
  dragStartX = 0
  highlightEdgeTicks = []

  tickInterval
  higherOrderTick = 'day'

  // Animation properties
  targetRange = null

  constructor(options) {
    this.graphComponent = options.graphComponent
    this.coordinateMapping = options.coordinateMapping
    this.visibleRange = [...options.visibleRange]
    this.edgeTickDates = options.edgeTickDates
    this.tickInterval = this.calculateTickInterval(20)
    this.onEdgeTickHover = options.onEdgeTickHover
    this.onEdgeTickUnhover = options.onEdgeTickUnhover
    this.config = options.config

    this.graphComponent.renderTree.createElement(
      this.graphComponent.renderTree.backgroundGroup,
      new TimescaleGridlineVisual(this)
    )
    this.graphComponent.renderTree.createElement(
      this.graphComponent.renderTree.foregroundGroup,
      new TimescaleVisual(this)
    )
    this.graphComponent.addEventListener('viewport-changed', () => {
      this.renderMarkers()
    })
  }

  /**
   * Method with which to map a date to pixels.
   * @param date The Date object to be mapped to be pixels.
   * @returns The pixel value of the provided Date object.
   */
  dateToPixels(date) {
    return this.coordinateMapping.timeToX(date)
  }

  /**
   * Method with which to map a pixel value to a Date.
   * @param x The pixel value to be mapped to a date.
   * @returns The Date corresponding to the provided pixel value.
   */
  pixelsToDate(x) {
    return this.coordinateMapping.xToTime(x)
  }

  /**
   * Method with which to render the timescale's markers.
   */
  renderMarkers() {
    this.tickInterval = this.calculateTickInterval(20)
    this.graphComponent.invalidate()
  }

  /**
   * Method with which to determine the type of tick (second, minute, hour, day, month, year).
   * @param interval The tick's interval.
   * @param higherOrder The higher order tick type.
   */
  static determineTickType(interval, higherOrder = false) {
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
   * @param higherOrderTick Resolution of the higher order tick.
   */
  getHigherOrderValue = (date, higherOrderTick) => {
    const type = higherOrderTick || this.higherOrderTick
    switch (type) {
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
   * @returns The formated date.
   */
  formatByScale(date, type) {
    const options = {
      second: { ...this.config.dateTimeFormatOptions, second: '2-digit' },
      minute: { ...this.config.dateTimeFormatOptions, hour: '2-digit', minute: '2-digit' },
      hour: { ...this.config.dateTimeFormatOptions, hour: '2-digit', minute: '2-digit' },
      day: {
        ...this.config.dateTimeFormatOptions,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      },
      month: {
        ...this.config.dateTimeFormatOptions,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      },
      year: { ...this.config.dateTimeFormatOptions, year: 'numeric' }
    }

    const formatter = new Intl.DateTimeFormat('en-GB', options[type])
    return formatter.format(date)
  }

  /**
   * Method with which to format a given date in a compact form as a function of the tick
   * resolution. Used when horizontal space is too tight for the full label.
   * @param date The Date object to be formatted.
   * @param type The type of tick.
   * @returns The abbreviated formatted date.
   */
  formatByScaleShort(date, type) {
    switch (type) {
      case 'second':
        return `${String(date.getUTCSeconds()).padStart(2, '0')}s`
      case 'minute':
        return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
      case 'hour':
        return `${date.getUTCHours()}h`
      case 'day':
        return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      case 'month':
        return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short' }).format(date)
      case 'year':
        return `'${String(date.getUTCFullYear()).slice(-2)}`
    }
  }

  /**
   * Method with which to calculate the interval between ticks.
   * @param desiredTickNumber A number indicating the desired number of ticks in the visualization.
   * @returns The tick interval.
   */
  calculateTickInterval = (desiredTickNumber) => {
    const startMs = this.visibleRange[0].getTime()
    const endMs = this.visibleRange[1].getTime()
    const visibleRangeMs = endMs - startMs
    if (visibleRangeMs === 0) {
      return TimeScale.DAY
    }
    const rawStep = visibleRangeMs / desiredTickNumber

    let actualStepSize = TimeScale.DESIRED_TIMESTEPS.find((step) => step >= rawStep)

    if (!actualStepSize) {
      const yearsRequired = rawStep / TimeScale.YEAR

      const magnitude = Math.pow(10, Math.floor(Math.log10(yearsRequired)))
      const normalized = yearsRequired / magnitude

      let stepYears
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
  armAnimation(target) {
    this.animationSourceRange = this.visibleRange
    this.targetRange = target
  }

  /**
   * `Method with which to animate a change in the timescale.
   * @param t The step in the animation.
   */
  animate = (t) => {
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
  renderTimescaleAtInterval(interval) {
    this.visibleRange = interval
    this.tickInterval = this.calculateTickInterval(20)
    this.renderMarkers()
  }
}
