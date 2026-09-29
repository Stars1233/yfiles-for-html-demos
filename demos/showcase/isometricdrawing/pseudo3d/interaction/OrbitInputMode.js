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
  BaseClass,
  Cursor,
  IHitTestable,
  IPositionHandler,
  MoveInputMode,
  MutablePoint,
  Point,
  PointerButtons
} from '@yfiles/yfiles'
import {} from '../core/Pseudo3DProjection'

const ROTATION_DEGREES_PER_PIXEL = 0.45
const INCLINATION_DEGREES_PER_PIXEL = 0.95

/** Right-drag orbit control that updates the shared pseudo-3D projection state. */
export class OrbitInputMode extends MoveInputMode {
  constructor(projectionState, onProjectionChanged) {
    super()

    const pointerLocationState = { start: null, current: null }

    this.priority = 104
    this.hitTestable = IHitTestable.ALWAYS
    this.positionHandler = new OrbitPositionHandler(
      projectionState,
      onProjectionChanged,
      pointerLocationState
    )
    this.validBeginCursor = Cursor.GRAB
    this.moveCursor = Cursor.GRABBING
    this.beginRecognizer = (evt) => {
      updatePointerLocationState(pointerLocationState, evt, true)
      return isRightMouseDown(evt)
    }
    this.moveRecognizer = (evt) => {
      updatePointerLocationState(pointerLocationState, evt)
      return isRightMouseDrag(evt)
    }
    this.finishRecognizer = (evt) => {
      updatePointerLocationState(pointerLocationState, evt)
      return isRightMouseUp(evt)
    }
  }
}

class OrbitPositionHandler extends BaseClass(IPositionHandler) {
  locationPoint = new MutablePoint()
  startRotation = 0
  startInclination = 0

  projectionState

  onProjectionChanged

  pointerLocationState

  constructor(projectionState, onProjectionChanged, pointerLocationState) {
    super()
    this.pointerLocationState = pointerLocationState
    this.onProjectionChanged = onProjectionChanged
    this.projectionState = projectionState
  }

  get location() {
    return this.locationPoint
  }

  initializeDrag(_context) {
    this.startRotation = this.projectionState.rotation
    this.startInclination = this.projectionState.inclination
    this.projectionState.setOrbiting(true)
  }

  handleMove(_context, originalLocation, newLocation) {
    this.locationPoint.setLocation(newLocation)

    const dragDelta = this.getDragDelta(originalLocation, newLocation)
    this.projectionState.setRotation(this.startRotation + dragDelta.x * ROTATION_DEGREES_PER_PIXEL)
    this.projectionState.setInclination(
      clamp(this.startInclination - dragDelta.y * INCLINATION_DEGREES_PER_PIXEL, 10, 90)
    )
    this.onProjectionChanged(this.projectionState)

    return true
  }

  cancelDrag(_context, originalLocation) {
    this.locationPoint.setLocation(originalLocation)
    this.projectionState.setRotation(this.startRotation)
    this.projectionState.setInclination(this.startInclination)
    this.projectionState.setOrbiting(false)
    clearPointerLocationState(this.pointerLocationState)
    this.onProjectionChanged(this.projectionState)
  }

  dragFinished(_context, _originalLocation, newLocation) {
    this.locationPoint.setLocation(newLocation)
    this.projectionState.setOrbiting(false)
    this.onProjectionChanged(this.projectionState)
    clearPointerLocationState(this.pointerLocationState)
  }

  getDragDelta(originalLocation, newLocation) {
    const { start, current } = this.pointerLocationState
    if (start && current) {
      return current.subtract(start)
    }

    return newLocation.subtract(originalLocation)
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function isRightMouseDown(evt) {
  return getPointerButtons(evt, 'changedButtons') === PointerButtons.MOUSE_RIGHT
}

function isRightMouseDrag(evt) {
  return hasPointerButton(evt, 'buttons', PointerButtons.MOUSE_RIGHT)
}

function isRightMouseUp(evt) {
  return getPointerButtons(evt, 'changedButtons') === PointerButtons.MOUSE_RIGHT
}

function hasPointerButton(evt, key, button) {
  const buttons = getPointerButtons(evt, key)
  return buttons !== null && (buttons & button) === button
}

function getPointerButtons(evt, key) {
  const value = evt?.[key]
  return typeof value === 'number' ? value : null
}

function updatePointerLocationState(state, evt, resetStart = false) {
  const point = getClientPoint(evt)
  if (!point) {
    return
  }

  if (resetStart || !state.start) {
    state.start = point
  }
  state.current = point
}

function clearPointerLocationState(state) {
  state.start = null
  state.current = null
}

function getClientPoint(evt) {
  const originalEvent = evt?.originalEvent
  if (!(originalEvent instanceof MouseEvent)) {
    return null
  }

  return new Point(originalEvent.clientX, originalEvent.clientY)
}
