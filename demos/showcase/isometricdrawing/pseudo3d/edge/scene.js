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
import {} from '@yfiles/yfiles'
import { getProjectionKey } from '../core/Pseudo3DProjection'
import { boundsIntersect } from '../geometry/projected/primitives'
import { getCachedProjectedNodeData } from './nodeOccluders'
import { getNodeHeight } from '../core/nodeElevation'

const projectedSceneCache = new WeakMap()
const trackedGraphs = new WeakSet()

const SPATIAL_CELL_SIZE = 256
const MAX_INDEX_CELLS_PER_NODE = 64
const MAX_QUERY_CELLS = 256

export function getProjectedOcclusionScene(graph, projection) {
  ensureGraphInvalidationTracking(graph)
  const projectionKey = getProjectionKey(projection)
  const cached = projectedSceneCache.get(graph)
  if (cached && cached.projectionKey === projectionKey) {
    return cached
  }

  const scene = {
    projectionKey,
    nodeCache: new WeakMap(),
    occluderTemplates: new Map(),
    sortedNodes: null,
    spatialIndex: null
  }
  projectedSceneCache.set(graph, scene)
  return scene
}

export function queryProjectedOccludersForBound(
  graphComponent,
  bounds,
  projection,
  heightVector,
  visualTranslation,
  scene,
  result
) {
  result.length = 0
  const graph = graphComponent.graph
  const allNodes = getSortedSceneNodes(graph, projection, heightVector, visualTranslation, scene)
  const nodes = querySpatialIndex(scene.spatialIndex, bounds, allNodes)
  for (const node of nodes) {
    for (const occluder of node.occluders) {
      if (boundsIntersect(bounds, occluder.bounds)) {
        result.push(occluder)
      }
    }
  }
}

function getSortedSceneNodes(graph, projection, heightVector, visualTranslation, scene) {
  if (scene.sortedNodes) {
    return scene.sortedNodes
  }

  const sortedNodes = []
  for (const node of graph.nodes) {
    if (getNodeHeight(node) <= 0) {
      continue
    }
    sortedNodes.push(
      getCachedProjectedNodeData(node, graph, projection, heightVector, visualTranslation, scene)
    )
  }

  sortedNodes.sort((a, b) => a.queryBounds.minX - b.queryBounds.minX)
  scene.sortedNodes = sortedNodes
  scene.spatialIndex = buildSpatialIndex(sortedNodes)
  return sortedNodes
}

function buildSpatialIndex(nodes) {
  const index = { cellSize: SPATIAL_CELL_SIZE, buckets: new Map(), oversized: [] }

  for (const node of nodes) {
    const range = getCellRange(node.queryBounds, index.cellSize)
    const cellCount = getCellCount(range)
    if (cellCount > MAX_INDEX_CELLS_PER_NODE) {
      index.oversized.push(node)
      continue
    }

    for (let cellY = range.minY; cellY <= range.maxY; cellY++) {
      for (let cellX = range.minX; cellX <= range.maxX; cellX++) {
        const key = getCellKey(cellX, cellY)
        let bucket = index.buckets.get(key)
        if (!bucket) {
          bucket = []
          index.buckets.set(key, bucket)
        }
        bucket.push(node)
      }
    }
  }

  return index
}

function querySpatialIndex(index, bounds, fallbackNodes) {
  const result = new Set(index.oversized)
  const range = getCellRange(bounds, index.cellSize)
  const cellCount = getCellCount(range)

  // Very large queries are cheaper and safer with the already materialized list.
  if (cellCount > MAX_QUERY_CELLS) {
    return new Set(fallbackNodes)
  }

  for (let cellY = range.minY; cellY <= range.maxY; cellY++) {
    for (let cellX = range.minX; cellX <= range.maxX; cellX++) {
      for (const node of index.buckets.get(getCellKey(cellX, cellY)) ?? []) {
        result.add(node)
      }
    }
  }

  return result
}

function getCellRange(bounds, cellSize) {
  return {
    minX: Math.floor(bounds.minX / cellSize),
    minY: Math.floor(bounds.minY / cellSize),
    maxX: Math.floor(bounds.maxX / cellSize),
    maxY: Math.floor(bounds.maxY / cellSize)
  }
}

function getCellCount(range) {
  return (range.maxX - range.minX + 1) * (range.maxY - range.minY + 1)
}

function getCellKey(x, y) {
  return `${x},${y}`
}

function ensureGraphInvalidationTracking(graph) {
  if (trackedGraphs.has(graph)) {
    return
  }

  trackedGraphs.add(graph)
  const invalidate = () => {
    projectedSceneCache.delete(graph)
  }

  graph.addEventListener('node-created', invalidate)
  graph.addEventListener('node-removed', invalidate)
  graph.addEventListener('node-layout-changed', invalidate)
  graph.addEventListener('node-tag-changed', invalidate)
  graph.addEventListener('node-style-changed', invalidate)
  graph.addEventListener('parent-changed', invalidate)
  graph.addEventListener('is-group-node-changed', invalidate)
}
