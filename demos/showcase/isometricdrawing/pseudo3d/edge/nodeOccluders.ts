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
import { type IGraph, type INode, type Matrix, Point } from '@yfiles/yfiles'
import { getNodeElevationForGraph, getNodeHeight } from '../core/nodeElevation'
import { getShapeOutlinePolyline, getVisibleShapeSidePolylines } from '../geometry/shape/ShapeGeometryPerimeter'
import {
  createPolygonEdgesAndBounds,
  getProjectedBounds,
  type PolygonEdge,
  type ProjectedBounds,
  projectPoint,
  solveParallelogramVCoordinates
} from '../geometry/projected/primitives'
import type { CachedNodeProjection, Occluder, ProjectedOccluderTemplate, ProjectedOcclusionScene } from './types'
import { GEOMETRY_EPSILON } from '../geometry/constants'

const NEARBY_NODE_PADDING = 96

type ProjectedOccluderTemplateLookup = { template: ProjectedOccluderTemplate; created: boolean }

export function getCachedProjectedNodeData(
  node: INode,
  graph: IGraph,
  projection: Matrix,
  heightVector: Point,
  visualTranslation: (z: number) => number,
  sceneCache: ProjectedOcclusionScene
): CachedNodeProjection {
  const { x, y, width, height } = node.layout
  const elevation = getNodeElevationForGraph(graph, node)
  const nodeHeight = getNodeHeight(node)
  const cached = sceneCache.nodeCache.get(node)
  if (
    cached &&
    cached.x === x &&
    cached.y === y &&
    cached.width === width &&
    cached.height === height &&
    cached.elevation === elevation &&
    cached.nodeHeight === nodeHeight
  ) {
    return cached
  }

  const { template, created } = getProjectedOccluderTemplate(
    node,
    graph,
    projection,
    heightVector,
    visualTranslation,
    sceneCache
  )
  const translation = getProjectedNodeBaseTranslation(
    node,
    elevation,
    heightVector,
    visualTranslation
  )
  const translationDelta = new Point(
    translation.x - template.baseTranslation.x,
    translation.y - template.baseTranslation.y
  )
  const elevationDelta = elevation - template.elevation
  const projectedBounds = created
    ? template.projectedBounds
    : translateBounds(template.projectedBounds, translationDelta)
  const occluders = created
    ? template.occluders
    : template.occluders.map((occluder) =>
        materializeOccluder(occluder, translationDelta, elevationDelta)
      )
  const value = {
    node,
    x,
    y,
    width,
    height,
    elevation,
    nodeHeight,
    projectedBounds,
    occluders,
    queryBounds: {
      minX: projectedBounds.minX - NEARBY_NODE_PADDING,
      minY: projectedBounds.minY - NEARBY_NODE_PADDING,
      maxX: projectedBounds.maxX + NEARBY_NODE_PADDING,
      maxY: projectedBounds.maxY + NEARBY_NODE_PADDING
    }
  }
  sceneCache.nodeCache.set(node, value)
  return value
}

function getProjectedOccluderTemplate(
  node: INode,
  graph: IGraph,
  projection: Matrix,
  heightVector: Point,
  visualTranslation: (z: number) => number,
  sceneCache: ProjectedOcclusionScene
): ProjectedOccluderTemplateLookup {
  const styleTemplates = sceneCache.occluderTemplates

  let sizeTemplates = styleTemplates.get(node.style)
  if (!sizeTemplates) {
    sizeTemplates = new Map()
    styleTemplates.set(node.style, sizeTemplates)
  }

  const key = `${node.layout.width},${node.layout.height},${getNodeHeight(node)},${sceneCache.projectionKey},${visualTranslation(1)}`
  const cached = sizeTemplates.get(key)
  if (cached) {
    return { template: cached, created: false }
  }

  const projectedBounds = getProjectedNodeBounds(node, graph, heightVector, visualTranslation)
  const occluders = buildProjectedNodeFaceOccluders(
    node,
    graph,
    projection,
    heightVector,
    visualTranslation
  )
  const baseTranslation = getProjectedNodeBaseTranslation(
    node,
    getNodeElevationForGraph(graph, node),
    heightVector,
    visualTranslation
  )
  const template = {
    projectedBounds,
    occluders,
    baseTranslation,
    elevation: getNodeElevationForGraph(graph, node)
  }
  sizeTemplates.set(key, template)
  return { template, created: true }
}

function getProjectedNodeBaseTranslation(
  node: INode,
  elevation: number,
  heightVector: Point,
  visualTranslation: (z: number) => number
): Point {
  return projectPoint(
    { x: node.layout.x, y: node.layout.y, z: elevation },
    heightVector,
    visualTranslation
  )
}

function materializeOccluder(
  template: Occluder,
  translation: Point,
  elevationDelta: number
): Occluder {
  return {
    edges: template.edges.map((edge) => translatePolygonEdge(edge, translation)),
    bounds: translateBounds(template.bounds, translation),
    faceZAtCoordinates: (x, y) =>
      template.faceZAtCoordinates(x - translation.x, y - translation.y) + elevationDelta
  }
}

function translateBounds(bounds: ProjectedBounds, translation: Point): ProjectedBounds {
  return {
    minX: bounds.minX + translation.x,
    minY: bounds.minY + translation.y,
    maxX: bounds.maxX + translation.x,
    maxY: bounds.maxY + translation.y
  }
}

function translatePolygonEdge(edge: PolygonEdge, translation: Point): PolygonEdge {
  return {
    ...edge,
    startX: edge.startX + translation.x,
    startY: edge.startY + translation.y,
    minX: edge.minX + translation.x,
    minY: edge.minY + translation.y,
    maxX: edge.maxX + translation.x,
    maxY: edge.maxY + translation.y
  }
}

export function getProjectedNodeBounds(
  node: INode,
  graph: IGraph,
  heightVector: Point,
  visualTranslation: (z: number) => number
): ProjectedBounds {
  const elevation = getNodeElevationForGraph(graph, node)
  const topZ = elevation + getNodeHeight(node)
  const topOutline = getShapeOutlinePolyline(node, node.style)
  const points =
    topOutline.length >= 3
      ? [
          ...projectPointsAtZ(topOutline, elevation, heightVector, visualTranslation),
          ...projectPointsAtZ(topOutline, topZ, heightVector, visualTranslation)
        ]
      : [
          projectPoint(
            { x: node.layout.x, y: node.layout.y, z: elevation },
            heightVector,
            visualTranslation
          ),
          projectPoint(
            {
              x: node.layout.x + node.layout.width,
              y: node.layout.y + node.layout.height,
              z: topZ
            },
            heightVector,
            visualTranslation
          )
        ]

  return getProjectedBounds(points)
}

function projectPointsAtZ(
  points: readonly Point[],
  z: number,
  heightVector: Point,
  visualTranslation: (z: number) => number
): Point[] {
  return points.map((point) =>
    projectPoint({ x: point.x, y: point.y, z }, heightVector, visualTranslation)
  )
}

export function buildProjectedNodeFaceOccluders(
  node: INode,
  graph: IGraph,
  projection: Matrix,
  heightVector: Point,
  visualTranslation: (z: number) => number
): Occluder[] {
  const height = getNodeHeight(node)
  if (height <= 0) {
    return []
  }

  const elevation = getNodeElevationForGraph(graph, node)
  const topZ = elevation + height
  const bottomZ = elevation
  const occluders: Occluder[] = []

  const topOutline = getShapeOutlinePolyline(node, node.style)
  if (topOutline.length >= 3) {
    const topPolygon = projectPointsAtZ(topOutline, topZ, heightVector, visualTranslation)
    occluders.push(createOccluder(topPolygon, () => topZ))
  }

  for (const sidePolyline of getVisibleShapeSidePolylines(node, node.style, projection)) {
    for (let index = 1; index < sidePolyline.length; index++) {
      const occluder = createProjectedSideFaceOccluder(
        sidePolyline[index - 1],
        sidePolyline[index],
        bottomZ,
        topZ,
        heightVector,
        visualTranslation
      )
      if (occluder) {
        occluders.push(occluder)
      }
    }
  }

  return occluders
}

function createProjectedSideFaceOccluder(
  start: Point,
  end: Point,
  bottomZ: number,
  topZ: number,
  heightVector: Point,
  visualTranslation: (z: number) => number
): Occluder | null {
  if (start.distanceTo(end) < GEOMETRY_EPSILON) {
    return null
  }

  const bottomStart = projectPoint(
    { x: start.x, y: start.y, z: bottomZ },
    heightVector,
    visualTranslation
  )
  const bottomEnd = projectPoint(
    { x: end.x, y: end.y, z: bottomZ },
    heightVector,
    visualTranslation
  )
  const topEnd = projectPoint({ x: end.x, y: end.y, z: topZ }, heightVector, visualTranslation)
  const topStart = projectPoint(
    { x: start.x, y: start.y, z: topZ },
    heightVector,
    visualTranslation
  )
  const zRange = topZ - bottomZ
  const faceZAtCoordinates = (x: number, y: number): number =>
    bottomZ +
    solveParallelogramVCoordinates(bottomStart, bottomEnd, topStart, new Point(x, y)) * zRange

  return createOccluder([bottomStart, bottomEnd, topEnd, topStart], faceZAtCoordinates)
}

function createOccluder(
  polygon: readonly Point[],
  faceZAtCoordinates: (x: number, y: number) => number
): Occluder {
  const polygonGeometry = createPolygonEdgesAndBounds(polygon)
  return { edges: polygonGeometry.edges, bounds: polygonGeometry.bounds, faceZAtCoordinates }
}
