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
  HandleType,
  IHandle,
  IHandleProvider,
  IReshapeHandleProvider,
  List,
  Point
} from '@yfiles/yfiles'
import { getProjectedHeightTranslation, getVisualTranslation } from '../core/Pseudo3DProjection'
import { getNodeElevationForGraph, getNodeHeight } from '../core/nodeElevation'

/**
 * Reshape handle wrapper that keeps the regular yFiles reshape behavior but
 * places the handle at the projected top face of the pseudo-3D node.
 */
class TopFaceReshapeHandle extends BaseClass(IHandle) {
  originalHandle

  node

  context

  constructor(originalHandle, node, context) {
    super()
    this.context = context
    this.node = node
    this.originalHandle = originalHandle
  }

  get type() {
    return this.originalHandle.type
  }

  get tag() {
    return this.originalHandle.tag
  }

  get cursor() {
    return this.originalHandle.cursor
  }

  get location() {
    const topZ = getNodeElevationForGraph(this.context.graph, this.node) + getNodeHeight(this.node)
    const topFaceTranslation = getProjectedHeightTranslation(
      this.context.graphComponent.projection,
      topZ,
      this.context.projectionState.inclination
    )
    const originalLocation = this.originalHandle.location
    return new Point(originalLocation.x, originalLocation.y).add(topFaceTranslation)
  }

  handleClick(evt) {
    this.originalHandle.handleClick(evt)
  }

  initializeDrag(context) {
    this.originalHandle.initializeDrag(context)
  }

  handleMove(context, originalLocation, newLocation) {
    this.originalHandle.handleMove(context, originalLocation, newLocation)
  }

  cancelDrag(context, originalLocation) {
    this.originalHandle.cancelDrag(context, originalLocation)
  }

  dragFinished(context, originalLocation, newLocation) {
    this.originalHandle.dragFinished(context, originalLocation, newLocation)
  }
}

/**
 * Wraps the node's default reshape provider so constraints, snapping, and the
 * underlying IReshapeHandler continue to be supplied by yFiles.
 */
class TopFaceReshapeHandleProvider extends BaseClass(IReshapeHandleProvider) {
  originalProvider

  node

  context

  constructor(originalProvider, node, context) {
    super()
    this.context = context
    this.node = node
    this.originalProvider = originalProvider
  }

  getAvailableHandles(context) {
    return this.originalProvider.getAvailableHandles(context)
  }

  getHandle(context, position) {
    const originalHandle = this.originalProvider.getHandle(context, position)
    return new TopFaceReshapeHandle(originalHandle, this.node, this.context)
  }
}

export default TopFaceReshapeHandleProvider

/**
 * A handle that edits the pseudo-3D height stored in the node tag. The handle
 * stays at the center of the projected top face while the node is edited.
 */
export class NodeHeightHandle extends BaseClass(IHandle) {
  dragging = false
  originalHeight = 0

  node

  pseudo3dContext

  onHeightChanged

  minimumHeight = 0

  constructor(node, pseudo3dContext, onHeightChanged, minimumHeight = 0) {
    super()
    this.minimumHeight = minimumHeight
    this.onHeightChanged = onHeightChanged
    this.pseudo3dContext = pseudo3dContext
    this.node = node
  }

  get type() {
    return HandleType.RESIZE
  }

  get tag() {
    return null
  }

  get cursor() {
    return this.dragging ? Cursor.GRABBING : Cursor.GRAB
  }

  get location() {
    const topZ =
      getNodeElevationForGraph(this.pseudo3dContext.graph, this.node) + getNodeHeight(this.node)
    const topFaceTranslation = getProjectedHeightTranslation(
      this.pseudo3dContext.graphComponent.projection,
      topZ,
      this.pseudo3dContext.projectionState.inclination
    )
    return new Point(this.node.layout.center.x, this.node.layout.center.y).add(topFaceTranslation)
  }

  initializeDrag() {
    this.originalHeight = getNodeHeight(this.node)
    this.dragging = true
  }

  handleMove(context, originalLocation, newLocation) {
    this.updateHeight(context, originalLocation, newLocation)
  }

  cancelDrag() {
    this.setHeight(this.originalHeight)
    this.dragging = false
  }

  dragFinished(context, originalLocation, newLocation) {
    this.updateHeight(context, originalLocation, newLocation)
    this.dragging = false
  }

  handleClick(_evt) {}

  updateHeight(context, originalLocation, newLocation) {
    const projectedHeightScale = getVisualTranslation(
      1,
      this.pseudo3dContext.projectionState.inclination
    )
    if (Math.abs(projectedHeightScale) < Number.EPSILON) {
      return
    }

    const canvas = context.canvasComponent
    const oldY = canvas.worldToViewCoordinates(originalLocation).y
    const newY = canvas.worldToViewCoordinates(newLocation).y
    const projectedDelta = (newY - oldY) / context.zoom
    const height = this.originalHeight - projectedDelta / projectedHeightScale
    this.setHeight(Math.max(this.minimumHeight, height))
  }

  setHeight(height) {
    const tag = this.node.tag
    this.node.tag = { ...(tag && typeof tag === 'object' ? tag : {}), height }
    this.onHeightChanged()
  }
}

/** Supplies the existing node handles plus the pseudo-3D height handle. */
export class NodeHeightHandleProvider extends BaseClass(IHandleProvider) {
  node

  originalProvider

  context

  onHeightChanged

  minimumHeight = 0

  constructor(node, originalProvider, context, onHeightChanged, minimumHeight = 0) {
    super()
    this.minimumHeight = minimumHeight
    this.onHeightChanged = onHeightChanged
    this.context = context
    this.originalProvider = originalProvider
    this.node = node
  }

  getHandles(context) {
    const handles = new List()
    if (this.originalProvider) {
      handles.addRange(this.originalProvider.getHandles(context))
    }
    handles.add(
      new NodeHeightHandle(this.node, this.context, this.onHeightChanged, this.minimumHeight)
    )
    return handles
  }
}
