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
import { type Matrix, type Point } from '@yfiles/yfiles'
import { calculateHeightVector } from '../../core/Pseudo3DProjection'
import { createDenseSegmentSamples, evaluateSegmentTangent, isSamePoint, splitSegment } from '../segmentGeometry'
import { GEOMETRY_EPSILON } from '../constants'
import type { Pseudo3DExtrusionSegment } from '../../core/types'
import type { OutlineSegmentData, VisibleFacePiece } from './types'

const MIN_VISIBLE_INTERVAL = 0.0005
const VISIBILITY_ROOT_EPSILON = 0.0001

export function isVisibleSegment(segment: OutlineSegmentData, extrusionDirection: Point): boolean {
  return segment.denseSamples.some((sample) =>
    isVisibleAt(segment.segment, extrusionDirection, sample.t)
  )
}

export function createVisibleFacePieces(
  segments: readonly { index: number; segment: OutlineSegmentData }[],
  projection: Matrix
): VisibleFacePiece[] {
  const extrusionDirection = calculateHeightVector(projection)
  const visiblePieces = segments.flatMap(({ index, segment }) =>
    extractVisibleSubsegments(segment, extrusionDirection).map((piece) =>
      createVisibleFacePiece(piece, index, projection)
    )
  )

  visiblePieces.sort((a, b) => {
    const averageDelta = a.depthAvg - b.depthAvg
    if (Math.abs(averageDelta) > GEOMETRY_EPSILON) return averageDelta
    const maxDelta = a.depthMax - b.depthMax
    if (Math.abs(maxDelta) > GEOMETRY_EPSILON) return maxDelta
    const minDelta = a.depthMin - b.depthMin
    if (Math.abs(minDelta) > GEOMETRY_EPSILON) return minDelta
    return a.sourceIndex - b.sourceIndex
  })
  return visiblePieces
}

export function getVisibleShapeSidePolylines(
  segments: readonly OutlineSegmentData[],
  projection: Matrix
): Point[][] {
  const extrusionDirection = calculateHeightVector(projection)
  return segments.flatMap((segment) =>
    extractVisibleSubsegments(segment, extrusionDirection).map((piece) =>
      createDenseSegmentSamples(piece).map((sample) => sample.point)
    )
  )
}

function extractVisibleSubsegments(
  segment: OutlineSegmentData,
  extrusionDirection: Point
): Pseudo3DExtrusionSegment[] {
  return getVisibleIntervals(segment, extrusionDirection)
    .map(([startT, endT]) => getSegmentInterval(segment.segment, startT, endT))
    .filter((piece) => !isSamePoint(piece.start, piece.end))
}

function getVisibleIntervals(
  segment: OutlineSegmentData,
  extrusionDirection: Point
): Array<[number, number]> {
  const boundaries = new Set<number>([0, 1])
  for (let index = 0; index < segment.denseSamples.length - 1; index++) {
    const a = segment.denseSamples[index]
    const b = segment.denseSamples[index + 1]
    const aVisible = isVisibleAt(segment.segment, extrusionDirection, a.t)
    const bVisible = isVisibleAt(segment.segment, extrusionDirection, b.t)
    if (aVisible !== bVisible) {
      boundaries.add(solveVisibilityBoundary(segment.segment, extrusionDirection, a.t, b.t))
    }
  }

  const sortedBoundaries = [...boundaries].sort((a, b) => a - b)
  const visibleIntervals: Array<[number, number]> = []
  for (let index = 0; index < sortedBoundaries.length - 1; index++) {
    const startT = sortedBoundaries[index]
    const endT = sortedBoundaries[index + 1]
    if (endT - startT < MIN_VISIBLE_INTERVAL) continue
    if (isVisibleAt(segment.segment, extrusionDirection, (startT + endT) / 2)) {
      visibleIntervals.push([startT, endT])
    }
  }
  return visibleIntervals
}

function createVisibleFacePiece(
  segment: Pseudo3DExtrusionSegment,
  sourceIndex: number,
  projection: Matrix
): VisibleFacePiece {
  const samples = createDenseSegmentSamples(segment)
  let depthMin = Number.POSITIVE_INFINITY
  let depthMax = Number.NEGATIVE_INFINITY
  let depthSum = 0
  for (const sample of samples) {
    const projected = projection.transform(sample.point)
    depthMin = Math.min(depthMin, projected.y)
    depthMax = Math.max(depthMax, projected.y)
    depthSum += projected.y
  }
  return {
    segment,
    sourceIndex,
    depthMin,
    depthMax,
    depthAvg: samples.length > 0 ? depthSum / samples.length : 0
  }
}

function getSegmentInterval(
  segment: Pseudo3DExtrusionSegment,
  startT: number,
  endT: number
): Pseudo3DExtrusionSegment {
  if (startT <= VISIBILITY_ROOT_EPSILON && endT >= 1 - VISIBILITY_ROOT_EPSILON) return segment
  if (startT <= VISIBILITY_ROOT_EPSILON) return splitSegment(segment, endT).before
  if (endT >= 1 - VISIBILITY_ROOT_EPSILON) return splitSegment(segment, startT).after
  const { after } = splitSegment(segment, startT)
  return splitSegment(after, (endT - startT) / (1 - startT)).before
}

function solveVisibilityBoundary(
  segment: Pseudo3DExtrusionSegment,
  extrusionDirection: Point,
  minT: number,
  maxT: number
): number {
  let startT = minT
  let endT = maxT
  let startValue = getVisibilityValue(segment, extrusionDirection, startT)
  for (let iteration = 0; iteration < 16; iteration++) {
    const midT = (startT + endT) / 2
    const midValue = getVisibilityValue(segment, extrusionDirection, midT)
    if (Math.abs(midValue) < VISIBILITY_ROOT_EPSILON) return midT
    if (Math.sign(midValue) === Math.sign(startValue)) {
      startT = midT
      startValue = midValue
    } else {
      endT = midT
    }
  }
  return (startT + endT) / 2
}

function getVisibilityValue(
  segment: Pseudo3DExtrusionSegment,
  extrusionDirection: Point,
  t: number
): number {
  const tangent = evaluateSegmentTangent(segment, t)
  // scalar of 90° rot of tangent with extrusion
  return -tangent.y * extrusionDirection.x + tangent.x * extrusionDirection.y
}

function isVisibleAt(
  segment: Pseudo3DExtrusionSegment,
  extrusionDirection: Point,
  t: number
): boolean {
  return getVisibilityValue(segment, extrusionDirection, t) <= GEOMETRY_EPSILON
}
