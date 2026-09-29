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
import { TimeSpan } from '@yfiles/yfiles'
import { representativeFilter, updateVisibilityByOverlap } from './EventTimelineUtils'

export class EventTimelineController {
  graphComponent
  eventTimelineLayout
  graphBuilderAdapter
  derivedState
  edgeAggregator
  styleManager
  viewportManager
  timescale
  coordinateMapping
  config
  timeAccessorFunction
  xDomain
  itemStates

  constructor(args) {
    this.graphComponent = args.graphComponent
    this.eventTimelineLayout = args.eventTimelineLayout
    this.graphBuilderAdapter = args.graphBuilderAdapter
    this.derivedState = args.derivedState
    this.edgeAggregator = args.edgeAggregator
    this.styleManager = args.styleManager
    this.viewportManager = args.viewportManager
    this.timescale = args.timescale
    this.coordinateMapping = args.coordinateMapping
    this.config = args.config
    this.timeAccessorFunction = args.timeAccessorFunction
    this.xDomain = args.xDomain
    this.itemStates = args.itemStates

    const graph = this.graphComponent.graph
    graph.addEventListener('node-removed', (evt) => {
      this.itemStates.delete(evt.item)
    })
    graph.addEventListener('edge-removed', (evt) => {
      this.itemStates.delete(evt.item)
    })
  }

  initialize(startTimeframe) {
    this.updateGraphState()

    if (this.graphComponent.graph.nodes.size > 0) {
      void this.runLayout('0s').then(() => this.resetZoom('0s', startTimeframe))
    } else {
      void this.resetZoom('0s', startTimeframe)
    }
  }

  async setData(data, resetZoom = false, startTimeFrame = this.xDomain) {
    this.graphBuilderAdapter.setData(data)

    this.collectDateLimits(resetZoom)
    this.updateGraphState()

    await this.runLayout('0s')

    this.updateTimescale()

    if (resetZoom) {
      await this.viewportManager.resetZoom(startTimeFrame, '0s')
    }
  }

  async runLayout(duration = TimeSpan.fromSeconds(0.2)) {
    await this.graphComponent.applyLayoutAnimated({
      layout: this.eventTimelineLayout,
      animationDuration: duration,
      animateViewport: false
    })
  }

  async resetZoom(duration = '1s', startTimeframe = this.xDomain) {
    await this.viewportManager.resetZoom(startTimeframe, duration)
  }

  async collapseNodeGroup(node) {
    try {
      const group = this.derivedState.nodeGroups[this.derivedState.getNodeGroupName(node)]
      group.collapsed = !group.collapsed
      this.styleManager.updateGroupLabelVisibility(group)
      this.derivedState.determineYUnits(this.coordinateMapping)
      await this.runLayout('1s')
    } finally {
      this.updateStyles()
      this.graphComponent.updateContentBounds()
    }
  }

  updateGraphState() {
    this.derivedState.sortEdges(
      this.graphComponent.graph.edges.filter((e) => representativeFilter(e))
    )
    this.derivedState.setNodeGroups(this.graphComponent.graph.nodes)
    this.eventTimelineLayout.viewNodeGroups = this.derivedState.nodeGroups
    this.derivedState.updateColorMap(this.config)
    this.derivedState.determineYUnits(this.coordinateMapping)

    this.derivedState.sortNodes(this.graphComponent.graph.nodes)
    this.styleManager.setNodeStyle()
    this.styleManager.setEdgeLabelStyle()
    this.updateStyles()
  }

  updateTimescale() {
    this.timescale.edgeTickDates.length = 0
    this.timescale.edgeTickDates.push(
      ...this.graphComponent.graph.edges
        .filter((e) => representativeFilter(e))
        .map((e) => this.timeAccessorFunction(e))
        .toArray()
    )
    this.timescale.renderTimescaleAtInterval(
      this.viewportManager.calculateVisibleRange(this.graphComponent.viewport)
    )
  }

  updateStyles() {
    updateVisibilityByOverlap(
      this.derivedState.sortedNodes,
      (n) => n.labels.at(0)?.layout.center.y ?? 0,
      this.config.nodeLabelHeight + 6
    )
    this.edgeAggregator.aggregateEdges(this.derivedState.sortedEdges)
    this.edgeAggregator.updateEdgeMapping(this.derivedState.sortedEdges)
    updateVisibilityByOverlap(
      this.derivedState.sortedEdges,
      (e) => e.labels.at(0)?.layout.center.x ?? 0,
      this.config.edgeLabelHeight + 6
    )
    this.styleManager.updateEdgeStyle(this.edgeAggregator)
  }

  getDateEdgeMap() {
    return this.derivedState.dateEdgeMap
  }

  collectDateLimits(reset = false) {
    this.derivedState.collectDateLimits(
      this.graphComponent.graph.edges,
      this.coordinateMapping,
      this.xDomain,
      reset
    )
  }
}
