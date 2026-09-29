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
import { type IEdge } from '@yfiles/yfiles'
import { getProjectionHelpersForMatrix } from '../core/Pseudo3DProjection'
import { getCachedEdgeTerrainGeometry } from './terrain'
import { getProjectedOcclusionScene, queryProjectedOccludersForBound } from './scene'
import { createEndpointArrow } from './arrows'
import { clipSegmentByOccluders, createClipScratch } from './clipping'
import { projectTerrainSegment } from './segments'
import type {
  Occluder,
  ProjectedEdgeGeometryOptions,
  ProjectedEdgeSegment,
  VisibleProjectedEdgeGeometry
} from './types'

const visibleGeometryCache = new WeakMap<
  IEdge,
  {
    pointsKey: string
    projectionKey: string
    scene: ReturnType<typeof getProjectedOcclusionScene>
    strokeWidth: number
    refreshVersion: number
    geometry: VisibleProjectedEdgeGeometry
  }
>()

export type {
  ProjectedEdgeArrow,
  ProjectedEdgeGeometryOptions,
  ProjectedEdgeSegment,
  VisibleProjectedEdgeGeometry
} from './types'

export function getVisibleProjectedEdgeGeometry(
  options: ProjectedEdgeGeometryOptions
): VisibleProjectedEdgeGeometry {
  const {
    edge,
    graphComponent,
    projectionState,
    refreshVersion,
    projection,
    strokeWidth = 0,
    terrainGeometry = getCachedEdgeTerrainGeometry(options.edge, options.graphComponent.graph)
  } = options
  const { graph } = graphComponent

  const { heightVector, visualTranslation } = getProjectionHelpersForMatrix(
    projection,
    projectionState.inclination
  )
  const occlusionScene = getProjectedOcclusionScene(graph, projection)
  const projectionKey = occlusionScene.projectionKey
  const cached = visibleGeometryCache.get(edge)
  if (
    cached &&
    cached.pointsKey === terrainGeometry.pointsKey &&
    cached.projectionKey === projectionKey &&
    cached.scene === occlusionScene &&
    cached.strokeWidth === strokeWidth &&
    cached.refreshVersion === refreshVersion
  ) {
    return cached.geometry
  }

  const terrainPath = terrainGeometry.terrainPath
  const terrainSegments = terrainGeometry.terrainSegments
  const projectedTerrainSegments = terrainSegments.map((segment) =>
    projectTerrainSegment(segment, heightVector, visualTranslation)
  )
  const projectedSegments: ProjectedEdgeSegment[] = []
  const clipScratch = createClipScratch()
  const segmentOccluders: Occluder[] = []
  for (let segmentIndex = 0; segmentIndex < projectedTerrainSegments.length; segmentIndex++) {
    const projectedTerrainSegment = projectedTerrainSegments[segmentIndex]
    const segment = projectedTerrainSegment.segment
    queryProjectedOccludersForBound(
      graphComponent,
      projectedTerrainSegment.bounds,
      projection,
      heightVector,
      visualTranslation,
      occlusionScene,
      segmentOccluders
    )
    const visibleSegments = clipSegmentByOccluders(
      projectedTerrainSegment,
      segmentOccluders,
      strokeWidth,
      segment.isCliff || projectedTerrainSegments[segmentIndex - 1]?.segment.isCliff,
      segment.isCliff || projectedTerrainSegments[segmentIndex + 1]?.segment.isCliff,
      clipScratch
    )
    projectedSegments.push(...visibleSegments)
  }

  const geometry: VisibleProjectedEdgeGeometry = {
    segments: projectedSegments,
    sourceArrow: createEndpointArrow(
      terrainPath[0] ?? null,
      terrainSegments,
      projectedSegments,
      heightVector,
      visualTranslation,
      strokeWidth,
      'source'
    ),
    targetArrow: createEndpointArrow(
      terrainPath[terrainPath.length - 1] ?? null,
      terrainSegments,
      projectedSegments,
      heightVector,
      visualTranslation,
      strokeWidth,
      'target'
    )
  }
  visibleGeometryCache.set(edge, {
    pointsKey: terrainGeometry.pointsKey,
    projectionKey,
    scene: occlusionScene,
    strokeWidth,
    refreshVersion,
    geometry
  })
  return geometry
}
