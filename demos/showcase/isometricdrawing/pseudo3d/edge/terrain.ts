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
import { IEdge, type IGraph, type INode, Point } from '@yfiles/yfiles'
import { getNodeElevationForGraph, getNodeHeight } from '../core/nodeElevation'
import { GEOMETRY_EPSILON } from '../geometry/constants'
import type { Point3D } from '../geometry/projected/primitives'

export type TerrainSegment = { start: Point3D; end: Point3D; isCliff: boolean }

export type EdgeTerrainGeometry = {
  pointsKey: string
  terrainPath: Point3D[]
  terrainSegments: TerrainSegment[]
}

type CachedTerrainGeometry = EdgeTerrainGeometry & {
  graphRevision: number
  graph: IGraph
  sourceNode: INode | null
  targetNode: INode | null
}

type TerrainEndpointOwners = readonly [INode | null, INode | null]

const SURFACE_Z_NUDGE = 0.5
export const Z_EPSILON = GEOMETRY_EPSILON

const cachedTerrainGeometry = new WeakMap<IEdge, CachedTerrainGeometry>()
const graphTerrainRevisions = new WeakMap<IGraph, number>()
const trackedGraphs = new WeakSet<IGraph>()

/** Returns the edge's source port, bends, and target port as layout-space waypoints. */
export function getEdgeWaypoints(edge: IEdge): Point[] {
  return [...IEdge.getPathPoints(edge)].map((point) => new Point(point.x, point.y))
}

function buildTerrainPathForEdge(
  waypoints: readonly Point[],
  graph: IGraph,
  groupNodes: readonly INode[],
  endpointOwners: TerrainEndpointOwners
): Point3D[] {
  if (waypoints.length === 0) {
    return []
  }

  const result: Point3D[] = []
  let previousSurfaceZ = getTerrainZAt(
    waypoints[0].x,
    waypoints[0].y,
    graph,
    groupNodes,
    endpointOwners
  )
  result.push({ x: waypoints[0].x, y: waypoints[0].y, z: previousSurfaceZ + SURFACE_Z_NUDGE })

  for (let i = 1; i < waypoints.length; i++) {
    const previous = waypoints[i - 1]
    const current = waypoints[i]
    const currentSurfaceZ = getTerrainZAt(current.x, current.y, graph, groupNodes, endpointOwners)

    for (const crossing of findTerrainTransitions(
      previous.x,
      previous.y,
      previousSurfaceZ,
      current.x,
      current.y,
      graph,
      groupNodes,
      endpointOwners
    )) {
      const crossingX = previous.x + (current.x - previous.x) * crossing.t
      const crossingY = previous.y + (current.y - previous.y) * crossing.t
      result.push({ x: crossingX, y: crossingY, z: crossing.zBefore + SURFACE_Z_NUDGE })
      result.push({ x: crossingX, y: crossingY, z: crossing.zAfter + SURFACE_Z_NUDGE })
    }

    result.push({ x: current.x, y: current.y, z: currentSurfaceZ + SURFACE_Z_NUDGE })
    previousSurfaceZ = currentSurfaceZ
  }

  return result
}

export function getCachedEdgeTerrainGeometry(edge: IEdge, graph: IGraph): EdgeTerrainGeometry {
  ensureTerrainInvalidationTracking(graph)
  const points = getEdgeWaypoints(edge)
  const sourceNode = edge.sourceNode
  const targetNode = edge.targetNode
  const pointsKey = computePointsKey(points, sourceNode, targetNode)
  const graphRevision = graphTerrainRevisions.get(graph) ?? 0
  const cached = cachedTerrainGeometry.get(edge)
  if (
    cached &&
    cached.graph === graph &&
    cached.pointsKey === pointsKey &&
    cached.graphRevision === graphRevision &&
    cached.sourceNode === sourceNode &&
    cached.targetNode === targetNode
  ) {
    return cached
  }

  const groupNodes = collectGroupNodes(graph)
  const terrainPath = buildTerrainPathForEdge(points, graph, groupNodes, [sourceNode, targetNode])
  const terrainSegments = buildTerrainSegments(terrainPath)
  const geometry = {
    pointsKey,
    graphRevision,
    graph,
    sourceNode,
    targetNode,
    terrainPath,
    terrainSegments
  }
  cachedTerrainGeometry.set(edge, geometry)
  return geometry
}

export function buildTerrainSegments(points3d: readonly Point3D[]): TerrainSegment[] {
  const segments: TerrainSegment[] = []
  for (let i = 1; i < points3d.length; i++) {
    const start = points3d[i - 1]
    const end = points3d[i]
    if (
      Math.abs(start.x - end.x) < Z_EPSILON &&
      Math.abs(start.y - end.y) < Z_EPSILON &&
      Math.abs(start.z - end.z) < Z_EPSILON
    ) {
      continue
    }

    const isCliff =
      Math.abs(start.x - end.x) < Z_EPSILON &&
      Math.abs(start.y - end.y) < Z_EPSILON &&
      Math.abs(start.z - end.z) >= Z_EPSILON

    if (isCliff) {
      segments.push({ start, end, isCliff })
      continue
    }

    segments.push({ start, end, isCliff: false })
  }
  return segments
}

export function getTerrainSegmentLength(segment: TerrainSegment): number {
  return Math.hypot(
    segment.end.x - segment.start.x,
    segment.end.y - segment.start.y,
    segment.end.z - segment.start.z
  )
}

export function getEdgeTerrainPath(edge: IEdge, graph: IGraph): Point3D[] {
  return getCachedEdgeTerrainGeometry(edge, graph).terrainPath
}

export function getEdgeZAtLayoutPoint(edge: IEdge, graph: IGraph, location: Point): number {
  // This uses the nearest point on the terrain path, not the global max edge Z,
  // so a remote high segment does not incorrectly float the whole edge above a node.
  const terrainPath = getEdgeTerrainPath(edge, graph)
  if (terrainPath.length === 0) return 0
  if (terrainPath.length === 1) return terrainPath[0].z

  let bestDistance = Number.POSITIVE_INFINITY
  let bestZ = terrainPath[0].z

  for (let i = 1; i < terrainPath.length; i++) {
    const start = terrainPath[i - 1]
    const end = terrainPath[i]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const lengthSquared = dx * dx + dy * dy

    let t = 0
    if (lengthSquared > Z_EPSILON) {
      t = Math.max(
        0,
        Math.min(1, ((location.x - start.x) * dx + (location.y - start.y) * dy) / lengthSquared)
      )
    }

    const nearestX = start.x + dx * t
    const nearestY = start.y + dy * t
    const distSq =
      (location.x - nearestX) * (location.x - nearestX) +
      (location.y - nearestY) * (location.y - nearestY)

    if (distSq < bestDistance) {
      bestDistance = distSq
      bestZ = start.z + (end.z - start.z) * t
    }
  }

  return bestZ
}

function collectGroupNodes(graph: IGraph): INode[] {
  const groups: INode[] = []
  for (const node of graph.nodes.toArray()) {
    if (graph.isGroupNode(node)) {
      groups.push(node)
    }
  }
  groups.sort((a, b) => nestingDepth(graph, b) - nestingDepth(graph, a))
  return groups
}

function ensureTerrainInvalidationTracking(graph: IGraph): void {
  if (trackedGraphs.has(graph)) return

  trackedGraphs.add(graph)
  const invalidate = (): void => {
    graphTerrainRevisions.set(graph, (graphTerrainRevisions.get(graph) ?? 0) + 1)
  }

  graph.addEventListener('node-created', invalidate)
  graph.addEventListener('node-removed', invalidate)
  graph.addEventListener('node-layout-changed', invalidate)
  graph.addEventListener('node-tag-changed', invalidate)
  graph.addEventListener('parent-changed', invalidate)
  graph.addEventListener('is-group-node-changed', invalidate)
}

function nestingDepth(graph: IGraph, node: INode): number {
  let depth = 0
  let current = graph.getParent(node)
  while (current) {
    depth++
    current = graph.getParent(current)
  }
  return depth
}

function getTerrainZAt(
  x: number,
  y: number,
  graph: IGraph,
  groupNodes: readonly INode[],
  endpointOwners: TerrainEndpointOwners
): number {
  for (const group of groupNodes) {
    const { x: gx, y: gy, width, height } = group.layout
    if (x >= gx && x <= gx + width && y >= gy && y <= gy + height) {
      if (endpointOwners[0] === group || endpointOwners[1] === group) {
        // A group node is an elevated object itself. An edge attached to it
        // connects at its base, even though the port's layout coordinates may
        // lie within the group's top-surface rectangle.
        return getNodeElevationForGraph(graph, group)
      }
      return getNodeElevationForGraph(graph, group) + getNodeHeight(group)
    }
  }
  return 0
}

type TerrainTransition = { t: number; zBefore: number; zAfter: number }

function findTerrainTransitions(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  graph: IGraph,
  groupNodes: readonly INode[],
  endpointOwners: TerrainEndpointOwners
): TerrainTransition[] {
  const parameters = [0, 1]
  for (const group of groupNodes) {
    addRectangleIntersectionParameters(x1, y1, x2, y2, group, parameters)
  }
  parameters.sort((a, b) => a - b)
  dedupeParameters(parameters)

  const intervalLevels = []
  for (let index = 1; index < parameters.length; index++) {
    const midpoint = (parameters[index - 1] + parameters[index]) / 2
    intervalLevels.push(
      getTerrainZAt(
        x1 + (x2 - x1) * midpoint,
        y1 + (y2 - y1) * midpoint,
        graph,
        groupNodes,
        endpointOwners
      )
    )
  }

  const transitions: TerrainTransition[] = []
  if (intervalLevels.length > 0 && Math.abs(intervalLevels[0] - z1) > Z_EPSILON) {
    transitions.push({ t: 0, zBefore: z1, zAfter: intervalLevels[0] })
  }
  for (let index = 1; index < intervalLevels.length; index++) {
    const zBefore = intervalLevels[index - 1]
    const zAfter = intervalLevels[index]
    if (Math.abs(zAfter - zBefore) > Z_EPSILON) {
      transitions.push({ t: parameters[index], zBefore, zAfter })
    }
  }
  const lastLevel = intervalLevels.at(-1)
  const endZ = getTerrainZAt(x2, y2, graph, groupNodes, endpointOwners)
  if (lastLevel !== undefined && Math.abs(endZ - lastLevel) > Z_EPSILON) {
    transitions.push({ t: 1, zBefore: lastLevel, zAfter: endZ })
  }
  return transitions
}

function addRectangleIntersectionParameters(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  group: INode,
  parameters: number[]
): void {
  const dx = x2 - x1
  const dy = y2 - y1
  const { x, y, width, height } = group.layout
  const xInterval = getAxisIntersectionInterval(x1, dx, x, x + width)
  const yInterval = getAxisIntersectionInterval(y1, dy, y, y + height)
  if (!xInterval || !yInterval) return

  const enter = Math.max(xInterval[0], yInterval[0], 0)
  const exit = Math.min(xInterval[1], yInterval[1], 1)
  if (enter <= exit) {
    parameters.push(enter, exit)
  }
}

function getAxisIntersectionInterval(
  start: number,
  delta: number,
  min: number,
  max: number
): [number, number] | null {
  if (Math.abs(delta) < Z_EPSILON) {
    return start >= min && start <= max ? [0, 1] : null
  }

  const first = (min - start) / delta
  const second = (max - start) / delta
  return [Math.min(first, second), Math.max(first, second)]
}

function dedupeParameters(parameters: number[]): void {
  let writeIndex = 1
  for (let readIndex = 1; readIndex < parameters.length; readIndex++) {
    if (Math.abs(parameters[readIndex] - parameters[writeIndex - 1]) > 1e-9) {
      parameters[writeIndex++] = parameters[readIndex]
    }
  }
  parameters.length = writeIndex
}

function computePointsKey(
  points: readonly Point[],
  sourceNode: INode | null,
  targetNode: INode | null
): string {
  const pointKey = points.map((point) => `${point.x},${point.y}`).join('|')
  return `${pointKey}|source:${getNodeIdentity(sourceNode)}|target:${getNodeIdentity(targetNode)}`
}

const nodeIdentityCache = new WeakMap<INode, number>()
let nextNodeIdentity = 1

function getNodeIdentity(node: INode | null): string {
  if (!node) return 'none'

  let identity = nodeIdentityCache.get(node)
  if (identity === undefined) {
    identity = nextNodeIdentity++
    nodeIdentityCache.set(node, identity)
  }
  return String(identity)
}
