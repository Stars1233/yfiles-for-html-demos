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
import { BaseClass, IVisualCreator, SvgVisual } from '@yfiles/yfiles'
import { TimeScale } from './Timescale'

/**
 * A visual creator that renders the timescale into the GraphComponent's background or foreground.
 */
export class TimescaleVisual extends BaseClass(IVisualCreator) {
  circleMarkerRadius = 6

  timescale

  constructor(timescale) {
    super()
    this.timescale = timescale
  }

  createVisual(context) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.classList.add('timescale-visual')
    this.updateGroup(g, context)
    return new SvgVisual(g)
  }

  get config() {
    return this.timescale.config
  }

  updateVisual(context, oldVisual) {
    const g = oldVisual.svgElement
    this.updateGroup(g, context)
    return oldVisual
  }

  updateGroup(g, context) {
    const timescale = this.timescale
    const viewStart = timescale.visibleRange[0].getTime()
    const viewEnd = timescale.visibleRange[1].getTime()
    const viewportY = context.canvasComponent.viewport.y
    const viewportX = context.canvasComponent.viewport.x

    // Reuse or create container elements
    let markerGroup = g.querySelector('.marker-group')
    if (!markerGroup) {
      markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      markerGroup.classList.add('marker-group')
      g.appendChild(markerGroup)
    }

    // Ensure sub-groups exist for proper z-order (ticks → circles → highlights)
    let ticksGroup = markerGroup.querySelector('.ticks-group')
    if (!ticksGroup) {
      ticksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      ticksGroup.classList.add('ticks-group')
      markerGroup.appendChild(ticksGroup)
    }

    let circlesGroup = markerGroup.querySelector('.circles-group')
    if (!circlesGroup) {
      circlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      circlesGroup.classList.add('circles-group')
      markerGroup.appendChild(circlesGroup)
    }

    let highlightsGroup = markerGroup.querySelector('.highlights-group')
    if (!highlightsGroup) {
      highlightsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      highlightsGroup.classList.add('highlights-group')
      markerGroup.appendChild(highlightsGroup)
    }

    // Background rectangle
    let backgroundRect = g.querySelector('.timescale-background')
    if (!backgroundRect) {
      backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      backgroundRect.classList.add('timescale-background')
      backgroundRect.setAttribute('pointer-events', 'none')
      g.insertBefore(backgroundRect, markerGroup)
    }
    const separatorY = viewportY + this.config.timescaleHeight - this.circleMarkerRadius
    // Update fill on every render to ensure CSS variables are re-evaluated for theme changes
    backgroundRect.setAttribute('fill', 'var(--event-timeline-background-color, #29323c)')
    backgroundRect.setAttribute('x', viewportX.toString())
    backgroundRect.setAttribute('y', viewportY.toString())
    backgroundRect.setAttribute('width', context.canvasComponent.viewport.width.toString())
    backgroundRect.setAttribute('height', (separatorY - viewportY).toString())

    // Recompute tick types
    const tickInterval = timescale.tickInterval
    const normalTick = TimeScale.determineTickType(tickInterval)
    const higherOrderTick = TimeScale.determineTickType(tickInterval, true)

    // Compute ticks
    const firstTick = Math.floor(viewStart / tickInterval) * tickInterval
    const lastTick = Math.floor(viewEnd / tickInterval) * tickInterval
    const neededCount = Math.max(0, Math.floor((lastTick - firstTick) / tickInterval) + 1)

    // Sync tick groups (within ticksGroup)
    const tickSlots = Array.from(ticksGroup.querySelectorAll(':scope > .tick-slot'))
    while (tickSlots.length < neededCount) {
      const newSlot = this.createTickGroup()
      ticksGroup.appendChild(newSlot)
      tickSlots.push(newSlot)
    }
    while (tickSlots.length > neededCount) {
      tickSlots.pop()?.remove()
    }

    // Compute pixel spacing between ticks for label size selection
    const tickPixelSpacing =
      neededCount > 1
        ? timescale.dateToPixels(new Date(firstTick + tickInterval)) -
          timescale.dateToPixels(new Date(firstTick))
        : Infinity

    const LABEL_MARGIN = 8
    const HYSTERESIS = 8 // px dead-band to prevent boundary flashing

    // Update ticks
    for (let i = 0; i < neededCount; i++) {
      const tickMs = firstTick + i * tickInterval
      const currentDate = new Date(tickMs)
      const xPos = timescale.dateToPixels(currentDate)

      const currentHigherOrder = timescale.getHigherOrderValue(currentDate, higherOrderTick)
      const lastHigherOrder = timescale.getHigherOrderValue(
        new Date(tickMs - tickInterval),
        higherOrderTick
      )

      let startY
      let endY
      let tickClass
      let labelY

      const isHigherOrder = currentHigherOrder !== lastHigherOrder

      if (isHigherOrder) {
        // Major tick: extends from top of timescale area
        startY = viewportY + this.config.timescaleHeight * 0.55
        endY = separatorY
        tickClass = 'higher-order-tick'
        labelY = viewportY + this.config.timescaleHeight * 0.6 // Above the tick
      } else {
        // Minor tick: extends to same level as major ticks (3/4 of the height)
        startY = viewportY + this.config.timescaleHeight * 0.65
        endY = separatorY
        tickClass = 'normal-tick'
        labelY = viewportY + this.config.timescaleHeight * 0.7 // Below major ticks
      }

      // Three-tier label selection: full → short → hidden based on available space
      const tickType = isHigherOrder ? higherOrderTick : normalTick
      const fullLabel = timescale.formatByScale(currentDate, tickType)
      const shortLabel = timescale.formatByScaleShort(currentDate, tickType)

      // Use accurate character widths per font size (higher-order: 12px bold, normal: 10px)
      const fullCharPx = isHigherOrder ? 7.0 : 5.8
      const shortCharPx = isHigherOrder ? 6.5 : 5.5
      const fullWidth = fullLabel.length * fullCharPx + LABEL_MARGIN
      const shortWidth = shortLabel.length * shortCharPx + LABEL_MARGIN

      // Apply hysteresis band to prevent flashing at threshold boundaries
      let displayLabel
      if (tickPixelSpacing >= fullWidth + HYSTERESIS) {
        displayLabel = fullLabel
      } else if (tickPixelSpacing >= shortWidth + HYSTERESIS) {
        displayLabel = shortLabel
      } else {
        displayLabel = null
      }

      this.updateTickGroup(tickSlots[i], xPos, startY, endY, displayLabel, tickClass, labelY)
    }

    // Separator line (within ticksGroup to stay behind circles)
    let separatorLine = ticksGroup.querySelector('.separator-line')
    if (!separatorLine) {
      separatorLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      separatorLine.classList.add('separator-line')
      // Append to ticksGroup so it stays behind circles
      ticksGroup.appendChild(separatorLine)
    }
    separatorLine.setAttribute('x1', viewportX.toString())
    separatorLine.setAttribute('y1', separatorY.toString())
    separatorLine.setAttribute(
      'x2',
      (viewportX + context.canvasComponent.viewport.width).toString()
    )
    separatorLine.setAttribute('y2', separatorY.toString())
    separatorLine.setAttribute('pointer-events', 'none')
    separatorLine.setAttribute('stroke', 'var(--yfiles-event-timeline-tick-color, #89919c)')
    separatorLine.setAttribute('stroke-width', `${this.config.separatorLineWidth}`)
    separatorLine.setAttribute('stroke-linecap', 'round')

    // Edge ticks (within circlesGroup)
    const seenEdgeTime = new Set()
    const edgeCirclesByMs = circlesGroup.querySelectorAll('.edge-tick-circle')
    const edgeMap = new Map()
    edgeCirclesByMs.forEach((c) => edgeMap.set(parseInt(c.getAttribute('data-ms')), c))

    const circleY = viewportY + this.config.timescaleHeight - this.circleMarkerRadius

    // Create/update circles for each edge date
    const uniqueEdgeTickDates = Array.from(
      new Set(timescale.edgeTickDates.map((d) => d.getTime()))
    ).map((ms) => new Date(ms))
    for (const date of uniqueEdgeTickDates) {
      const time = date.getTime()
      if (time < viewStart || time > viewEnd) continue

      const xPos = timescale.dateToPixels(date)
      let circle = edgeMap.get(time)
      if (!circle) {
        circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.classList.add('edge-tick-circle')
        circle.setAttribute('data-ms', time.toString())
        circle.setAttribute('r', (this.circleMarkerRadius - 2).toString())
        circle.setAttribute('pointer-events', 'auto')
        circle.setAttribute('fill', 'var(--yfiles-event-timeline-time-color, #89919c)')
        circle.setAttribute('stroke', 'var(--yfiles-event-timeline-time-color, #89919c)')
        circle.setAttribute('stroke-width', '1')
        circle.addEventListener('mouseenter', () => {
          timescale.onEdgeTickHover?.(date)
        })
        circle.addEventListener('mouseleave', () => {
          timescale.onEdgeTickUnhover?.()
        })
        circlesGroup.appendChild(circle)
      }
      circle.setAttribute('cx', xPos.toString())
      circle.setAttribute('cy', circleY.toString())
      circle.style.display = 'block'
      seenEdgeTime.add(time)
    }

    edgeMap.forEach((circle, ms) => {
      if (!seenEdgeTime.has(ms)) circle.remove() // Remove instead of hiding
    })

    // Highlight edge ticks (within highlightsGroup)
    const seenHighlightedEdgeTime = new Set()
    const highlightElements = highlightsGroup.querySelectorAll('.highlight-tick-slot')
    const highlightMap = new Map()
    highlightElements.forEach((g) => highlightMap.set(g.getAttribute('data-id'), g))

    timescale.highlightEdgeTicks.forEach((tick, index) => {
      // Only draw highlight ticks for the first and last edge of the group
      if (index !== 0 && index !== timescale.highlightEdgeTicks.length - 1) return

      const time = tick.time.getTime()
      if (time < viewStart || time > viewEnd) return

      const xPos = timescale.dateToPixels(tick.time)
      const id = `highlight-${index}-${time}`
      let slot = highlightMap.get(id)
      if (!slot) {
        slot = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        slot.classList.add('highlight-tick-slot')
        slot.setAttribute('data-id', id)
        slot.setAttribute('data-ms', time.toString())

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.classList.add('edge-tick-circle-highlight')
        circle.setAttribute('r', (this.circleMarkerRadius + 1).toString())
        circle.setAttribute('pointer-events', 'auto')
        circle.setAttribute('fill', 'var(--yfiles-event-timeline-highlight-edge-color, #d9bb7d)')
        circle.setAttribute('stroke', 'var(--yfiles-event-timeline-highlight-edge-color, #d9bb7d)')
        circle.setAttribute('stroke-width', '1')
        circle.addEventListener('mouseenter', () => {
          timescale.onEdgeTickHover?.(tick.time)
        })
        circle.addEventListener('mouseleave', () => {
          timescale.onEdgeTickUnhover?.()
        })
        slot.appendChild(circle)

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.classList.add('edge-tick-highlight-label')
        text.setAttribute('fill', 'var(--yfiles-event-timeline-highlight-edge-color, #d9bb7d)')
        text.setAttribute('font-size', '11')
        text.setAttribute('font-weight', 'bold')
        text.setAttribute('font-family', 'sans-serif')
        text.setAttribute('text-anchor', 'start')
        text.setAttribute('dominant-baseline', 'middle')
        slot.appendChild(text)

        highlightsGroup.appendChild(slot)
      }

      const circle = slot.querySelector('circle')
      circle.setAttribute('cx', xPos.toString())
      circle.setAttribute('cy', circleY.toString())

      const label = timescale.formatByScale(tick.time, normalTick)
      const text = slot.querySelector('.edge-tick-highlight-label')

      // Position label at the top of the tick area (above major tick labels)
      const labelY = viewportY + this.config.timescaleHeight * 0.3
      text.setAttribute('x', (xPos + 4).toString())
      text.setAttribute('y', labelY.toString())
      text.textContent = label

      slot.style.display = 'block'
      seenHighlightedEdgeTime.add(id)
    })

    highlightMap.forEach((slot, id) => {
      if (!seenHighlightedEdgeTime.has(id)) slot.remove()
    })
  }

  createTickGroup() {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.classList.add('tick-slot')
    g.style.pointerEvents = 'none'

    // Vertical tick line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.classList.add('tick-line')
    line.setAttribute('stroke', 'var(--yfiles-event-timeline-tick-color, #89919c)')
    line.setAttribute('stroke-width', '1')
    g.appendChild(line)

    // Horizontal label text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.classList.add('tick-label')
    text.setAttribute('fill', 'var(--yfiles-event-timeline-time-color, #89919c)')
    text.setAttribute('font-family', 'sans-serif')
    text.setAttribute('text-anchor', 'start')
    text.setAttribute('dominant-baseline', 'middle')
    g.appendChild(text)

    return g
  }

  updateTickGroup(g, xPos, startY, endY, displayLabel, tickClass, labelY) {
    const line = g.querySelector('.tick-line')
    const text = g.querySelector('.tick-label')
    if (!line || !text) return

    // Draw vertical tick line
    line.setAttribute('x1', xPos.toString())
    line.setAttribute('y1', startY.toString())
    line.setAttribute('x2', xPos.toString())
    line.setAttribute('y2', endY.toString())
    line.setAttribute('class', `tick-line ${tickClass}`)

    // Position horizontal label to the right of the tick (or hide if no space)
    if (displayLabel === null) {
      text.style.display = 'none'
    } else {
      text.style.display = ''
      text.setAttribute('x', (xPos + 4).toString()) // 4px offset from tick line
      text.setAttribute('y', (labelY ?? startY).toString())
      text.textContent = displayLabel
      text.setAttribute('class', `tick-label ${tickClass}-label`)
    }
  }
}

/**
 * A visual creator that renders the timescale's gridlines into the GraphComponent's background.
 */
export class TimescaleGridlineVisual extends BaseClass(IVisualCreator) {
  timescale

  constructor(timescale) {
    super()
    this.timescale = timescale
  }

  createVisual(context) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.classList.add('timescale-gridlines')
    this.updateGroup(g, context)
    return new SvgVisual(g)
  }

  updateVisual(context, oldVisual) {
    const g = oldVisual.svgElement
    this.updateGroup(g, context)
    return oldVisual
  }

  updateGroup(g, context) {
    const timescale = this.timescale
    const viewStart = timescale.visibleRange[0].getTime()
    const viewEnd = timescale.visibleRange[1].getTime()
    const viewportY = context.canvasComponent.viewport.y

    const tickInterval = timescale.tickInterval
    const higherOrderTick = TimeScale.determineTickType(tickInterval, true)

    const firstTick = Math.floor(viewStart / tickInterval) * tickInterval
    const lastTick = Math.floor(viewEnd / tickInterval) * tickInterval
    const neededCount = Math.max(0, Math.floor((lastTick - firstTick) / tickInterval) + 1)

    // Sync line elements
    const lines = Array.from(g.querySelectorAll('.gridline'))
    while (lines.length < neededCount) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.classList.add('gridline')
      line.classList.add('higher-order-tick')
      line.setAttribute('pointer-events', 'none')
      g.appendChild(line)
      lines.push(line)
    }
    while (lines.length > neededCount) {
      lines.pop()?.remove()
    }

    const bottomY =
      viewportY + context.canvasComponent.innerSize.height / context.canvasComponent.zoom

    for (let i = 0; i < neededCount; i++) {
      const tickMs = firstTick + i * tickInterval
      const currentDate = new Date(tickMs)
      const xPos = timescale.dateToPixels(currentDate)

      const currentHigherOrder = timescale.getHigherOrderValue(currentDate, higherOrderTick)
      const lastHigherOrder = timescale.getHigherOrderValue(
        new Date(tickMs - tickInterval),
        higherOrderTick
      )

      const line = lines[i]
      if (currentHigherOrder !== lastHigherOrder) {
        line.setAttribute('x1', xPos.toString())
        line.setAttribute('y1', viewportY.toString())
        line.setAttribute('x2', xPos.toString())
        line.setAttribute('y2', bottomY.toString())
        line.style.display = 'block'
      } else {
        line.style.display = 'none'
      }
    }
  }
}
