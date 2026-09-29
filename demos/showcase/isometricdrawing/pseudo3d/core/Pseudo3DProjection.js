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
import { Matrix, MatrixOrder, Point } from '@yfiles/yfiles'

const DEFAULT_INCLINATION = 35
const DEFAULT_ROTATION = 35
const MIN_INCLINATION = 10
const MAX_INCLINATION = 90
const DEG_TO_RAD = Math.PI / 180

let heightVectorCacheKey = null
let heightVectorCacheValue = null

/**
 * Mutable view-state object shared by the demo controls, orbit input mode, and
 * custom rendering styles. It stores only the camera parameters; consumers ask
 * it for a fresh projection matrix when they need to re-render.
 */
export class Pseudo3DProjectionState {
  _inclination = DEFAULT_INCLINATION
  _rotation = DEFAULT_ROTATION

  _isOrbiting = false

  constructor(inclination = DEFAULT_INCLINATION, rotation = DEFAULT_ROTATION, isOrbiting = false) {
    this.setOrbiting(isOrbiting)
    this.setRotation(rotation)
    this.setInclination(inclination)
  }

  get inclination() {
    return this._inclination
  }

  get rotation() {
    return this._rotation
  }

  get isOrbiting() {
    return this._isOrbiting
  }

  setInclination(inclination) {
    this._inclination = clampInclination(inclination)
  }

  setRotation(rotation) {
    this._rotation = normalizeRotation(rotation)
  }

  setOrbiting(isOrbiting) {
    this._isOrbiting = isOrbiting
  }

  createMatrix() {
    return createProjectionMatrix(this.inclination, this.rotation)
  }
}

export function createProjectionMatrix(inclination, rotation) {
  inclination = clampInclination(inclination)
  const projection = Matrix.createRotateInstance((normalizeRotation(rotation) * Math.PI) / 180)
  const scaling = new Matrix(1, 0, 0, Math.sin(inclination * DEG_TO_RAD), 0, 0)
  projection.multiply(scaling, MatrixOrder.APPEND)
  return projection
}

/** Returns the layout-space direction that corresponds to a positive world-Z lift. */
export function calculateHeightVector(projection) {
  const key = getProjectionKey(projection)
  if (key === heightVectorCacheKey && heightVectorCacheValue) {
    return heightVectorCacheValue
  }

  const inverseProjection = projection.clone()
  inverseProjection.invert()
  const heightVector = inverseProjection.transform(new Point(0, -1))
  heightVectorCacheKey = key
  heightVectorCacheValue = heightVector
  return heightVector
}

export function getVisualTranslation(length, inclination) {
  return length * Math.cos(inclination * DEG_TO_RAD)
}

/** Returns the layout-space translation of a point lifted by the given Z value. */
export function getProjectedHeightTranslation(projection, z, inclination) {
  return calculateHeightVector(projection).multiply(getVisualTranslation(z, inclination))
}

export function getProjectionHelpersForMatrix(projection, inclination) {
  const heightVector = calculateHeightVector(projection)
  const scale = Math.cos(inclination * DEG_TO_RAD)

  return { heightVector, visualTranslation: (z) => z * scale }
}

export function normalizeRotation(rotation) {
  if (!Number.isFinite(rotation)) {
    throw new RangeError('Rotation must be a finite number')
  }
  return ((rotation % 360) + 360) % 360
}

export function getProjectionKey(projection) {
  return Array.from(projection.elements).join(',')
}

function clampInclination(inclination) {
  if (!Number.isFinite(inclination)) {
    throw new RangeError('Inclination must be a finite number')
  }

  return Math.max(MIN_INCLINATION, Math.min(MAX_INCLINATION, inclination))
}
