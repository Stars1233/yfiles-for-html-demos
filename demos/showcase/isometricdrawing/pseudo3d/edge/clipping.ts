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
import { getTerrainSegmentLength, Z_EPSILON } from './terrain'
import { polygonContainsPointCoordinates, type PolygonEdge } from '../geometry/projected/primitives'
import type { Occluder, ProjectedEdgeSegment, ProjectedTerrainSegment } from './types'

const MIN_VISIBLE_SEGMENT_LENGTH = 1
const OCCLUSION_DEPTH_EPSILON = 0.1
const INTERSECTION_DEDUPE_EPSILON = 0.000001

export type ClipScratch = {
  visibleIntervals: number[]
  nextVisibleIntervals: number[]
  splitParameters: number[]
}

export function createClipScratch(): ClipScratch {
  return { visibleIntervals: [], nextVisibleIntervals: [], splitParameters: [] }
}

export function clipSegmentByOccluders(
  projectedTerrainSegment: ProjectedTerrainSegment,
  occluders: readonly Occluder[],
  strokeWidth: number,
  preserveStart: boolean,
  preserveEnd: boolean,
  scratch: ClipScratch
): ProjectedEdgeSegment[] {
  const { segment, projectedStart, projectedEnd } = projectedTerrainSegment
  const visibleIntervals = clipProjectedSegmentIntervalsFlat(
    projectedStart.x,
    projectedStart.y,
    projectedEnd.x,
    projectedEnd.y,
    (t) => segment.start.z + (segment.end.z - segment.start.z) * t,
    occluders,
    strokeWidth,
    preserveStart,
    preserveEnd,
    scratch
  )

  const visibleSegments: ProjectedEdgeSegment[] = []
  for (let index = 0; index < visibleIntervals.length; index += 2) {
    const startT = visibleIntervals[index]
    const endT = visibleIntervals[index + 1]
    if (getTerrainSegmentLength(segment) * (endT - startT) >= MIN_VISIBLE_SEGMENT_LENGTH) {
      visibleSegments.push({
        start: interpolateProjectedPoint(projectedStart, projectedEnd, startT),
        end: interpolateProjectedPoint(projectedStart, projectedEnd, endT),
        isCliff: segment.isCliff
      })
    }
  }
  return visibleSegments
}

function interpolateProjectedPoint(
  start: { x: number; y: number },
  end: { x: number; y: number },
  t: number
): Point {
  return new Point(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t)
}

function clipProjectedSegmentIntervalsFlat(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  getSegmentZAt: (t: number) => number,
  occluders: readonly Occluder[],
  strokeWidth: number,
  preserveStart: boolean,
  preserveEnd: boolean,
  scratch: ClipScratch
): number[] {
  let visibleIntervals = scratch.visibleIntervals
  let nextVisibleIntervals = scratch.nextVisibleIntervals
  visibleIntervals.length = 2
  visibleIntervals[0] = 0
  visibleIntervals[1] = 1
  const segmentDeltaX = endX - startX
  const segmentDeltaY = endY - startY

  for (const occluder of occluders) {
    nextVisibleIntervals.length = 0
    for (let index = 0; index < visibleIntervals.length; index += 2) {
      clipProjectedIntervalByOccluder(
        startX,
        startY,
        segmentDeltaX,
        segmentDeltaY,
        visibleIntervals[index],
        visibleIntervals[index + 1],
        getSegmentZAt,
        occluder,
        nextVisibleIntervals,
        scratch.splitParameters
      )
    }
    const previousVisibleIntervals = visibleIntervals
    visibleIntervals = nextVisibleIntervals
    nextVisibleIntervals = previousVisibleIntervals
    if (visibleIntervals.length === 0) break
  }

  return insetVisibleIntervalsForStroke(
    visibleIntervals,
    Math.hypot(segmentDeltaX, segmentDeltaY),
    strokeWidth,
    preserveStart,
    preserveEnd
  )
}

function insetVisibleIntervalsForStroke(
  intervals: readonly number[],
  projectedLength: number,
  strokeWidth: number,
  preserveStart: boolean,
  preserveEnd: boolean
): number[] {
  if (strokeWidth <= 0 || projectedLength <= Z_EPSILON || intervals.length === 0) {
    return [...intervals]
  }

  // Keep the stroke from bleeding into an occluder without creating a large
  // rounded-cap gap around every clipped interval.
  const inset = Math.min(0.25, strokeWidth / 4 / projectedLength)
  const result: number[] = []
  for (let index = 0; index < intervals.length; index += 2) {
    const start = intervals[index] + (intervals[index] > Z_EPSILON && !preserveStart ? inset : 0)
    const end =
      intervals[index + 1] - (intervals[index + 1] < 1 - Z_EPSILON && !preserveEnd ? inset : 0)
    if (end - start >= Z_EPSILON) result.push(start, end)
  }
  return result
}

function clipProjectedIntervalByOccluder(
  startX: number,
  startY: number,
  segmentDeltaX: number,
  segmentDeltaY: number,
  intervalStartT: number,
  intervalEndT: number,
  getSegmentZAt: (t: number) => number,
  occluder: Occluder,
  visibleIntervals: number[],
  splitParameters: number[]
): void {
  const intervalStartX = startX + segmentDeltaX * intervalStartT
  const intervalStartY = startY + segmentDeltaY * intervalStartT
  const intervalEndX = startX + segmentDeltaX * intervalEndT
  const intervalEndY = startY + segmentDeltaY * intervalEndT
  const minX = Math.min(intervalStartX, intervalEndX)
  const minY = Math.min(intervalStartY, intervalEndY)
  const maxX = Math.max(intervalStartX, intervalEndX)
  const maxY = Math.max(intervalStartY, intervalEndY)
  if (
    minX > occluder.bounds.maxX ||
    maxX < occluder.bounds.minX ||
    minY > occluder.bounds.maxY ||
    maxY < occluder.bounds.minY
  ) {
    visibleIntervals.push(intervalStartT, intervalEndT)
    return
  }

  getSegmentPolygonIntersections(
    intervalStartX,
    intervalStartY,
    intervalEndX,
    intervalEndY,
    occluder.edges,
    splitParameters
  )
  const intervalScale = intervalEndT - intervalStartT
  for (let index = 1; index < splitParameters.length; index++) {
    const localStartT = splitParameters[index - 1]
    const localEndT = splitParameters[index]
    if (localEndT - localStartT < Z_EPSILON) continue
    const midT = (localStartT + localEndT) / 2
    const midPointX = intervalStartX + (intervalEndX - intervalStartX) * midT
    const midPointY = intervalStartY + (intervalEndY - intervalStartY) * midT
    const globalMidT = intervalStartT + intervalScale * midT
    const isVisible =
      !polygonContainsPointCoordinates(occluder.edges, midPointX, midPointY) ||
      getSegmentZAt(globalMidT) >=
        occluder.faceZAtCoordinates(midPointX, midPointY) - OCCLUSION_DEPTH_EPSILON
    if (isVisible) {
      const keptStart = intervalStartT + intervalScale * localStartT
      const keptEnd = intervalStartT + intervalScale * localEndT
      if (keptEnd - keptStart >= Z_EPSILON) visibleIntervals.push(keptStart, keptEnd)
    }
  }
}

function getSegmentPolygonIntersections(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  edges: readonly PolygonEdge[],
  intersections: number[]
): number[] {
  intersections.length = 2
  intersections[0] = 0
  intersections[1] = 1
  const segmentX = endX - startX
  const segmentY = endY - startY
  const segmentMinX = Math.min(startX, endX)
  const segmentMinY = Math.min(startY, endY)
  const segmentMaxX = Math.max(startX, endX)
  const segmentMaxY = Math.max(startY, endY)

  for (const edge of edges) {
    if (
      segmentMaxX < edge.minX ||
      segmentMinX > edge.maxX ||
      segmentMaxY < edge.minY ||
      segmentMinY > edge.maxY
    )
      continue

    const offsetX = edge.startX - startX
    const offsetY = edge.startY - startY
    const denominator = cross2d(segmentX, segmentY, edge.deltaX, edge.deltaY)
    if (Math.abs(denominator) < Z_EPSILON) continue
    const segmentT = cross2d(offsetX, offsetY, edge.deltaX, edge.deltaY) / denominator
    const edgeT = cross2d(offsetX, offsetY, segmentX, segmentY) / denominator
    if (
      segmentT > Z_EPSILON &&
      segmentT < 1 - Z_EPSILON &&
      edgeT >= -Z_EPSILON &&
      edgeT <= 1 + Z_EPSILON
    )
      intersections.push(segmentT)
  }

  intersections.sort((a, b) => a - b)
  return dedupeSortedIntersectionsInPlace(intersections)
}

function dedupeSortedIntersectionsInPlace(values: number[]): number[] {
  let writeIndex = 1
  for (let readIndex = 1; readIndex < values.length; readIndex++) {
    const value = values[readIndex]
    if (Math.abs(value - values[writeIndex - 1]) > INTERSECTION_DEDUPE_EPSILON) {
      values[writeIndex++] = value
    }
  }
  values.length = writeIndex
  return values
}

function cross2d(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx
}
