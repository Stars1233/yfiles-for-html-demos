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
import { GeneralPath, PathType, Point, Rect } from '@yfiles/yfiles'
import { getProjectedHeightTranslation } from '../core/Pseudo3DProjection'
import { getNodeElevation, getNodeHeight } from '../core/nodeElevation'

export function createRectanglePath(bounds) {
  const path = new GeneralPath()
  path.appendRectangle(bounds, false)
  return path
}

export function appendTranslatedPath(target, source, translation) {
  const cursor = source.createCursor()
  const coordinates = []

  while (cursor.moveNext()) {
    const pathType = cursor.getCurrent(coordinates)
    switch (pathType) {
      case PathType.MOVE_TO:
        target.moveTo(coordinates[0] + translation.x, coordinates[1] + translation.y)
        break
      case PathType.LINE_TO:
        target.lineTo(coordinates[0] + translation.x, coordinates[1] + translation.y)
        break
      case PathType.QUAD_TO:
        target.quadTo(
          coordinates[0] + translation.x,
          coordinates[1] + translation.y,
          coordinates[2] + translation.x,
          coordinates[3] + translation.y
        )
        break
      case PathType.CUBIC_TO:
        target.cubicTo(
          coordinates[0] + translation.x,
          coordinates[1] + translation.y,
          coordinates[2] + translation.x,
          coordinates[3] + translation.y,
          coordinates[4] + translation.x,
          coordinates[5] + translation.y
        )
        break
      case PathType.CLOSE:
        target.close()
        break
    }
  }
}

export function getProjectionMatrix(context, projectionState) {
  return hasProjection(context) ? context.projection : projectionState.createMatrix()
}

export function getProjectedTranslationVector(projection, length, inclination) {
  return getProjectedHeightTranslation(projection, length, inclination)
}

export function getProjectedNodeBounds(context, node, projectionState) {
  const projection = getProjectionMatrix(context, projectionState)
  const bottomTranslation = getProjectedTranslationVector(
    projection,
    getNodeElevation(context, node),
    projectionState.inclination
  )
  const topTranslation = bottomTranslation.add(
    getProjectedTranslationVector(projection, getNodeHeight(node), projectionState.inclination)
  )
  const { x, y, width, height } = node.layout
  const corners = [
    new Point(x, y),
    new Point(x + width, y),
    new Point(x + width, y + height),
    new Point(x, y + height)
  ]
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const corner of corners) {
    for (const translation of [bottomTranslation, topTranslation]) {
      const projected = corner.add(translation)
      minX = Math.min(minX, projected.x)
      minY = Math.min(minY, projected.y)
      maxX = Math.max(maxX, projected.x)
      maxY = Math.max(maxY, projected.y)
    }
  }

  return new Rect(minX, minY, maxX - minX, maxY - minY)
}

export function hasProjection(context) {
  return 'projection' in context
}

export function withProjection(context, projection) {
  if (hasProjection(context)) {
    return context
  }

  return Object.create(context, {
    projection: { value: projection, enumerable: false, configurable: true }
  })
}
