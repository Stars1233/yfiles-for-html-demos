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
import { PathType, Point } from '@yfiles/yfiles'
import {
  createDenseSegmentSamples,
  hasSameRectLikeLayout,
  isSamePoint,
  reverseSegment,
  translateSegment
} from '../segmentGeometry'

// The outline produced by a node style is translation invariant for a fixed
// style and size. Keep that intrinsic geometry separate from the per-node
// translated view consumed by the rendering code.
const intrinsicOutlineCache = new WeakMap()
const nodeOutlineCache = new WeakMap()

export function getCachedOutlineGeometry(node, wrappedNodeStyle) {
  const geometryStyle = getGeometryStyle(wrappedNodeStyle)
  const cached = nodeOutlineCache.get(node)
  if (
    cached &&
    cached.wrappedNodeStyle === geometryStyle &&
    hasSameRectLikeLayout(cached.layout, node.layout)
  ) {
    return cached
  }

  let geometryBySize = intrinsicOutlineCache.get(geometryStyle)
  if (!geometryBySize) {
    geometryBySize = new Map()
    intrinsicOutlineCache.set(geometryStyle, geometryBySize)
  }

  const key = `${node.layout.width},${node.layout.height}`
  let intrinsicGeometry = geometryBySize.get(key)
  if (!intrinsicGeometry) {
    const segments = getOutlineSegments(node, geometryStyle)
    const translation = new Point(-node.layout.x, -node.layout.y)
    const normalizedSegments = translateSegments(segments, translation)
    intrinsicGeometry = {
      segments: normalizedSegments,
      anchors: getAnchorParts(normalizedSegments),
      denseOutlinePolyline: buildDenseOutlinePolyline(normalizedSegments)
    }
    geometryBySize.set(key, intrinsicGeometry)
  }

  const translation = new Point(node.layout.x, node.layout.y)
  const geometry = {
    layout: {
      x: node.layout.x,
      y: node.layout.y,
      width: node.layout.width,
      height: node.layout.height
    },
    wrappedNodeStyle: geometryStyle,
    segments: translateSegments(intrinsicGeometry.segments, translation),
    anchors: intrinsicGeometry.anchors,
    denseOutlinePolyline: intrinsicGeometry.denseOutlinePolyline.map((point) =>
      point.add(translation)
    )
  }
  nodeOutlineCache.set(node, geometry)
  return geometry
}

export function getShapeOutlinePolyline(node, wrappedNodeStyle) {
  return getCachedOutlineGeometry(node, wrappedNodeStyle).denseOutlinePolyline
}

function getGeometryStyle(style) {
  if ('getWrappedNodeStyle' in style && typeof style.getWrappedNodeStyle === 'function') {
    return style.getWrappedNodeStyle()
  }
  return style
}

function buildDenseOutlinePolyline(segments) {
  return segments.flatMap((_, index) => {
    const samples = segments[index].denseSamples.map((sample) => sample.point)
    return index === segments.length - 1 ? samples : samples.slice(0, -1)
  })
}

function translateSegments(segments, translation) {
  return segments.map(({ segment, denseSamples }) => ({
    segment: translateSegment(segment, translation),
    denseSamples: denseSamples.map((sample) => ({
      ...sample,
      point: sample.point.add(translation)
    }))
  }))
}

function getOutlineSegments(node, wrappedNodeStyle) {
  const outline = wrappedNodeStyle.renderer.getShapeGeometry(node, wrappedNodeStyle).getOutline()
  if (!outline) {
    return getRectangleSegments(node)
  }

  const cursor = outline.createCursor()
  const coordinates = []
  const segments = []
  let contourStart = null
  let currentPoint = null

  while (cursor.moveNext()) {
    const pathType = cursor.getCurrent(coordinates)
    switch (pathType) {
      case PathType.MOVE_TO:
        currentPoint = new Point(coordinates[0], coordinates[1])
        contourStart = currentPoint
        break
      case PathType.LINE_TO: {
        if (!currentPoint) break
        const end = new Point(coordinates[0], coordinates[1])
        pushSegment(segments, {
          kind: 'line',
          start: currentPoint,
          end,
          connectorAnchors: [currentPoint, end]
        })
        currentPoint = end
        break
      }
      case PathType.QUAD_TO: {
        if (!currentPoint) break
        const control = new Point(coordinates[0], coordinates[1])
        const end = new Point(coordinates[2], coordinates[3])
        pushSegment(segments, {
          kind: 'quadratic',
          start: currentPoint,
          control,
          end,
          connectorAnchors: [currentPoint, end]
        })
        currentPoint = end
        break
      }
      case PathType.CUBIC_TO: {
        if (!currentPoint) break
        const control1 = new Point(coordinates[0], coordinates[1])
        const control2 = new Point(coordinates[2], coordinates[3])
        const end = new Point(coordinates[4], coordinates[5])
        pushSegment(segments, {
          kind: 'cubic',
          start: currentPoint,
          control1,
          control2,
          end,
          connectorAnchors: [currentPoint, end]
        })
        currentPoint = end
        break
      }
      case PathType.CLOSE:
        if (currentPoint && contourStart && !isSamePoint(currentPoint, contourStart)) {
          pushSegment(segments, {
            kind: 'line',
            start: currentPoint,
            end: contourStart,
            connectorAnchors: [currentPoint, contourStart]
          })
        }
        currentPoint = contourStart
        break
    }
  }

  return segments.length < 3 ? getRectangleSegments(node) : normalizeOutlineDirection(segments)
}

function pushSegment(segments, segment) {
  if (isSamePoint(segment.start, segment.end)) return
  segments.push(createOutlineSegmentData(segment))
}

function createOutlineSegmentData(segment) {
  return { segment, denseSamples: createDenseSegmentSamples(segment) }
}

function getRectangleSegments(node) {
  const { x, y, width, height } = node.layout
  const points = [
    new Point(x, y),
    new Point(x, y + height),
    new Point(x + width, y + height),
    new Point(x + width, y)
  ]
  const segments = []
  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length]
    pushSegment(segments, { kind: 'line', start, end, connectorAnchors: [start, end] })
  })
  return normalizeOutlineDirection(segments)
}

function getAnchorParts(segments) {
  return {
    topLeft: getExtremeSegmentIndex(segments, (point) => point.x + point.y, 'min'),
    bottomLeft: getExtremeSegmentIndex(segments, (point) => point.x - point.y, 'min'),
    bottomRight: getExtremeSegmentIndex(segments, (point) => point.x + point.y, 'max'),
    topRight: getExtremeSegmentIndex(segments, (point) => point.x - point.y, 'max')
  }
}

function getExtremeSegmentIndex(segments, score, direction) {
  let bestIndex = 0
  let bestScore = direction === 'min' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
  for (const [index, segment] of segments.entries()) {
    for (const sample of segment.denseSamples) {
      const currentScore = score(sample.point)
      if (
        (direction === 'min' && currentScore < bestScore) ||
        (direction === 'max' && currentScore > bestScore)
      ) {
        bestScore = currentScore
        bestIndex = index
      }
    }
  }
  return bestIndex
}

function normalizeOutlineDirection(segments) {
  if (getSignedArea(segments) < 0) return segments
  return [...segments].reverse().map(({ segment }) => {
    const reversedSegment = reverseSegment(segment)
    return createOutlineSegmentData(reversedSegment)
  })
}

function getSignedArea(segments) {
  const points = segments.flatMap(({ denseSamples }, index) =>
    (index === segments.length - 1 ? denseSamples : denseSamples.slice(0, -1)).map(
      (sample) => sample.point
    )
  )
  let area = 0
  for (let index = 0; index < points.length; index++) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    area += current.x * next.y - current.y * next.x
  }
  return area / 2
}
