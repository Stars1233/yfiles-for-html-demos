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
import { BaseClass, EventRecognizers, IHandle, IPositionHandler } from '@yfiles/yfiles'
import { getCornerType, getCuttingLength, getMaxCuttingLength, updateCuttingLength } from './utils'
import { OctilinearSegmentHandle } from './OctilinearSegmentHandle'

/**
 * A position handler for resizing and moving octilinear segments.
 *
 * Depending on the {@link moveBendRecognizer} and {@link resizeAllRecognizer} dragging on the octilinear segment
 * either moves the bend, or resizes the segment, or resizes all segments similarly in the graph.
 *
 * Moving the segment is delegated to an {@link OctilinearSegmentHandle} that considers the {@link
 * OrthogonalEdgeEditingContext} and implicitly keeps the bends orthogonal to each other.
 */
export class OctilinearSegmentPositionHandler extends BaseClass(IPositionHandler) {
  bendHandle
  bend
  initialCuttingLengths = new Map()
  isMove = true
  wasResizeAll = false

  /**
   * Whether the bend should be moved.
   */
  static moveBendRecognizer = EventRecognizers.SHIFT_IS_DOWN

  /**
   * Whether all segments in the graph should be resized.
   */
  static resizeAllRecognizer = EventRecognizers.CTRL_IS_DOWN

  /**
   * Returns the translated location of the bend handle.
   */
  get location() {
    return this.bendHandle.location
  }

  constructor(bend, startLocation) {
    super()
    this.bend = bend

    // moving the segment is handled by the octilinear handle
    const coreHandle = bend.lookup(IHandle)
    this.bendHandle = new OctilinearSegmentHandle(bend, coreHandle, true)
  }

  initializeDrag(context) {
    this.bend.owner.bends.forEach((bend) => {
      this.initialCuttingLengths.set(bend, getCuttingLength(bend))
    })

    this.isMove = OctilinearSegmentPositionHandler.moveBendRecognizer(
      context.canvasComponent.lastPointerEvent,
      null
    )

    this.bendHandle.initializeDrag(context)
  }

  handleMove(context, originalLocation, newLocation) {
    if (this.isMove) {
      this.bendHandle.handleMove(context, originalLocation, newLocation)
    } else {
      const isResizeAll = OctilinearSegmentPositionHandler.resizeAllRecognizer(
        context.canvasComponent.lastPointerEvent,
        null
      )
      this.handleResizeSegment(originalLocation, newLocation, isResizeAll)
      this.wasResizeAll = isResizeAll
    }
  }

  dragFinished(context, originalLocation, newLocation) {
    if (this.isMove) {
      this.bendHandle.dragFinished(context, originalLocation, newLocation)
    }
  }

  cancelDrag(context, originalLocation) {
    if (this.isMove) {
      this.bendHandle.cancelDrag(context, originalLocation)
    } else {
      const bendsToReset = this.wasResizeAll ? this.bend.owner.bends : [this.bend]
      bendsToReset.forEach((bend) => {
        updateCuttingLength(bend, this.initialCuttingLengths.get(bend))
      })
    }
  }

  /**
   * Resizes the segment by adjusting the cutting length of the bend.
   * @param originalLocation The original location of the drag gesture.
   * @param newLocation The new location resulting from the drag gesture.
   * @param resizeAll Whether all segments in the graph should be resized.
   */
  handleResizeSegment(originalLocation, newLocation, resizeAll) {
    if (!resizeAll && this.wasResizeAll) {
      // reset all other bends' cutting lengths
      this.bend.owner.bends.forEach((bend) => {
        if (bend !== this.bend) {
          updateCuttingLength(bend, this.initialCuttingLengths.get(bend))
        }
      })
    }

    const locationDelta = newLocation.subtract(originalLocation)
    const handleCorner = getCornerType(this.bend)
    const deltaL = this.deltaCuttingLength(locationDelta, handleCorner)
    const maxCuttingLength = getMaxCuttingLength(this.bend)
    const newCuttingLength = Math.max(
      0,
      Math.min(this.initialCuttingLengths.get(this.bend) + deltaL, maxCuttingLength)
    )

    if (resizeAll) {
      this.bend.owner.bends.forEach((bend) => {
        const maxCuttingLength = getMaxCuttingLength(bend)
        updateCuttingLength(bend, Math.min(newCuttingLength, maxCuttingLength))
      })
    } else {
      updateCuttingLength(this.bend, newCuttingLength)
    }
  }

  /**
   * Calculates the delta for the cutting length depending on the drag vector and the corner of the edge.
   * @param locationDelta The drag vector resulting from the user interaction.
   * @param handleCorner The corner of the edge where the bend is located.
   */
  deltaCuttingLength(locationDelta, handleCorner) {
    switch (handleCorner) {
      case 'TopLeft':
        return locationDelta.x + locationDelta.y
      case 'TopRight':
        return -locationDelta.x + locationDelta.y
      case 'BottomLeft':
        return locationDelta.x - locationDelta.y
      case 'BottomRight':
        return -locationDelta.x - locationDelta.y
    }
  }
}
