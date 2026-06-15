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
import { GraphComponent } from '@yfiles/yfiles'
import { EventTimelineLayout } from './layout/EventTimelineLayout'
import { TimeScale } from './components/Timescale'
import { doEdgesShareNodeTermini, representativeFilter } from './EventTimelineUtils'
import { EdgeAggregator } from './components/EdgeAggregator'
import { StyleManager } from './components/StyleManager'
import { InteractionManager } from './components/InteractionManager'
import { CoordinateMapping } from './components/CoordinateMapping'
import { TimelineGraphBuilderAdapter } from './components/TimelineGraphBuilderAdapter'
import { TimelineDerivedState } from './components/TimelineDerivedState'
import { ViewportManager } from './components/ViewportManager'
import { EventTimelineController } from './EventTimelineController'
import { resolveEventTimelineOptions } from './EventTimelineOptions'
import { initializeEventTimelineGraph } from './graph/initializeEventTimelineGraph'

/**
 * The EventTimeLine class which organizes and visualizes a dynamic graph as a series of
 * (labeled) parallel horizontal line-segments representing nodes, and a series of (labeled)
 * parallel vertical line-segments representing edges (which connect their source and target
 * node line segments).
 */
export class EventTimeline {
  graphComponent
  config
  styleManager
  viewportManager

  // ── Resolved accessor functions ──────────────────────────────────────────
  nodeLabelAccessor
  nodeGroupAccessor
  edgeLabelAccessor
  edgeTypeAccessor
  nodeIdAccessor
  edgeIdAccessor
  edgeSourceIdAccessor
  edgeTargetIdAccessor
  timeAccessorFunction

  eventTimelineLayout
  timescale
  coordinateMapping = new CoordinateMapping()
  graphBuilderAdapter
  derivedState
  edgeAggregator
  interactionManager
  controller

  /**
   * Instantiates a new EventTimeLine object.
   * @param options The configuration options for the event timeline.
   */
  constructor(options) {
    const resolvedOptions = resolveEventTimelineOptions(options)

    this.graphComponent = new GraphComponent(options.selector)
    this.timeAccessorFunction = resolvedOptions.accessors.timeAccessorFunction
    this.config = resolvedOptions.config

    this.nodeLabelAccessor = resolvedOptions.accessors.nodeLabelAccessor
    this.nodeGroupAccessor = resolvedOptions.accessors.nodeGroupAccessor
    this.edgeLabelAccessor = resolvedOptions.accessors.edgeLabelAccessor
    this.edgeTypeAccessor = resolvedOptions.accessors.edgeTypeAccessor
    this.nodeIdAccessor = resolvedOptions.accessors.nodeIdAccessor
    this.edgeIdAccessor = resolvedOptions.accessors.edgeIdAccessor
    this.edgeSourceIdAccessor = resolvedOptions.accessors.edgeSourceIdAccessor
    this.edgeTargetIdAccessor = resolvedOptions.accessors.edgeTargetIdAccessor

    this.coordinateMapping.unitHeight = this.config.unitHeight

    this.graphBuilderAdapter = new TimelineGraphBuilderAdapter(
      this.nodeLabelAccessor,
      this.edgeLabelAccessor,
      this.nodeIdAccessor,
      this.edgeIdAccessor,
      this.edgeSourceIdAccessor,
      this.edgeTargetIdAccessor,
      resolvedOptions
    )
    this.derivedState = new TimelineDerivedState(this.timeAccessorFunction, this.nodeGroupAccessor)
    const xDomain = [new Date(), new Date()]

    this.eventTimelineLayout = new EventTimelineLayout(
      xDomain,
      this.coordinateMapping,
      (edge) => this.timeAccessorFunction(edge),
      (node) => this.nodeGroupAccessor(node)
    )

    this.viewportManager = new ViewportManager(
      this.graphComponent,
      this.coordinateMapping,
      () => this.controller.updateStyles(),
      () => this.derivedState.determineYUnits(this.coordinateMapping),
      () => this.graphComponent.graph.applyLayout(this.eventTimelineLayout),
      (range) => this.timescale.renderTimescaleAtInterval(range)
    )

    this.derivedState.updateColorMap(this.config)

    this.edgeAggregator = new EdgeAggregator(
      this.graphComponent.graph,
      (edge) => this.timeAccessorFunction(edge),
      doEdgesShareNodeTermini,
      this.config
    )
    this.styleManager = new StyleManager(
      this.graphComponent.graph,
      this.derivedState.edgeColorMap,
      (node) => this.derivedState.getNodeGroupName(node),
      (edge) => this.derivedState.getEdgeGroupName(edge),
      this.config
    )

    const itemStates = new Map()
    initializeEventTimelineGraph({ graphComponent: this.graphComponent, itemStates })

    this.graphBuilderAdapter.initialize(this.graphComponent)

    this.timescale = this.createTimescale()
    this.controller = new EventTimelineController({
      graphComponent: this.graphComponent,
      eventTimelineLayout: this.eventTimelineLayout,
      graphBuilderAdapter: this.graphBuilderAdapter,
      derivedState: this.derivedState,
      edgeAggregator: this.edgeAggregator,
      styleManager: this.styleManager,
      viewportManager: this.viewportManager,
      timescale: this.timescale,
      coordinateMapping: this.coordinateMapping,
      config: this.config,
      timeAccessorFunction: this.timeAccessorFunction,
      xDomain,
      itemStates
    })
    this.interactionManager = this.createInteractionManager(
      resolvedOptions.callbacks.onHyperEdgeClicked
    )

    this.controller.initialize()
  }

  /**
   * Updates the graph data.
   * @param data The new data to be loaded.
   * @param resetZoom Whether to reset the zoom level (default = false).
   * @param startTimeFrame
   */
  async setData(data, resetZoom = false, startTimeFrame) {
    await this.controller.setData(data, resetZoom, startTimeFrame)
  }

  /**
   * Resets the zoom level such that the whole graph is in view again.
   * @param duration The duration of the animation (default value of 1s).
   */
  async resetZoom(duration = '1s') {
    await this.controller.resetZoom(duration)
  }

  /**
   * Adjusts the horizontal resolution of the timeline.
   * @param delta The scroll delta or zoom factor.
   */
  async zoomHorizontal(delta) {
    await this.viewportManager.changeResolution1D(delta, 'horizontal')
  }

  /**
   * Adjusts the vertical resolution of the timeline.
   * @param delta The scroll delta or zoom factor.
   */
  async zoomVertical(delta) {
    await this.viewportManager.changeResolution1D(delta, 'vertical')
  }

  /**
   * Creates the timescale component.
   *
   * Note: The callbacks (onEdgeTickHover, onEdgeTickUnhover) capture `this.interactionManager`,
   * which is assigned *after* this method returns. This is safe because the callbacks are only
   * invoked at hover time (well after constructor completion), not during initialization. However,
   * this creates a temporal dependency: if timescale setup were to trigger these callbacks
   * synchronously during construction, it would fail at runtime.
   *
   * @private
   */
  createTimescale() {
    return new TimeScale({
      visibleRange: this.viewportManager.calculateVisibleRange(
        this.graphComponent.viewport,
        this.coordinateMapping.stretchX
      ),
      edgeTickDates: this.graphComponent.graph.edges
        .filter((e) => representativeFilter(e))
        .map((e) => this.timeAccessorFunction(e))
        .toArray(),
      onEdgeTickHover: (date) => {
        const affected = this.controller.getDateEdgeMap().get(date.getTime())
        if (affected) {
          this.interactionManager.highlightFromTick(affected, true)
        }
      },
      onEdgeTickUnhover: () => this.interactionManager.clearHighlights(),
      graphComponent: this.graphComponent,
      coordinateMapping: {
        timeToX: (time) => this.coordinateMapping.timeToX(time),
        xToTime: (x) => this.coordinateMapping.xToTime(x)
      },
      config: this.config
    })
  }

  /**
   * Creates the interaction manager.
   * @private
   */
  createInteractionManager(onHyperEdgeClicked) {
    const interactionManager = new InteractionManager({
      graphComponent: this.graphComponent,
      richInteraction: true,
      timescale: this.timescale,
      edgeAggregator: this.edgeAggregator,
      coordinateMapping: this.coordinateMapping,
      viewportManager: this.viewportManager,
      timeAccessorFunction: this.timeAccessorFunction,
      config: this.config,
      onCollapseNodeGroup: this.controller.collapseNodeGroup.bind(this.controller),
      onHyperEdgeClicked,
      nodeLabelAccessor: this.nodeLabelAccessor,
      nodeGroupAccessor: this.nodeGroupAccessor,
      edgeTypeAccessor: this.edgeTypeAccessor
    })
    interactionManager.configure()
    return interactionManager
  }

  /**
   * Clears highlights on the graph component.
   */
  clearHighlights() {
    this.interactionManager.clearHighlights()
  }

  getSharedNodeStyle() {
    return this.styleManager.getSharedNodeStyle()
  }

  getSharedSimpleEdgeStyle() {
    return this.styleManager.getSharedSimpleEdgeStyle()
  }

  getSharedNodeLabelStyle() {
    return this.styleManager.getSharedNodeLabelStyle()
  }

  getSharedEdgeLabelStyle() {
    return this.styleManager.getSharedEdgeLabelStyle()
  }

  async revealHyperEdgeBundle(upperY, lowerY, bundle) {
    await this.viewportManager.hyperEdgeCallback(upperY, lowerY, bundle)
  }

  /**
   * Disposes of the EventTimeline instance and its resources.
   */
  dispose() {
    this.graphComponent.cleanUp()
  }
}
