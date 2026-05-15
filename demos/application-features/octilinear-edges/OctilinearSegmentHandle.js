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
import { BaseClass, Cursor, IHandle, Point } from '@yfiles/yfiles'
import { getHandleOffset } from './utils'

/**
 * The custom handle that sits in the middle of an octilinear segment. It wraps the original handle
 * of the bend and delegates the operations with an offset to the original handle.
 */
export class OctilinearSegmentHandle extends BaseClass(IHandle) {
  coreHandle
  bend
  initialBendLocation
  initialHandleOffset
  cursorHandleOffset
  isMultiselection = false
  draggedOnSegment

  /**
   * Initializes a new instance of the {@link OctilinearSegmentHandle} class.
   * @param bend The bend that is being manipulated.
   * @param coreHandle The original handle being decorated.
   * @param draggedOnSegment Whether this handle is controlled by the
   * {@link OctilinearSegmentPositionHandler} and responsible for dragging on the segment rather
   * than the actual handle. This is relevant for the degeneration compensation.
   */
  constructor(bend, coreHandle, draggedOnSegment) {
    super()
    this.bend = bend
    this.coreHandle = coreHandle
    this.draggedOnSegment = draggedOnSegment
  }

  get location() {
    return this.coreHandle.location.toPoint().add(getHandleOffset(this.bend))
  }

  get tag() {
    return this.coreHandle.tag
  }

  get type() {
    return this.coreHandle.type
  }

  get cursor() {
    return Cursor.MOVE
  }

  handleClick(evt) {
    this.coreHandle.handleClick(evt)
  }

  /**
   * Captures the initial state of the bend, the offset of the handle to the bend, and the offset of
   * the cursor to the handle before a drag operation starts.
   */
  initializeDrag(context) {
    this.initialBendLocation = this.bend.location.toPoint()
    this.initialHandleOffset = getHandleOffset(this.bend)
    // if the handle is not dragged via the segment, it is directly moved so use its center location
    const grabLocation = this.draggedOnSegment
      ? context.canvasComponent.lastPointerEvent.location
      : this.location.toPoint()
    this.cursorHandleOffset = grabLocation.subtract(this.bend.location.toPoint())
    this.isMultiselection = context.canvasComponent.selection.bends.size > 1

    this.coreHandle.initializeDrag(context)
  }

  handleMove(context, originalLocation, newLocation) {
    const locationDelta = newLocation.subtract(originalLocation)
    this.handleBendMove(context, newLocation, locationDelta)
  }

  /**
   * Performs the move of the bend by calculating its new location and delegating to the core handle.
   * @param context The input mode context.
   * @param newLocation The new location of the cursor.
   * @param locationDelta The delta the cursor has moved since {@link initializeDrag}.
   */
  handleBendMove(context, newLocation, locationDelta) {
    const initialHandleOffset = this.initialHandleOffset
    if (initialHandleOffset.x === 0 && initialHandleOffset.y === 0) {
      // if there is no offset between the handle and its bend, this means that the cutting length
      // is 0 and the move can simply be delegated to the core handle
      this.coreHandle.handleMove(context, this.initialBendLocation, newLocation)
    } else {
      const currentHandleOffset = getHandleOffset(this.bend)
      // If an octilinear segment is forced to shrink because it hits an obstacle (e.g., a node or
      // another octilinear segment) during a bend move, the bend must be moved closer to the cursor
      // than the actual mouse delta to keep the handle attached to the cursor. This compensation
      // is not supported with multi-selection.
      const degenerationCompensation = this.isMultiselection
        ? Point.ORIGIN
        : new Point(
            this.cursorHandleOffset.x * (1 - currentHandleOffset.x / initialHandleOffset.x),
            this.cursorHandleOffset.y * (1 - currentHandleOffset.y / initialHandleOffset.y)
          )
      const newHandleLocation = this.initialBendLocation
        .add(locationDelta)
        .add(degenerationCompensation)

      this.coreHandle.handleMove(context, this.initialBendLocation, newHandleLocation)
    }
  }

  dragFinished(context, originalLocation, newLocation) {
    this.coreHandle.dragFinished(context, this.initialBendLocation, newLocation)
  }

  cancelDrag(context, originalLocation) {
    this.coreHandle.cancelDrag(context, this.initialBendLocation)
  }
}
