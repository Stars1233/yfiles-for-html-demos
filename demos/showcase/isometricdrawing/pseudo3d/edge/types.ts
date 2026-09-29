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
import type { GraphComponent, IEdge, INode, INodeStyle, Matrix, Point } from '@yfiles/yfiles'
import type { EdgeTerrainGeometry, TerrainSegment } from './terrain'
import type { PolygonEdge, ProjectedBounds } from '../geometry/projected/primitives'
import type { Pseudo3DProjectionState } from '../core/Pseudo3DProjection'

export type ProjectedEdgeSegment = { start: Point; end: Point; isCliff: boolean }
export type ProjectedEdgeArrow = { anchor: Point; direction: Point }
export type VisibleProjectedEdgeGeometry = {
  segments: ProjectedEdgeSegment[]
  sourceArrow: ProjectedEdgeArrow | null
  targetArrow: ProjectedEdgeArrow | null
}
export type ProjectedEdgeGeometryOptions = {
  edge: IEdge
  graphComponent: GraphComponent
  projectionState: Pseudo3DProjectionState
  refreshVersion: number
  projection: Matrix
  strokeWidth?: number
  terrainGeometry?: EdgeTerrainGeometry
}
export type ProjectedTerrainSegment = {
  segment: TerrainSegment
  projectedStart: Point
  projectedEnd: Point
  bounds: ProjectedBounds
}
export type Occluder = {
  edges: readonly PolygonEdge[]
  bounds: ProjectedBounds
  faceZAtCoordinates: (x: number, y: number) => number
}

export type ProjectedOccluderTemplate = {
  projectedBounds: ProjectedBounds
  occluders: Occluder[]
  baseTranslation: Point
  elevation: number
}

export type ProjectedOccluderTemplateCache = Map<INodeStyle, Map<string, ProjectedOccluderTemplate>>

export type CachedNodeProjection = {
  node: INode
  x: number
  y: number
  width: number
  height: number
  elevation: number
  nodeHeight: number
  projectedBounds: ProjectedBounds
  occluders: Occluder[]
  queryBounds: ProjectedBounds
}

export type ProjectedNodeSpatialIndex = {
  cellSize: number
  buckets: Map<string, CachedNodeProjection[]>
  oversized: CachedNodeProjection[]
}

export type ProjectedOcclusionScene = {
  projectionKey: string
  nodeCache: WeakMap<INode, CachedNodeProjection>
  occluderTemplates: ProjectedOccluderTemplateCache
  sortedNodes: CachedNodeProjection[] | null
  spatialIndex: ProjectedNodeSpatialIndex | null
}
