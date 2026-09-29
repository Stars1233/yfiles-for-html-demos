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
import { type IEdge, IEnumerable, type INode } from '@yfiles/yfiles'
import type { CoordinateMapping } from './CoordinateMapping'
import type { NodeGroup, NodeGroups } from '../EventTimelineTypes'
import { representativeFilter } from '../EventTimelineUtils'
import type { EventTimelineConfig } from '../EventTimelineConfig'

/**
 * Owns the derived timeline state that is computed from the built graph.
 */
export class TimelineDerivedState {
  nodeGroups: NodeGroups<INode> = {}
  edgeColorMap = new Map<string, string>()
  dateEdgeMap = new Map<number, IEdge[]>()
  sortedEdges = IEnumerable.from<IEdge>([])
  sortedNodes = IEnumerable.from<INode>([])

  private readonly nodeGroupAccessor: (node: INode) => string

  private readonly timeAccessor: (edge: IEdge) => Date

  constructor(timeAccessor: (edge: IEdge) => Date, nodeGroupAccessor: (node: INode) => string) {
    this.timeAccessor = timeAccessor
    this.nodeGroupAccessor = nodeGroupAccessor
  }

  collectDateLimits(
    graphEdges: Iterable<IEdge>,
    coordinateMapping: CoordinateMapping,
    xDomain: [Date, Date],
    reset = false
  ): void {
    this.dateEdgeMap.clear()

    const processEdge = (edge: IEdge): void => {
      if (!representativeFilter(edge)) return
      const date = this.timeAccessor(edge).getTime()
      if (!this.dateEdgeMap.has(date)) this.dateEdgeMap.set(date, [])
      this.dateEdgeMap.get(date)!.push(edge)
    }

    for (const edge of graphEdges) {
      processEdge(edge)
    }

    const dates = Array.from(this.dateEdgeMap.keys())

    if (dates.length === 0) {
      if (reset || xDomain[0].getTime() === xDomain[1].getTime()) {
        xDomain[0] = new Date()
        xDomain[1] = new Date()
        coordinateMapping.t0Ms = xDomain[0].getTime()
      }
      return
    }

    const minDate = Math.min(...dates)
    const maxDate = Math.max(...dates)

    const isInitialOrReset = reset || xDomain[0].getTime() === xDomain[1].getTime()
    if (isInitialOrReset) {
      xDomain[0] = new Date(minDate)
      xDomain[1] = new Date(maxDate)
    } else {
      xDomain[0] = new Date(Math.min(xDomain[0].getTime(), minDate))
      xDomain[1] = new Date(Math.max(xDomain[1].getTime(), maxDate))
    }

    if (isInitialOrReset) {
      const minMs = xDomain[0].getTime()
      const maxMs = xDomain[1].getTime()
      coordinateMapping.t0Ms = Math.round((minMs + maxMs) * 0.5)
    }
  }

  determineYUnits(coordinateMapping: CoordinateMapping): void {
    const nNodeGroups = Object.keys(this.nodeGroups).length

    const unCollapsedNodes = Object.values(this.nodeGroups).reduce(
      (nNodes: number, nodeGroup: NodeGroup<INode> | undefined): number => {
        if (!nodeGroup?.collapsed) {
          nNodes += nodeGroup?.nodes.length ?? 0
        }
        return nNodes
      },
      0
    )

    const nUncollapsedGroups = Object.values(this.nodeGroups).reduce(
      (nUncollapsedGroups: number, nodeGroup: NodeGroup<INode> | undefined): number => {
        if (!nodeGroup?.collapsed) {
          nUncollapsedGroups += 1
        }
        return nUncollapsedGroups
      },
      0
    )

    coordinateMapping.yUnits = Math.max(
      unCollapsedNodes - nUncollapsedGroups + (nNodeGroups - 1) * 2,
      1
    )
  }

  updateColorMap(config: EventTimelineConfig): void {
    this.edgeColorMap.clear()
    Object.keys(this.nodeGroups)
      .sort()
      .forEach((group, i) => {
        this.edgeColorMap.set(group, config.defaultColors[i % config.defaultColors.length])
      })
  }

  sortEdges(edges: Iterable<IEdge>): void {
    this.sortedEdges = IEnumerable.from(edges).toSorted((a, b) => {
      return this.timeAccessor(a).getTime() - this.timeAccessor(b).getTime()
    })
  }

  sortNodes(nodes: Iterable<INode>): void {
    this.sortedNodes = IEnumerable.from(nodes).toSorted(
      (nodeA: INode, nodeB: INode) => nodeA.layout.centerY - nodeB.layout.centerY
    )
  }

  setNodeGroups(nodes: Iterable<INode>): void {
    this.nodeGroups = {}
    for (const node of nodes) {
      const groupName = this.nodeGroupAccessor(node)
      if (!this.nodeGroups[groupName]) {
        this.nodeGroups[groupName] = { id: groupName, nodes: [], collapsed: false }
      }
      this.nodeGroups[groupName]!.nodes.push(node)
    }
  }

  getNodeGroupName(node: INode): string {
    return this.nodeGroupAccessor(node)
  }

  getEdgeGroupName(edge: IEdge): string {
    return this.nodeGroupAccessor(edge.sourceNode!)
  }
}
