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
import { IEdge, ILabel, INode, Matrix, Point } from '@yfiles/yfiles'
import { getNodeZInterval } from '../core/nodeElevation'
import { getEdgeZAtLayoutPoint } from '../edge/terrain'
import {} from '../core/Pseudo3DProjection'

const DEPTH_EPSILON = 0.0001
const Z_EPSILON = 0.5

/**
 * Computes one stable painter order for nodes and edge labels.
 *
 * Projected depth is used as the default order. Relationships that cannot be
 * represented by a single scalar, such as a child node resting on a group,
 * are added as constraints and resolved with a stable topological sort.
 */
export class ProjectionAwareRenderOrder {
  rotationProjection = Matrix.IDENTITY

  verticalDepthScale = 0

  horizontalDepthScale = 1
  nodeFarDepthCache = new Map()

  stableOrder = new WeakMap()
  nextStableOrder = 0
  orderedRanks = new Map()

  projectionState

  graph
  constructor(contextOrGraphComponent, projectionState) {
    this.projectionState = projectionState ?? contextOrGraphComponent.projectionState
    const graphComponent =
      projectionState === undefined
        ? contextOrGraphComponent.graphComponent
        : contextOrGraphComponent
    this.graph = graphComponent.graph
    for (const item of [...this.graph.nodes, ...this.graph.edgeLabels]) {
      this.getStableOrder(item)
    }
    this.update()
  }

  update() {
    const inclination = (this.projectionState.inclination * Math.PI) / 180
    this.rotationProjection = Matrix.createRotateInstance(
      (this.projectionState.rotation * Math.PI) / 180
    )
    // The projection flattens a 3D point as follows:
    //   screenY = sin(inclination) * rotatedY - cos(inclination) * z
    // The complementary camera-space coordinate is used for painter order.
    this.horizontalDepthScale = Math.cos(inclination)
    this.verticalDepthScale = Math.sin(inclination)
    this.nodeFarDepthCache.clear()
    this.orderedRanks.clear()
  }

  /**
   * Compares items in the last computed order, or by the stable base order
   * before the first mixed-item order has been computed.
   */
  compare(item1, item2) {
    if (!item1 && !item2) return 0
    if (!item1) return -1
    if (!item2) return 1

    const rank1 = this.orderedRanks.get(item1)
    const rank2 = this.orderedRanks.get(item2)
    if (rank1 !== undefined && rank2 !== undefined && rank1 !== rank2) {
      return rank1 - rank2
    }

    return this.compareBase(item1, item2)
  }

  /** Returns the complete mixed-item painter order for one refresh. */
  order(items) {
    const baseOrder = [...new Set(items)].sort((a, b) => this.compareBase(a, b))
    const baseRanks = new Map(baseOrder.map((item, index) => [item, index]))
    const constraints = this.createConstraints(baseOrder)
    const ordered = this.resolveConstraints(baseOrder, baseRanks, constraints)

    this.orderedRanks = new Map(ordered.map((item, index) => [item, index]))
    return ordered
  }

  compareBase(item1, item2) {
    const depthDelta = this.getBaseDepth(item1) - this.getBaseDepth(item2)
    if (Math.abs(depthDelta) > DEPTH_EPSILON) {
      return depthDelta > 0 ? 1 : -1
    }

    if (item1 instanceof INode && item2 instanceof INode) {
      const extentDelta = this.getNodeFarDepth(item1) - this.getNodeFarDepth(item2)
      if (Math.abs(extentDelta) > DEPTH_EPSILON) {
        return extentDelta > 0 ? 1 : -1
      }
    }

    const zDelta = this.getBaseZ(item1) - this.getBaseZ(item2)
    if (Math.abs(zDelta) > Z_EPSILON) {
      return zDelta > 0 ? 1 : -1
    }

    return this.getStableOrder(item1) - this.getStableOrder(item2)
  }

  getBaseDepth(item) {
    const z = item instanceof ILabel ? this.getLabelZ(item) : this.getNodeMidpointZ(item)
    return this.getCameraDepth(item.layout.center, z)
  }

  getBaseZ(item) {
    if (item instanceof INode) {
      return getNodeZInterval(this.graph, item).zBottom
    }
    return this.getLabelZ(item)
  }

  createConstraints(items) {
    const itemSet = new Set(items)
    const constraints = []

    for (const item of items) {
      if (!(item instanceof INode)) continue
      const parent = this.graph.getParent(item)
      if (parent && itemSet.has(parent)) {
        constraints.push({ before: parent, after: item })
      }
    }

    const nodes = items.filter((item) => item instanceof INode)
    const labels = items.filter((item) => item instanceof ILabel)
    for (const label of labels) {
      if (!(label.owner instanceof IEdge)) continue
      const labelZ = this.getLabelZ(label)

      for (const node of nodes) {
        if (!node.layout.contains(label.layout.center)) continue

        const interval = getNodeZInterval(this.graph, node)
        if (labelZ >= interval.zTop) {
          constraints.push({ before: node, after: label })
        } else if (labelZ < interval.zBottom) {
          constraints.push({ before: label, after: node })
        }
      }
    }

    return constraints
  }

  resolveConstraints(baseOrder, baseRanks, constraints) {
    const outgoing = new Map()
    const indegree = new Map()
    for (const item of baseOrder) {
      outgoing.set(item, new Set())
      indegree.set(item, 0)
    }

    for (const { before, after } of constraints) {
      const successors = outgoing.get(before)
      if (!successors || !indegree.has(after) || successors.has(after)) continue
      successors.add(after)
      indegree.set(after, (indegree.get(after) ?? 0) + 1)
    }

    const available = baseOrder.filter((item) => indegree.get(item) === 0)
    const result = []
    const emitted = new Set()

    while (result.length < baseOrder.length) {
      if (available.length === 0) {
        // Intersecting 3D surfaces can form a cycle. Break it deterministically
        // using the base projection order instead of returning an unstable sort.
        const fallback = baseOrder.find((item) => !emitted.has(item))
        if (!fallback) break
        available.push(fallback)
      }

      available.sort((a, b) => (baseRanks.get(a) ?? 0) - (baseRanks.get(b) ?? 0))
      const item = available.shift()
      if (!item || emitted.has(item)) continue

      emitted.add(item)
      result.push(item)
      for (const successor of outgoing.get(item) ?? []) {
        const nextIndegree = (indegree.get(successor) ?? 1) - 1
        indegree.set(successor, nextIndegree)
        if (nextIndegree === 0) available.push(successor)
      }
    }

    return result
  }

  getLabelZ(label) {
    return label.owner instanceof IEdge
      ? getEdgeZAtLayoutPoint(label.owner, this.graph, label.layout.center)
      : 0
  }

  getNodeMidpointZ(node) {
    const interval = getNodeZInterval(this.graph, node)
    return (interval.zBottom + interval.zTop) / 2
  }

  getLayoutDepth(point) {
    return this.rotationProjection.transform(point).y
  }

  getCameraDepth(point, z) {
    return this.getLayoutDepth(point) * this.horizontalDepthScale + z * this.verticalDepthScale
  }

  getNodeFarDepth(node) {
    const cached = this.nodeFarDepthCache.get(node)
    if (cached !== undefined) return cached

    const interval = getNodeZInterval(this.graph, node)
    const corners = [
      new Point(node.layout.x, node.layout.y),
      new Point(node.layout.maxX, node.layout.y),
      new Point(node.layout.maxX, node.layout.maxY),
      new Point(node.layout.x, node.layout.maxY)
    ]
    const depths = corners.flatMap((corner) => [
      this.getCameraDepth(corner, interval.zBottom),
      this.getCameraDepth(corner, interval.zTop)
    ])
    const farDepth = Math.min(...depths)
    this.nodeFarDepthCache.set(node, farDepth)
    return farDepth
  }

  getStableOrder(item) {
    const object = item
    const existing = this.stableOrder.get(object)
    if (existing !== undefined) return existing

    const order = this.nextStableOrder++
    this.stableOrder.set(object, order)
    return order
  }
}
