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
import { GeneralPath, type IOrientedRectangle, Point } from '@yfiles/yfiles'
import type { Pseudo3DExtrusionSegment } from '../core/types'
import { GEOMETRY_EPSILON } from './constants'

export type SegmentSample = { point: Point; t: number }

/** Appends one curved extrusion face to a reusable yFiles path. */
export function appendExtrusionFacePath(
  path: GeneralPath,
  segment: Pseudo3DExtrusionSegment,
  topTranslation: Point,
  bottomTranslation: Point
): void {
  path.moveTo(segment.start.add(topTranslation))
  appendDirectedSegment(path, segment, topTranslation, false)
  path.lineTo(segment.end.add(bottomTranslation))
  appendDirectedSegment(path, segment, bottomTranslation, true)
  path.close()
}

/** Creates SVG path data using the same face construction as hit testing. */
export function createExtrusionFacePathData(
  segment: Pseudo3DExtrusionSegment,
  topTranslation: Point,
  bottomTranslation: Point
): string {
  const path = new GeneralPath()
  appendExtrusionFacePath(path, segment, topTranslation, bottomTranslation)
  return path.createSvgPathData()
}

function appendDirectedSegment(
  path: GeneralPath,
  segment: Pseudo3DExtrusionSegment,
  translation: Point,
  reverse: boolean
): void {
  if (segment.kind === 'line') {
    path.lineTo((reverse ? segment.start : segment.end).add(translation))
    return
  }

  if (segment.kind === 'quadratic') {
    path.quadTo(
      segment.control.add(translation),
      (reverse ? segment.start : segment.end).add(translation)
    )
    return
  }

  const firstControl = (reverse ? segment.control2 : segment.control1).add(translation)
  const secondControl = (reverse ? segment.control1 : segment.control2).add(translation)
  path.cubicTo(
    firstControl,
    secondControl,
    (reverse ? segment.start : segment.end).add(translation)
  )
}

/**
 * Evaluates a perimeter segment at parameter t in [0, 1].
 *
 * This module centralizes the curve math shared by node wall rendering,
 * outline extraction, and edge occluder generation so every pipeline reasons
 * about the same geometry.
 */
export function evaluateSegment(segment: Pseudo3DExtrusionSegment, t: number): Point {
  if (segment.kind === 'line') {
    return interpolatePoint(segment.start, segment.end, t)
  }

  if (segment.kind === 'quadratic') {
    const oneMinusT = 1 - t
    const startWeight = oneMinusT * oneMinusT
    const controlWeight = 2 * oneMinusT * t
    const endWeight = t * t
    return new Point(
      segment.start.x * startWeight + segment.control.x * controlWeight + segment.end.x * endWeight,
      segment.start.y * startWeight + segment.control.y * controlWeight + segment.end.y * endWeight
    )
  }

  const oneMinusT = 1 - t
  const startWeight = oneMinusT * oneMinusT * oneMinusT
  const control1Weight = 3 * oneMinusT * oneMinusT * t
  const control2Weight = 3 * oneMinusT * t * t
  const endWeight = t * t * t
  return new Point(
    segment.start.x * startWeight +
      segment.control1.x * control1Weight +
      segment.control2.x * control2Weight +
      segment.end.x * endWeight,
    segment.start.y * startWeight +
      segment.control1.y * control1Weight +
      segment.control2.y * control2Weight +
      segment.end.y * endWeight
  )
}

export function evaluateSegmentTangent(segment: Pseudo3DExtrusionSegment, t: number): Point {
  if (segment.kind === 'line') {
    return new Point(segment.end.x - segment.start.x, segment.end.y - segment.start.y)
  }

  if (segment.kind === 'quadratic') {
    const oneMinusT = 1 - t
    return new Point(
      2 *
        (oneMinusT * (segment.control.x - segment.start.x) +
          t * (segment.end.x - segment.control.x)),
      2 *
        (oneMinusT * (segment.control.y - segment.start.y) +
          t * (segment.end.y - segment.control.y))
    )
  }

  const oneMinusT = 1 - t
  const control1Weight = 3 * oneMinusT * oneMinusT
  const control2Weight = 6 * oneMinusT * t
  const endWeight = 3 * t * t
  return new Point(
    control1Weight * (segment.control1.x - segment.start.x) +
      control2Weight * (segment.control2.x - segment.control1.x) +
      endWeight * (segment.end.x - segment.control2.x),
    control1Weight * (segment.control1.y - segment.start.y) +
      control2Weight * (segment.control2.y - segment.control1.y) +
      endWeight * (segment.end.y - segment.control2.y)
  )
}

export function translateSegment(
  segment: Pseudo3DExtrusionSegment,
  translation: Point
): Pseudo3DExtrusionSegment {
  return mapSegment(segment, (point) => point.add(translation))
}

export function reverseSegment(segment: Pseudo3DExtrusionSegment): Pseudo3DExtrusionSegment {
  return createSubsegment(segment.kind, getSegmentControlPoints(segment).reverse())
}

export function splitSegment(
  segment: Pseudo3DExtrusionSegment,
  t: number
): { before: Pseudo3DExtrusionSegment; after: Pseudo3DExtrusionSegment } {
  if (segment.kind === 'line') {
    const splitPoint = interpolatePoint(segment.start, segment.end, t)
    return {
      before: createSubsegment(segment.kind, [segment.start, splitPoint]),
      after: createSubsegment(segment.kind, [splitPoint, segment.end])
    }
  }

  const levels = [getSegmentControlPoints(segment)]
  while (levels.at(-1)!.length > 1) {
    const previousLevel = levels.at(-1)!
    levels.push(
      previousLevel
        .slice(0, -1)
        .map((point, index) => interpolatePoint(point, previousLevel[index + 1], t))
    )
  }

  return {
    before: createSubsegment(
      segment.kind,
      levels.map((level) => level[0])
    ),
    after: createSubsegment(segment.kind, levels.map((level) => level[level.length - 1]).reverse())
  }
}

function mapSegment(
  segment: Pseudo3DExtrusionSegment,
  mapPoint: (point: Point) => Point
): Pseudo3DExtrusionSegment {
  return createSegment(
    segment.kind,
    getSegmentControlPoints(segment).map(mapPoint),
    segment.connectorAnchors?.map(mapPoint)
  )
}

function getSegmentControlPoints(segment: Pseudo3DExtrusionSegment): Point[] {
  if (segment.kind === 'line') return [segment.start, segment.end]
  if (segment.kind === 'quadratic') return [segment.start, segment.control, segment.end]
  return [segment.start, segment.control1, segment.control2, segment.end]
}

function createSegment(
  kind: Pseudo3DExtrusionSegment['kind'],
  points: readonly Point[],
  connectorAnchors?: Point[]
): Pseudo3DExtrusionSegment {
  const start = points[0]
  const end = points[points.length - 1]
  if (kind === 'line') return { kind, start, end, connectorAnchors }
  if (kind === 'quadratic') {
    return { kind, start, control: points[1], end, connectorAnchors }
  }
  return { kind, start, control1: points[1], control2: points[2], end, connectorAnchors }
}

function createSubsegment(
  kind: Pseudo3DExtrusionSegment['kind'],
  points: readonly Point[]
): Pseudo3DExtrusionSegment {
  return createSegment(kind, points, [points[0], points[points.length - 1]])
}

export function createDenseSegmentSamples(segment: Pseudo3DExtrusionSegment): SegmentSample[] {
  const sampleCount = segment.kind === 'line' ? 5 : segment.kind === 'quadratic' ? 9 : 13
  const samples = new Array<SegmentSample>(sampleCount)
  for (let index = 0; index < sampleCount; index++) {
    const t = index / (sampleCount - 1)
    samples[index] = { point: evaluateSegment(segment, t), t }
  }
  return samples
}

export function interpolatePoint(start: Point, end: Point, t: number): Point {
  return new Point(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t)
}

export function isSamePoint(a: Point | undefined, b: Point | undefined): boolean {
  return (
    !!a && !!b && Math.abs(a.x - b.x) < GEOMETRY_EPSILON && Math.abs(a.y - b.y) < GEOMETRY_EPSILON
  )
}

export function hasSameRectLikeLayout(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

export function hasSameOrientedLayout(a: IOrientedRectangle, b: IOrientedRectangle): boolean {
  return (
    a.anchorX === b.anchorX &&
    a.anchorY === b.anchorY &&
    a.upX === b.upX &&
    a.upY === b.upY &&
    a.width === b.width &&
    a.height === b.height
  )
}
