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
import { Animator, IAnimation, Point, Rect, TimeSpan } from '@yfiles/yfiles'

/**
 * Manages viewport changes, zooming, and animations for the EventTimeline.
 */
export class ViewportManager {
  graphComponent

  coordinateMapping

  onStylesUpdate

  onYUnitsUpdate

  applyLayout

  renderTimescale

  constructor(
    graphComponent,
    coordinateMapping,
    onStylesUpdate,
    onYUnitsUpdate,
    applyLayout,
    renderTimescale
  ) {
    this.renderTimescale = renderTimescale
    this.applyLayout = applyLayout
    this.onYUnitsUpdate = onYUnitsUpdate
    this.onStylesUpdate = onStylesUpdate
    this.coordinateMapping = coordinateMapping
    this.graphComponent = graphComponent
  }

  /**
   * Changes the resolution in one dimension.
   * @param delta The scroll delta or zoom factor.
   * @param dir The direction of the zoom.
   * @param evtPos The position of the mouse event.
   * @param isRawDelta Whether the delta is a raw scroll delta (true) or a zoom factor (false).
   */
  async changeResolution1D(delta, dir, evtPos, isRawDelta = true) {
    const ZOOM_SENSITIVITY = 0.02
    const factor = isRawDelta
      ? Math.pow(this.graphComponent.mouseWheelZoomFactor, -delta * ZOOM_SENSITIVITY)
      : delta

    const { viewport } = this.graphComponent
    const fixPoint = evtPos ?? viewport.center
    const stretchX =
      dir === 'horizontal'
        ? this.coordinateMapping.stretchX * factor
        : this.coordinateMapping.stretchX
    const stretchY =
      dir === 'vertical'
        ? this.coordinateMapping.stretchY * factor
        : this.coordinateMapping.stretchY
    await this.applyLayoutResolutionAnimation(stretchX, stretchY, '0.05s', fixPoint)
  }

  /**
   * Changes the resolution in two dimensions to fit a given rectangle.
   */
  async changeResolution2D(rect, duration = '1s') {
    const { viewport } = this.graphComponent

    const calcFixPoint = (p1, p2) => {
      const d = p1[1] / p2[1] / (1 - p1[1] / p2[1])
      return p1[0] + (p1[0] - p2[0]) * d
    }

    const getFixPoint = (fromRect, toRect) => {
      return new Point(
        fromRect.width === toRect.width
          ? toRect.centerX
          : calcFixPoint([fromRect.x, fromRect.width], [toRect.x, toRect.width]),
        fromRect.height === toRect.height
          ? toRect.centerY
          : calcFixPoint([fromRect.y, fromRect.height], [toRect.y, toRect.height])
      )
    }

    const stretchX = (this.coordinateMapping.stretchX * viewport.width) / rect.width
    const stretchY = (this.coordinateMapping.stretchY * viewport.height) / rect.height
    const fixPoint = getFixPoint(viewport, rect)
    const { zoom } = this.graphComponent
    const panTargetX =
      viewport.width === rect.width
        ? fixPoint.x - this.graphComponent.size.width / (2 * zoom)
        : undefined
    const panTargetY =
      viewport.height === rect.height
        ? fixPoint.y - this.graphComponent.size.height / (2 * zoom)
        : undefined

    await this.applyLayoutResolutionAnimation(
      stretchX,
      stretchY,
      duration,
      fixPoint,
      panTargetX,
      panTargetY
    )
  }

  /**
   * Resets the zoom to fit the entire graph.
   */
  async resetZoom(domain, duration = '1s') {
    const bounds = this.getBounds(domain)
    await this.changeResolution2D(
      bounds.getEnlarged({
        top: bounds.height * 0.2,
        right: bounds.width * 0.05,
        bottom: bounds.height * 0.1,
        left: bounds.width * 0.1
      }),
      duration
    )
  }

  /**
   * Applies the resolution animation.
   * @param stretchX The target x stretch factor or a [start, end] tuple.
   * @param stretchY The target y stretch factor or a [start, end] tuple.
   * @param duration The duration of the animation.
   * @param fixPoint The fixed point of the animation.
   * @param panTargetX Explicit target viewPoint.x for pan-only X movement (no stretch change).
   *   When provided, the X coordinate is interpolated directly from start to target using t,
   *   instead of relying on the fix-point error correction (which yields zero for pure pans).
   * @param panTargetY Explicit target viewPoint.y for pan-only Y movement (no stretch change).
   */
  async applyLayoutResolutionAnimation(
    stretchX,
    stretchY,
    duration,
    fixPoint,
    panTargetX,
    panTargetY
  ) {
    const stretchXValues = Array.isArray(stretchX)
      ? stretchX
      : [this.coordinateMapping.stretchX, stretchX]
    const stretchYValues = Array.isArray(stretchY)
      ? stretchY
      : [this.coordinateMapping.stretchY, stretchY]

    if (stretchXValues[1] < 0.00001 || stretchYValues[1] < 0.00001) {
      return
    }

    const interpolateLinear = (start, end, t) => {
      return start + (end - start) * t
    }

    const interpolateZoom = (start, end, t) => {
      if (start === end) return start
      return Math.exp(interpolateLinear(Math.log(start), Math.log(end), t))
    }

    const actualFixPoint = fixPoint ?? this.graphComponent.viewport.center
    const fixViewPoint = this.graphComponent.worldToViewCoordinates(actualFixPoint)

    const viewPointTime = this.coordinateMapping.xToTime(actualFixPoint.x, stretchXValues[0])
    const yWorld = this.coordinateMapping.mapPositionToYUnits(actualFixPoint.y, stretchYValues[0])

    // Capture starting viewPoint for pan-dimension direct interpolation.
    const startViewPointX = this.graphComponent.viewPoint.x
    const startViewPointY = this.graphComponent.viewPoint.y

    const animation = IAnimation.fromHandler((t) => {
      const currentStretchX = interpolateZoom(stretchXValues[0], stretchXValues[1], t)
      const currentStretchY = interpolateZoom(stretchYValues[0], stretchYValues[1], t)

      this.coordinateMapping.stretchX = currentStretchX
      this.coordinateMapping.stretchY = currentStretchY

      this.applyLayout()

      const worldForViewPointTime = this.coordinateMapping.timeToX(viewPointTime, currentStretchX)
      const yUnitForPosition = this.coordinateMapping.mapYUnitsToPosition(yWorld, currentStretchY)

      const viewForViewPointTime = this.graphComponent.worldToViewCoordinates(
        new Point(worldForViewPointTime, yUnitForPosition)
      )

      const error = fixViewPoint.subtract(viewForViewPointTime).multiply(this.graphComponent.zoom)
      const zoomCorrectedViewPoint = this.graphComponent.viewPoint.subtract(error)

      // For pan-only dimensions (no stretch change), directly interpolate the viewPoint
      // using t so the easing curve drives the movement smoothly.
      // For zooming dimensions, use the fix-point error correction
      this.graphComponent.viewPoint = new Point(
        panTargetX !== undefined
          ? interpolateLinear(startViewPointX, panTargetX, t)
          : zoomCorrectedViewPoint.x,
        panTargetY !== undefined
          ? interpolateLinear(startViewPointY, panTargetY, t)
          : zoomCorrectedViewPoint.y
      )

      this.renderTimescale(
        this.calculateVisibleRange(this.graphComponent.viewport, currentStretchX)
      )
    }, TimeSpan.from(duration))

    try {
      await new Animator({
        canvasComponent: this.graphComponent,
        allowUserInteraction: false
      }).animate(animation.createEasedAnimation())
    } finally {
      this.onStylesUpdate()
      this.graphComponent.updateContentBounds()
      this.onYUnitsUpdate()
    }
  }

  /**
   * Calculates the visible time range for a given viewport.
   */
  calculateVisibleRange(viewport, stretchX = this.coordinateMapping.stretchX) {
    const start = this.coordinateMapping.xToTime(viewport.x, stretchX)
    const end = this.coordinateMapping.xToTime(viewport.x + viewport.width, stretchX)
    return [start, end]
  }

  /**
   * Calculates value bounds of all items.
   * @param xDomain The x-domain of the timeline.
   */
  getBounds(xDomain) {
    const nodeCenters = this.graphComponent.graph.nodes.map((node) => node.layout.centerY)
    const yMinMax = nodeCenters.reduce(
      (acc, val) => {
        if (val < acc.min) acc.min = val
        if (val > acc.max) acc.max = val
        return acc
      },
      { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
    )
    const start = this.coordinateMapping.timeToX(xDomain[0])
    const end = this.coordinateMapping.timeToX(xDomain[1])
    return new Rect(start, yMinMax.min, end - start, yMinMax.max - yMinMax.min)
  }

  /**
   * Visually centers a clicked hyperedge in the viewport.
   * @param upperY The largest y-coordinate of the clicked hyperedge.
   * @param lowerY The lowest y-coordinate of the clicked hyperedge.
   * @param bundle The clicked hyperedge bundle.
   */
  async hyperEdgeCallback(upperY, lowerY, bundle) {
    const newVP = new Rect(
      bundle.edgeRange[0].sourcePort.location.x - this.graphComponent.viewport.width * 0.5,
      upperY - (lowerY - upperY) * 0.1,
      this.graphComponent.viewport.width,
      lowerY - upperY + (lowerY - upperY) * 0.2
    )
    return this.changeResolution2D(newVP, '1s')
  }
}
