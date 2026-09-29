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
import { IEnumerable } from '@yfiles/yfiles'
import { representativeFilter } from '../EventTimelineUtils'

/**
 * Owns the derived timeline state that is computed from the built graph.
 */
export class TimelineDerivedState {
  nodeGroups = {}
  edgeColorMap = new Map()
  dateEdgeMap = new Map()
  sortedEdges = IEnumerable.from([])
  sortedNodes = IEnumerable.from([])

  nodeGroupAccessor

  timeAccessor

  constructor(timeAccessor, nodeGroupAccessor) {
    this.timeAccessor = timeAccessor
    this.nodeGroupAccessor = nodeGroupAccessor
  }

  collectDateLimits(graphEdges, coordinateMapping, xDomain, reset = false) {
    this.dateEdgeMap.clear()

    const processEdge = (edge) => {
      if (!representativeFilter(edge)) return
      const date = this.timeAccessor(edge).getTime()
      if (!this.dateEdgeMap.has(date)) this.dateEdgeMap.set(date, [])
      this.dateEdgeMap.get(date).push(edge)
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

  determineYUnits(coordinateMapping) {
    const nNodeGroups = Object.keys(this.nodeGroups).length

    const unCollapsedNodes = Object.values(this.nodeGroups).reduce((nNodes, nodeGroup) => {
      if (!nodeGroup?.collapsed) {
        nNodes += nodeGroup?.nodes.length ?? 0
      }
      return nNodes
    }, 0)

    const nUncollapsedGroups = Object.values(this.nodeGroups).reduce(
      (nUncollapsedGroups, nodeGroup) => {
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

  updateColorMap(config) {
    this.edgeColorMap.clear()
    Object.keys(this.nodeGroups)
      .sort()
      .forEach((group, i) => {
        this.edgeColorMap.set(group, config.defaultColors[i % config.defaultColors.length])
      })
  }

  sortEdges(edges) {
    this.sortedEdges = IEnumerable.from(edges).toSorted((a, b) => {
      return this.timeAccessor(a).getTime() - this.timeAccessor(b).getTime()
    })
  }

  sortNodes(nodes) {
    this.sortedNodes = IEnumerable.from(nodes).toSorted(
      (nodeA, nodeB) => nodeA.layout.centerY - nodeB.layout.centerY
    )
  }

  setNodeGroups(nodes) {
    this.nodeGroups = {}
    for (const node of nodes) {
      const groupName = this.nodeGroupAccessor(node)
      if (!this.nodeGroups[groupName]) {
        this.nodeGroups[groupName] = { id: groupName, nodes: [], collapsed: false }
      }
      this.nodeGroups[groupName].nodes.push(node)
    }
  }

  getNodeGroupName(node) {
    return this.nodeGroupAccessor(node)
  }

  getEdgeGroupName(edge) {
    return this.nodeGroupAccessor(edge.sourceNode)
  }
}
