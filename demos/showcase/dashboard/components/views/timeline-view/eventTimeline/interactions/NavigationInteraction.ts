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
import {
  EventRecognizers,
  type GraphComponent,
  type GraphViewerInputMode,
  MarqueeSelectionInputMode,
  MouseWheelBehaviors,
  PointerButtons,
  PointerEventArgs,
  PointerEventType,
  Rect
} from '@yfiles/yfiles'
import type { TimeScale } from '../components/Timescale'
import type { CoordinateMapping } from '../components/CoordinateMapping'
import type { ViewportManager } from '../components/ViewportManager'
import { MarqueeRectangleRenderer } from '../components/MarqueeRectangleRenderer'
import type { EventTimelineConfig } from '../EventTimelineConfig'

export class NavigationInteraction {
  private readonly graphComponent: GraphComponent

  private readonly richInteraction: boolean

  private readonly config: EventTimelineConfig

  private readonly timescale?: TimeScale

  private readonly coordinateMapping?: CoordinateMapping

  private readonly viewportManager?: ViewportManager

  private readonly clearHighlights?: () => void

  constructor(
    graphComponent: GraphComponent,
    richInteraction: boolean,
    config: EventTimelineConfig,
    timescale?: TimeScale,
    coordinateMapping?: CoordinateMapping,
    viewportManager?: ViewportManager,
    clearHighlights?: () => void
  ) {
    this.clearHighlights = clearHighlights
    this.viewportManager = viewportManager
    this.coordinateMapping = coordinateMapping
    this.timescale = timescale
    this.config = config
    this.richInteraction = richInteraction
    this.graphComponent = graphComponent
  }

  configure(): void {
    if (!this.richInteraction) {
      return
    }

    const inputMode = this.graphComponent.inputMode as GraphViewerInputMode
    this.configureMarqueeZoom(inputMode)
    this.graphComponent.mouseWheelBehavior = MouseWheelBehaviors.NONE
    this.graphComponent.minimumZoom = 1.0
    this.graphComponent.maximumZoom = 1.0

    inputMode.waitInputMode.waitCursor = 'default'

    inputMode.moveViewportInputMode.addEventListener('dragging', async () => {
      this.timescale?.armAnimation(
        this.viewportManager!.calculateVisibleRange(
          this.graphComponent.viewport,
          this.coordinateMapping!.stretchX
        )
      )
      this.timescale?.animate(1)
    })

    this.graphComponent.addEventListener('wheel', async (evt) => {
      evt.preventDefault()
      if (!inputMode.waitInputMode.waiting) {
        const delta = evt.wheelDeltaY
        await this.viewportManager!.changeResolution1D(
          delta,
          evt.ctrlKey ? 'vertical' : 'horizontal',
          evt.location
        )
      }
    })
  }

  private configureMarqueeZoom(inputMode: GraphViewerInputMode): void {
    const timescaleHeight = this.config.timescaleHeight
    const mode = new MarqueeSelectionInputMode({
      marqueeRenderer: new MarqueeRectangleRenderer(),
      beginRecognizer: (evt) => {
        if (!(evt instanceof PointerEventArgs)) return false
        const isRightClick =
          evt.buttons === PointerButtons.MOUSE_RIGHT && evt.eventType === PointerEventType.DOWN
        const isLeftClickInHeader =
          evt.buttons === PointerButtons.MOUSE_LEFT &&
          evt.eventType === PointerEventType.DOWN &&
          evt.location.y <= this.graphComponent.viewport.y + timescaleHeight
        return isRightClick || isLeftClickInHeader
      },
      moveRecognizer: (evt) =>
        evt instanceof PointerEventArgs && evt.eventType === PointerEventType.DRAG,
      finishRecognizer: (evt) => {
        if (!(evt instanceof PointerEventArgs)) return false
        return (
          (evt.changedButtons === PointerButtons.MOUSE_RIGHT ||
            evt.changedButtons === PointerButtons.MOUSE_LEFT) &&
          evt.eventType === PointerEventType.UP
        )
      },
      cancelRecognizer: (evt, sender) =>
        EventRecognizers.ESCAPE_DOWN(evt, sender) ||
        (evt instanceof PointerEventArgs && evt.eventType === PointerEventType.DRAG_CAPTURE_LOST),
      useViewCoordinates: false
    })

    let isTimescaleDrag = false

    mode.addEventListener('drag-starting', (args) => {
      const startPoint = args.context.canvasComponent.lastPointerEvent.location
      isTimescaleDrag = startPoint.y <= this.graphComponent.viewport.y + timescaleHeight

      if (isTimescaleDrag) {
        if (this.timescale) {
          this.timescale.isDragging = true
          this.timescale.dragStartX = startPoint.x
        }
      }
    })

    mode.addEventListener('drag-started', () => {
      ;(mode.marqueeRenderer as MarqueeRectangleRenderer).isTimescaleDrag = isTimescaleDrag
      this.graphComponent.invalidate()
    })

    mode.addEventListener('dragging', () => {
      if (isTimescaleDrag) {
        this.graphComponent.invalidate()
      }
    })

    mode.addEventListener('drag-finished', async (args) => {
      this.clearHighlights?.()
      if (isTimescaleDrag) {
        if (this.timescale) {
          this.timescale.isDragging = false
        }
        const rect = args.rectangle
        const viewport = this.graphComponent.viewport
        await this.viewportManager!.changeResolution2D(
          new Rect(rect.x, viewport.y, rect.width, viewport.height)
        )
      } else {
        await this.viewportManager!.changeResolution2D(args.rectangle)
      }
      this.graphComponent.invalidate()
    })

    mode.addEventListener('drag-canceled', () => {
      if (isTimescaleDrag && this.timescale) {
        this.timescale.isDragging = false
      }
      isTimescaleDrag = false
      this.graphComponent.invalidate()
    })
    inputMode.add(mode)
  }
}
