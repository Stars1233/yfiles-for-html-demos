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
import { Point } from '@yfiles/yfiles'
import { GEOMETRY_EPSILON } from '../constants'

export function getProjectedBounds(points) {
  if (points.length === 0) {
    return {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY
    }
  }

  let minX = points[0].x
  let minY = points[0].y
  let maxX = minX
  let maxY = minY
  for (let index = 1; index < points.length; index++) {
    const point = points[index]
    if (point.x < minX) minX = point.x
    if (point.y < minY) minY = point.y
    if (point.x > maxX) maxX = point.x
    if (point.y > maxY) maxY = point.y
  }

  return { minX, minY, maxX, maxY }
}

export function getProjectedSegmentBounds(start, end) {
  return {
    minX: Math.min(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxX: Math.max(start.x, end.x),
    maxY: Math.max(start.y, end.y)
  }
}

export function projectPoint(point, heightVector, visualTranslation) {
  const lift = heightVector.multiply(visualTranslation(point.z))
  return new Point(point.x + lift.x, point.y + lift.y)
}

export function boundsIntersect(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

export function polygonContainsPointCoordinates(edges, x, y) {
  if (edges.length < 3) {
    return false
  }

  let inside = false
  for (const edge of edges) {
    const endX = edge.startX + edge.deltaX
    const endY = edge.startY + edge.deltaY
    const intersects =
      edge.startY > y !== endY > y &&
      x <
        ((endX - edge.startX) * (y - edge.startY)) / (endY - edge.startY + Number.EPSILON) +
          edge.startX
    if (intersects) {
      inside = !inside
    }
  }
  return inside
}

export function createPolygonEdgesAndBounds(polygon) {
  const bounds = getProjectedBounds(polygon)
  const edges = new Array(polygon.length)
  for (let index = 0; index < polygon.length; index++) {
    const start = polygon[index]
    const end = polygon[(index + 1) % polygon.length]
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    edges[index] = {
      startX: start.x,
      startY: start.y,
      deltaX,
      deltaY,
      minX: Math.min(start.x, end.x) - Math.abs(deltaX) * GEOMETRY_EPSILON,
      minY: Math.min(start.y, end.y) - Math.abs(deltaY) * GEOMETRY_EPSILON,
      maxX: Math.max(start.x, end.x) + Math.abs(deltaX) * GEOMETRY_EPSILON,
      maxY: Math.max(start.y, end.y) + Math.abs(deltaY) * GEOMETRY_EPSILON
    }
  }

  return { edges, bounds }
}

export function solveParallelogramVCoordinates(origin, uEnd, vEnd, point) {
  const uX = uEnd.x - origin.x
  const uY = uEnd.y - origin.y
  const vX = vEnd.x - origin.x
  const vY = vEnd.y - origin.y
  const determinant = uX * vY - uY * vX
  if (Math.abs(determinant) < GEOMETRY_EPSILON) {
    return 0.5
  }

  const v = (uX * (point.y - origin.y) - uY * (point.x - origin.x)) / determinant
  return Math.max(0, Math.min(1, v))
}
