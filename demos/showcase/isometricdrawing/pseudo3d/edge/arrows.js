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
import { findEndpointVisibleSegment, pointsNear } from './segments'
import { projectPoint } from '../geometry/projected/primitives'

const MIN_DIRECTION_LENGTH = 0.1
const ARROW_ENDPOINT_TOLERANCE = 2

function getArrowEndpointTolerance(strokeWidth) {
  // Occlusion clipping insets visible intervals to keep a thick stroke from
  // bleeding into an occluder. Allow that inset when deciding whether the
  // endpoint arrow still belongs to the visible endpoint segment.
  return Math.max(ARROW_ENDPOINT_TOLERANCE, strokeWidth / 2 + 1)
}

export function createEndpointArrow(
  endpointPoint,
  terrainSegments,
  visibleSegments,
  heightVector,
  visualTranslation,
  strokeWidth,
  endpoint
) {
  if (!endpointPoint) return null

  const projectedEndpoint = projectPoint(endpointPoint, heightVector, visualTranslation)
  const isSourceEndpoint = endpoint === 'source'
  const visibleTerrainSegment = isSourceEndpoint
    ? terrainSegments[0]
    : terrainSegments[terrainSegments.length - 1]
  const visibleSegment = findEndpointVisibleSegment(visibleSegments, endpoint)
  if (!visibleSegment || !visibleTerrainSegment || visibleTerrainSegment.isCliff) return null

  const endpointTolerance = getArrowEndpointTolerance(strokeWidth)

  const segmentEndpoint = isSourceEndpoint ? visibleSegment.start : visibleSegment.end
  const endpointSegmentStart = isSourceEndpoint
    ? visibleTerrainSegment.start
    : visibleTerrainSegment.end
  if (
    !pointsNear(segmentEndpoint, projectedEndpoint, endpointTolerance) ||
    !pointsNear(
      segmentEndpoint,
      projectPoint(endpointSegmentStart, heightVector, visualTranslation),
      endpointTolerance
    )
  ) {
    return null
  }

  const direction = new Point(
    visibleSegment.end.x - visibleSegment.start.x,
    visibleSegment.end.y - visibleSegment.start.y
  )
  const length = Math.hypot(direction.x, direction.y)
  if (length < MIN_DIRECTION_LENGTH) return null
  return {
    anchor: projectedEndpoint,
    direction: new Point(direction.x / length, direction.y / length)
  }
}
