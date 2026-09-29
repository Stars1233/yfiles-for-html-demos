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
  IEdgePortHandleProvider,
  IHandle,
  Point,
  PortRelocationHandle
} from '@yfiles/yfiles'
import { getProjectedHeightTranslation } from '../core/Pseudo3DProjection'
import { getEdgeTerrainPath } from '../edge/terrain'

/**
 * Keeps an edge port handle on the projected terrain while delegating the
 * actual port relocation behavior to yFiles.
 */
class ProjectedEdgePortHandle extends BaseClass(IHandle) {
  originalHandle

  edge

  sourceHandle

  context

  constructor(originalHandle, edge, sourceHandle, context) {
    super()
    this.context = context
    this.sourceHandle = sourceHandle
    this.edge = edge
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
    const terrainPath = getEdgeTerrainPath(this.edge, this.context.graph)
    const endpoint = this.sourceHandle ? terrainPath[0] : terrainPath[terrainPath.length - 1]
    if (!endpoint) {
      return this.originalHandle.location
    }

    const projectedHeight = getProjectedHeightTranslation(
      this.context.graphComponent.projection,
      endpoint.z,
      this.context.projectionState.inclination
    )
    return new Point(this.originalHandle.location.x, this.originalHandle.location.y).add(
      projectedHeight
    )
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

/** Wraps edge port handles with the projected height of their endpoints. */
export class EdgePortHandleProvider extends BaseClass(IEdgePortHandleProvider) {
  originalProvider

  edge

  context

  constructor(originalProvider, edge, context) {
    super()
    this.context = context
    this.edge = edge
    this.originalProvider = originalProvider
  }

  getHandle(context, sourceHandle) {
    const originalHandle = this.originalProvider.getHandle(context, sourceHandle)
    if (originalHandle instanceof PortRelocationHandle) {
      // The projected reconnection provider supplies the current port as a
      // candidate already. Disable the handle's separate built-in copy, which
      // would otherwise be rendered in unprojected coordinates.
      originalHandle.addExistingPort = false
    }
    return originalHandle
      ? new ProjectedEdgePortHandle(originalHandle, this.edge, sourceHandle, this.context)
      : null
  }
}
