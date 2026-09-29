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
import { GeneralPath, IArrow, Point } from '@yfiles/yfiles'
import type { ProjectedEdgeArrow, ProjectedEdgeSegment } from '../edge/types'

const MIN_RENDERED_SEGMENT_LENGTH = 0.5

export type PreviewEdgeGeometry = {
  pointsKey: string
  segments: ProjectedEdgeSegment[]
  sourceArrow: ProjectedEdgeArrow | null
  targetArrow: ProjectedEdgeArrow | null
}

/**
 * Builds geometry for a preview edge whose port locations are already in the
 * projected world coordinate system used by the GraphComponent viewport.
 */
export function buildPreviewEdgeGeometry(points: readonly Point[]): PreviewEdgeGeometry {
  const segments: ProjectedEdgeSegment[] = []
  for (let index = 1; index < points.length; index++) {
    segments.push({ start: points[index - 1], end: points[index], isCliff: false })
  }

  return {
    pointsKey: points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join('|'),
    segments,
    sourceArrow: createPreviewEndpointArrow(points, true),
    targetArrow: createPreviewEndpointArrow(points, false)
  }
}

export function buildProjectedEdgePath(
  segments: readonly ProjectedEdgeSegment[]
): GeneralPath | null {
  const path = new GeneralPath()

  let previousPoint: Point | null = null

  for (const segment of segments) {
    if (!previousPoint || !pointsRoughlyEqual(previousPoint, segment.start)) {
      path.moveTo(segment.start)
    }

    // Add every endpoint immediately. This preserves routed bends while still
    // keeping a visible surface/cliff/surface transition in one subpath.
    path.lineTo(segment.end)
    previousPoint = segment.end
  }

  return path.isVisible ? path : null
}

export function trimArrowOverlap(
  segments: readonly ProjectedEdgeSegment[],
  sourceArrow: ProjectedEdgeArrow | null,
  targetArrow: ProjectedEdgeArrow | null,
  sourceArrowStyle: IArrow,
  targetArrowStyle: IArrow,
  strokeWidth: number
): readonly ProjectedEdgeSegment[] {
  const sourceTrim = getArrowTrimAmount(sourceArrow, sourceArrowStyle, strokeWidth)
  const targetTrim = getArrowTrimAmount(targetArrow, targetArrowStyle, strokeWidth)
  if (sourceTrim <= 0 && targetTrim <= 0) {
    return segments
  }

  const trimmedSegments: ProjectedEdgeSegment[] = [...segments]
  const clonedIndices = new Set<number>()

  trimEndpointSegment(trimmedSegments, clonedIndices, sourceArrow, sourceTrim, true)
  trimEndpointSegment(trimmedSegments, clonedIndices, targetArrow, targetTrim, false)

  return trimmedSegments.filter(
    (segment) =>
      segment.start.distanceTo(segment.end) >= MIN_RENDERED_SEGMENT_LENGTH || segment.isCliff
  )
}

function createPreviewEndpointArrow(
  points: readonly Point[],
  source: boolean
): ProjectedEdgeArrow | null {
  if (points.length < 2) {
    return null
  }

  const endpoint = source ? points[0] : points[points.length - 1]
  const adjacent = source ? points[1] : points[points.length - 2]
  const direction = source
    ? new Point(adjacent.x - endpoint.x, adjacent.y - endpoint.y)
    : new Point(endpoint.x - adjacent.x, endpoint.y - adjacent.y)
  const length = Math.hypot(direction.x, direction.y)
  if (length < 0.1) {
    return null
  }

  return { anchor: endpoint, direction: new Point(direction.x / length, direction.y / length) }
}

function pointsRoughlyEqual(a: Point, b: Point): boolean {
  return a.distanceTo(b) <= 0.01
}

function isPointNearArrow(
  location: Point,
  arrow: ProjectedEdgeArrow | null,
  arrowStyle: IArrow,
  hitTestRadius: number,
  strokeWidth: number
): boolean {
  if (!arrow || arrowStyle === IArrow.NONE) {
    return false
  }

  const arrowExtent = Math.max(0, arrowStyle.length + arrowStyle.cropLength)
  const shaftStart = new Point(
    arrow.anchor.x - arrow.direction.x * arrowExtent,
    arrow.anchor.y - arrow.direction.y * arrowExtent
  )
  const arrowBounds = new GeneralPath()
  arrowBounds.moveTo(arrow.anchor)
  arrowBounds.lineTo(shaftStart)
  return arrowBounds.pathContains(
    location,
    hitTestRadius + Math.max(arrowStyle.length, strokeWidth) / 2
  )
}

export function isPointNearProjectedArrow(
  location: Point,
  arrow: ProjectedEdgeArrow | null,
  arrowStyle: IArrow,
  hitTestRadius: number,
  strokeWidth: number
): boolean {
  return isPointNearArrow(location, arrow, arrowStyle, hitTestRadius, strokeWidth)
}

function trimEndpointSegment(
  segments: ProjectedEdgeSegment[],
  clonedIndices: Set<number>,
  arrow: ProjectedEdgeArrow | null,
  remainingTrim: number,
  atSource: boolean
): void {
  if (!arrow || remainingTrim <= 0) {
    return
  }

  const indices = getEndpointRunSegmentIndices(segments, atSource)
  for (const segmentIndex of indices) {
    const segment = getMutableSegment(segments, segmentIndex, clonedIndices)
    const segmentVector = new Point(
      segment.end.x - segment.start.x,
      segment.end.y - segment.start.y
    )
    const segmentLength = Math.hypot(segmentVector.x, segmentVector.y)
    if (segmentLength <= MIN_RENDERED_SEGMENT_LENGTH) {
      consumeSegment(segment, atSource)
      remainingTrim -= segmentLength
      continue
    }

    // Do not leave a minimum-length tail behind when the arrow nearly
    // consumes the whole segment. Those tails become visible as tiny caps
    // when several clipped segments are trimmed in sequence.
    if (remainingTrim >= segmentLength - MIN_RENDERED_SEGMENT_LENGTH) {
      consumeSegment(segment, atSource)
      remainingTrim -= segmentLength
      continue
    }

    const trimHere = remainingTrim
    const unit = new Point(segmentVector.x / segmentLength, segmentVector.y / segmentLength)
    if (atSource) {
      segment.start = new Point(
        segment.start.x + unit.x * trimHere,
        segment.start.y + unit.y * trimHere
      )
    } else {
      segment.end = new Point(segment.end.x - unit.x * trimHere, segment.end.y - unit.y * trimHere)
    }

    break
  }
}

function consumeSegment(segment: ProjectedEdgeSegment, atSource: boolean): void {
  if (atSource) {
    segment.start = segment.end
  } else {
    segment.end = segment.start
  }
}

function getArrowTrimAmount(
  arrow: ProjectedEdgeArrow | null,
  arrowStyle: IArrow,
  strokeWidth: number
): number {
  if (!arrow || arrowStyle === IArrow.NONE) {
    return 0
  }

  // Keep the round-capped edge stroke mostly out from under the arrowhead while
  // avoiding a visible gap between the shaft and the arrow.
  return Math.max(0, arrowStyle.length + arrowStyle.cropLength + strokeWidth / 4)
}

function getMutableSegment(
  segments: ProjectedEdgeSegment[],
  index: number,
  clonedIndices: Set<number>
): ProjectedEdgeSegment {
  if (!clonedIndices.has(index)) {
    segments[index] = { ...segments[index] }
    clonedIndices.add(index)
  }

  return segments[index]
}

function getEndpointRunSegmentIndices(
  segments: readonly ProjectedEdgeSegment[],
  atSource: boolean
): number[] {
  const indices: number[] = []
  const startIndex = atSource
    ? segments.findIndex((segment) => !segment.isCliff)
    : findLastNonCliffSegmentIndex(segments)
  if (startIndex < 0) {
    return indices
  }

  indices.push(startIndex)
  if (atSource) {
    for (let index = startIndex + 1; index < segments.length; index++) {
      const previous = segments[index - 1]
      const current = segments[index]
      if (current.isCliff || !pointsRoughlyEqual(previous.end, current.start)) {
        break
      }
      indices.push(index)
    }
  } else {
    for (let index = startIndex - 1; index >= 0; index--) {
      const next = segments[index + 1]
      const current = segments[index]
      if (current.isCliff || !pointsRoughlyEqual(current.end, next.start)) {
        break
      }
      indices.push(index)
    }
  }

  return indices
}

function findLastNonCliffSegmentIndex(segments: readonly ProjectedEdgeSegment[]): number {
  for (let index = segments.length - 1; index >= 0; index--) {
    if (!segments[index].isCliff) {
      return index
    }
  }
  return -1
}
