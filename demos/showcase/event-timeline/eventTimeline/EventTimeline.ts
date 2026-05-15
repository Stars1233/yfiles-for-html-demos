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
import {
  Animator,
  type GraphComponent,
  HierarchicalNestingPolicy,
  IAnimation,
  type IEdge,
  IEnumerable,
  type INode,
  Insets,
  type LayoutEdge,
  Point,
  Rect,
  TimeSpan,
  type TimeSpanConvertible,
  ViewportLimitingPolicy
} from '@yfiles/yfiles'
import { EventTimelineLayout } from './EventTimelineLayout'
import { TimeScale } from './components/Timescale'
import { ViewportLockedLabelStyle } from './styles/ViewportLockedLabelStyle'
import type {
  AggregatedEdgeGroup,
  ChangeDirection,
  CoordinateMapping,
  EdgeTag,
  NodeGroup,
  NodeGroups,
  NodeTag
} from './EventTimelineTypes'
import { TopEdgeLabelModel } from './TopEdgeLabelModel'
import { EdgeAggregator } from './components/EdgeAggregator'
import { StyleManager } from './components/StyleManager'
import { InteractionManager } from './components/InteractionManager'
import { SubGraph } from './components/SubGraph'

/**
 * The various constants that govern the layout and aesthetics of the timeline, e.g.,
 * the various colors for groups, the thickness of edges, or the size of node/edge labels.
 */
export const TIMELINE_CONSTANTS = {
  CSS_VAR_PREFIX: 'yfiles-event-timeline-demo',
  DEFAULT_COLORS: [
    '#8dd3c7',
    '#bebada',
    '#fb8072',
    '#80b1d3',
    '#fdb462',
    '#b3de69',
    '#fccde5',
    '#d9d9d9',
    '#bc80bd',
    '#ffffb3'
  ],
  EDGE_THICKNESS: 6,
  EDGE_RADIUS: 8,
  HIGHLIGHT_EDGE_THICKNESS: 8,
  HIGHLIGHT_EDGE_RADIUS: 10,
  EDGE_AGGREGATION_DELTA: 22,
  EDGE_LABEL_HEIGHT: 22,
  NODE_LABEL_HEIGHT: 30,
  NODE_LABEL_SIZE: 14,
  EDGE_LABEL_SIZE: 12,
  DEFAULT_NODE_COLOR: '#89919c',
  BACKGROUND_COLOR: '#ffffff',
  EDGE_BASE_COLOR: '#dfdee3',
  HIGHLIGHT_EDGE_COLOR: '#dfdee3',
  COLLAPSED_EDGE_LABEL_HEIGHT: 3
}

/**
 * Checks whether an edge is representative, i.e., whether an edge represents not just itself, but
 * a series of edges that have all been grouped owing to their proximity in time.
 * @param edge The IEdge object to be tested
 * @returns a boolean indicating whether the edge is a representative one or not
 */
export function representativeFilter(edge: IEdge): boolean {
  return (edge.tag as Record<string, never>)['representative'] !== true
}
/**
 * The EventTimeLine class which organizes and visualizes a dynamic graph as a series of
 * (labeled) parallel horizontal line-segments representing nodes, and a series of (labeled)
 * parallel vertical line-segments representing edges (which connect their source and target
 * node line segments).
 */
export class EventTimeline {
  readonly graphComponent: GraphComponent
  readonly subGraphComponent: GraphComponent
  readonly eventTimelineLayout: EventTimelineLayout
  readonly timeAccessorFunction: (edge: IEdge) => Date

  private readonly timescale: TimeScale
  private xDomain: [min: Date, max: Date] = [new Date(), new Date()]
  private coordinateMapping: CoordinateMapping = {
    t0Ms: 0,
    yUnits: 0,
    stretchX: 1,
    stretchY: 1,
    timeUnitMs: 1000,
    unitHeight: 100,
    xToTime: (worldPosX: number, stretch = this.coordinateMapping.stretchX): Date => {
      const dtUnits = worldPosX / stretch
      const timeMs = this.coordinateMapping.t0Ms + dtUnits * this.coordinateMapping.timeUnitMs
      return new Date(timeMs)
    },
    timeToX: (time: Date, stretch = this.coordinateMapping.stretchX): number => {
      const dtUnits =
        (time.getTime() - this.coordinateMapping.t0Ms) / this.coordinateMapping.timeUnitMs
      return dtUnits * stretch
    }
  }

  private nodeGroups: NodeGroups<INode> = {}
  private edgeColorMap: Map<string, string> = new Map()
  private dateEdgeMap: Map<number, IEdge[]> = new Map()
  private sortedEdges: IEnumerable<IEdge> = IEnumerable.from([])
  private sortedNodes: IEnumerable<INode> = IEnumerable.from([])

  private readonly edgeAggregator: EdgeAggregator
  private readonly styleManager: StyleManager
  private readonly interactionManager: InteractionManager
  private readonly hyperEdgeGraph: SubGraph

  /**
   * Instantiates a new EventTimeLine object.
   * @param graphComponent The graph component object that will house the main network visualization
   * @param subGraphComponent The graph component object that will house the subgraph's network
   * visualization, i.e., the subgraph that is visualized when clicking on a "hyperedge"
   * @param subGraphDialog The HTML dialog that will house the subgraph visualization
   * @param timeAccessorFunction A function with which to access an edge's (event's) timestamp; must
   * return a Date object
   * @param timescaleContainerID A string describing the ID of the HTML container that will
   * contain the timescale visualization above the event timeline.
   * @param unitHeight An optional number argument describing the smallest distance between two
   * nodes' horizontal line-segments. If not specified, a default value of 100 is used.
   */
  constructor(
    graphComponent: GraphComponent,
    subGraphComponent: GraphComponent,
    subGraphDialog: HTMLDialogElement,
    timeAccessorFunction: (edge: IEdge) => Date,
    timescaleContainerID: string,
    unitHeight?: number
  ) {
    this.graphComponent = graphComponent
    this.subGraphComponent = subGraphComponent
    this.timeAccessorFunction = timeAccessorFunction

    if (unitHeight) {
      this.coordinateMapping.unitHeight = unitHeight
    }

    this.collectDateLimits()

    this.eventTimelineLayout = new EventTimelineLayout(
      this.xDomain,
      this.coordinateMapping,
      (edge: LayoutEdge): Date => new Date((edge.tag as EdgeTag).time)
    )
    this.sortEdges()
    this.setNodeGroups()
    this.eventTimelineLayout.viewNodeGroups = this.nodeGroups
    this.updateColorMap()

    this.edgeAggregator = new EdgeAggregator(
      this.graphComponent.graph,
      this.getEdgeDate.bind(this),
      this.doEdgesShareNodeTermini.bind(this)
    )
    this.styleManager = new StyleManager(
      this.graphComponent.graph,
      this.edgeColorMap,
      this.getNodeGroupName.bind(this),
      this.getEdgeGroupName.bind(this),
      'NodeGroups'
    )
    this.styleManager.generateStyles()

    this.graphComponent.graphModelManager.hierarchicalNestingPolicy =
      HierarchicalNestingPolicy.NODES
    this.graphComponent.graphModelManager.edgeGroup.above(
      this.graphComponent.graphModelManager.nodeGroup
    )
    this.graphComponent.viewportLimiter.policy = ViewportLimitingPolicy.UNRESTRICTED
    this.graphComponent.contentMargins = new Insets(0)
    this.configureLabelModel()
    this.determineYUnits()
    void this.runLayout('0s')

    this.timescale = new TimeScale({
      containerId: timescaleContainerID,
      visibleRange: this.calculateVisibleRange(this.graphComponent.viewport),
      edgeTickDates: this.graphComponent.graph.edges
        .filter(representativeFilter)
        .map((e) => this.timeAccessorFunction(e))
        .toArray(),
      onEdgeTickHover: (date) => {
        const affected = this.dateEdgeMap.get(date.getTime())
        if (affected) {
          this.interactionManager.highlightFromTick(affected, true)
        }
      },
      onEdgeTickUnhover: () => this.interactionManager.clearHighlights(),
      onRangeSelect: (start, end) =>
        this.changeResolution2D(
          new Rect(
            this.coordinateMapping.timeToX(start),
            this.graphComponent.viewport.y,
            this.coordinateMapping.timeToX(end) - this.coordinateMapping.timeToX(start),
            this.graphComponent.viewport.height
          )
        )
    })
    this.hyperEdgeGraph = new SubGraph(
      this.subGraphComponent,
      this.graphComponent,
      subGraphDialog,
      this.styleManager,
      this.hyperEdgeCallback.bind(this)
    )
    this.interactionManager = new InteractionManager({
      graphComponent: this.graphComponent,
      richInteraction: true,
      timescale: this.timescale,
      edgeAggregator: this.edgeAggregator,
      timeAccessorFunction: this.timeAccessorFunction,
      timeToPositionFunction: this.coordinateMapping.timeToX.bind(this),
      callbacks: {
        onChangeResolution1D: this.changeResolution1D.bind(this),
        onChangeResolution2D: this.changeResolution2D.bind(this),
        onCollapseNodeGroup: this.collapseNodeGroup.bind(this),
        onHyperEdgeClicked: this.hyperEdgeGraph.hyperEdgeGroupClicked.bind(this.hyperEdgeGraph),
        onDragging: this.dragging.bind(this)
      }
    })
    this.interactionManager.configure()

    this.sortNodes()
    this.styleManager.setNodeStyle(this.nodeGroups)
    this.styleManager.setEdgeLabelStyle()
    this.updateStyles()
    void this.resetZoom('0s')
  }
  /**
   * Transforms a given world y-coordinate into its corresponding view y-coordinate.
   * @param worldPosY The world y-coordinate to be mapped to view coordinates.
   * @param stretch The stretch factor to be used in transforming the coordinates.
   * @private
   * @returns A number representing the transformed world y-coordinate in view coordinates.
   */
  private mapPositionToYUnits(
    worldPosY: number,
    stretch = this.coordinateMapping.stretchY
  ): number {
    return worldPosY / (this.coordinateMapping.unitHeight * stretch)
  }

  /**
   * Transforms given y-units in world coordinates to view coordinates.
   * @param units The y-coordinate in world coordinates
   * @param stretch The stretch factor to be used in the coordinate transformation
   * @private
   * @returns A number representing the transformed view y-coordinate in world coordinates.
   */
  private mapYUnitsToPosition(units: number, stretch = this.coordinateMapping.stretchY): number {
    return units * this.coordinateMapping.unitHeight * stretch
  }

  /**
   * Updates all edge and node styles in the visualization.
   * @private
   */
  private updateStyles(): void {
    this.updateNodeTag()
    this.edgeAggregator.aggregateEdges(this.sortedEdges)
    this.edgeAggregator.updateEdgeMapping(this.sortedEdges)
    this.styleManager.updateEdgeStyle(this.edgeAggregator)
  }

  /**
   * Sorts edges stored in the EventTimeline object based on their timestamps.
   * @private
   */
  private sortEdges(): void {
    this.sortedEdges = this.graphComponent.graph.edges
      .filter(representativeFilter)
      .toSorted((a, b) => this.getEdgeDate(a).getTime() - this.getEdgeDate(b).getTime())
  }

  /**
   * Gets the timestamp (stored in an edge's tag) as a Date object.
   * @param edge The edge whose timestamp we wish to extract.
   * @private
   * @returns The timestamp of the specified edge as a Date object.
   */
  private getEdgeDate(edge: IEdge): Date {
    return new Date((edge.tag as Record<string, string>).time)
  }

  /**
   * Sorts the nodes contained in the EventTimeline object by their layout,
   * i.e., by their (center) y coordinates
   * @private
   */
  private sortNodes(): void {
    this.sortedNodes = this.graphComponent.graph.nodes.toSorted(
      (nodeA: INode, nodeB: INode) => nodeA.layout.centerY - nodeB.layout.centerY
    )
  }

  /**
   * Associates nodes to their corresponding node groups, stored in the node's
   * tag. The result hereof are stored in the nodeGroups field of the EventTimeline object.
   * @private
   */
  private setNodeGroups(): void {
    this.nodeGroups = {}
    this.graphComponent.graph.nodes
      .groupBy((n) => this.getNodeGroupName(n))
      .forEach(([group, nodes]) => {
        this.nodeGroups[group] = { nodes: nodes.toArray(), id: group.toString(), collapsed: false }
      })
  }

  /**
   * Extracts the group (name) of a node from its tag.
   * @param node The node whose group (name) is to be extracted.
   * @private
   * @returns A string describing the specified node's group (name).
   */
  private getNodeGroupName(node: INode): string {
    return String((node.tag as Record<string, unknown>)['group'] ?? 'Ungrouped')
  }

  /**
   * Extracts an edge's group (name) from its tag.
   * @param edge The edge whose group (name) is to be extracted.
   * @private
   * @returns A string describing the specified edge's group (name).
   */
  private getEdgeGroupName(edge: IEdge): string | undefined {
    return String((edge.tag as Record<string, unknown>)['group'])
  }

  /**
   * Clears and subsequently populate the edge color map using the specified
   * or default color set.
   * @private
   */
  private updateColorMap(): void {
    this.edgeColorMap.clear()
    Object.keys(this.nodeGroups).forEach((group, i) => {
      this.edgeColorMap.set(
        group,
        TIMELINE_CONSTANTS.DEFAULT_COLORS[i % TIMELINE_CONSTANTS.DEFAULT_COLORS.length]
      )
    })
  }

  /**
   * Populates the date edge map, the x domain, as well as the coordinate
   * mapping's t0 (in ms) point.
   * @private
   */
  private collectDateLimits(): void {
    // Collect at dates
    this.dateEdgeMap.clear()
    this.graphComponent.graph.edges.filter(representativeFilter).forEach((edge) => {
      const date = this.timeAccessorFunction(edge).getTime()
      if (!this.dateEdgeMap.has(date)) this.dateEdgeMap.set(date, [])
      this.dateEdgeMap.get(date)!.push(edge)
    })
    const dates = Array.from(this.dateEdgeMap.keys())

    // Specify the x domain
    this.xDomain = [new Date(Math.min(...dates)), new Date(Math.max(...dates))]

    // Center time origin at the midpoint of the data.
    const minMs = this.xDomain[0].getTime()
    const maxMs = this.xDomain[1].getTime()
    this.coordinateMapping.t0Ms = Math.round((minMs + maxMs) * 0.5)
  }

  /**
   * Runs the (animated) layout algorithm.
   * @param duration The duration of the layout animation (default = 0.2s).
   */
  async runLayout(
    duration: TimeSpan | TimeSpanConvertible = TimeSpan.fromSeconds(0.2)
  ): Promise<void> {
    await this.graphComponent.applyLayoutAnimated({
      layout: this.eventTimelineLayout,
      animationDuration: duration,
      animateViewport: false
    })
  }

  /**
   * Calculates the visible time range currently visible on screen.
   * @param viewport The viewport's rectangle whose time range we wish to calculate.
   * @param stretchX The current x stretch factor.
   * @private
   * @returns An array of two dates describing the minimum and maximum date on screen.
   */
  private calculateVisibleRange(
    viewport: Rect,
    stretchX: number = this.coordinateMapping.stretchX
  ): [Date, Date] {
    return [
      this.coordinateMapping.xToTime(viewport.x, stretchX),
      this.coordinateMapping.xToTime(viewport.x + viewport.width, stretchX)
    ]
  }

  /**
   * Calculates value bounds of all items
   */
  private getBounds(): Rect {
    const nodeCenters = this.graphComponent.graph.nodes.map((node: INode) => node.layout.centerY)
    const yMinMax = nodeCenters.reduce(
      (acc, val) => {
        if (val < acc.min) acc.min = val
        if (val > acc.max) acc.max = val
        return acc
      },
      { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
    )
    const start = this.coordinateMapping.timeToX(this.xDomain[0])
    const end = this.coordinateMapping.timeToX(this.xDomain[1])
    return new Rect(start, yMinMax.min, end - start, yMinMax.max - yMinMax.min)
  }

  /**
   * Zooms in or out in one-dimension, i.e., only horizontally or vertically.
   * @param delta The mouse-wheel change (to be scaled by the zoom sensitivity).
   * @param dir The direction of the change, i.e., horizontal or vertical.
   * @param evtPos The mouse cursor's position in 2D space.
   * @private
   */
  async changeResolution1D(delta: number, dir: ChangeDirection, evtPos?: Point): Promise<void> {
    const ZOOM_SENSITIVITY = 0.02
    const factor = Math.pow(this.graphComponent.mouseWheelZoomFactor, -delta * ZOOM_SENSITIVITY)

    const stretchX = this.coordinateMapping.stretchX
    const stretchY = this.coordinateMapping.stretchY
    if (dir === 'horizontal') {
      await this.applyResolutionAnimation(
        [stretchX, stretchX * factor],
        [stretchY, stretchY],
        '0.05s',
        evtPos
      )
    } else {
      await this.applyResolutionAnimation(
        [stretchX, stretchX],
        [stretchY, stretchY * factor],
        '0.05s',
        evtPos
      )
    }
  }

  /**
   * Zooms in/out both horizontally and vertically simultaneously.
   * @param rect The rectangle describing the new viewport.
   * @param duration The duration of the animation (default value of 2.5s)
   * @private
   */
  private async changeResolution2D(
    rect: Rect,
    duration: TimeSpanConvertible = '2.5s'
  ): Promise<void> {
    if (rect.width <= 0 || rect.height <= 0) return
    this.interactionManager.clearHighlights()

    const oldViewport = this.graphComponent.viewport
    const viewW = oldViewport.width
    const viewH = oldViewport.height

    /**
     * Calculates the fixed point of two lines.
     * @param p1 The first line.
     * @param p2 The second line.
     * @returns The number describing the fixed point of the two lines.
     */
    function calcFixPoint(
      p1: [start: number, length: number],
      p2: [start: number, length: number]
    ): number {
      const d = p1[1] / p2[1] / (1 - p1[1] / p2[1])
      return p1[0] + (p1[0] - p2[0]) * d
    }

    /**
     * Calculates the fixed point of two rectangles.
     * @param fromRect The first rectangle.
     * @param toRect The second rectangle.
     * @returns The fixed point of the two rectangles.
     */
    function getFixPoint(fromRect: Rect, toRect: Rect): Point {
      // find common origin from which the rects can be projected onto each other
      return new Point(
        fromRect.width === toRect.width
          ? toRect.centerX
          : calcFixPoint([fromRect.x, fromRect.width], [toRect.x, toRect.width]),
        fromRect.height === toRect.height
          ? toRect.centerY
          : calcFixPoint([fromRect.y, fromRect.height], [toRect.y, toRect.height])
      )
    }

    // Scale so the selected rect fills the viewport
    const factorX = viewW / rect.width
    const factorY = viewH / rect.height
    const startStretchX = this.coordinateMapping.stretchX
    const startStretchY = this.coordinateMapping.stretchY

    await this.applyResolutionAnimation(
      [startStretchX, startStretchX * factorX],
      [startStretchY, startStretchY * factorY],
      duration,
      getFixPoint(oldViewport, rect)
    )
  }

  /**
   * Resets the zoom level such that the whole graph is in view again.
   * @param duration The duration of the animation (default value of 1s).
   */
  async resetZoom(duration: TimeSpanConvertible = '1s'): Promise<void> {
    this.graphComponent.updateContentBounds()
    const bounds = this.getBounds()
    await this.changeResolution2D(
      bounds.getEnlarged({
        top: bounds.height * 0.2,
        right: bounds.width * 0.05,
        bottom: bounds.height * 0.1,
        left: bounds.width * 0.1
      }),
      duration
    )
  }

  /**
   * Animates a change in resolution, i.e., zooming in and out.
   * @param stretchX The current x stretch factor.
   * @param stretchY The current y stretch factor.
   * @param duration The duration of the animation.
   * @param fixPoint The fixed point of the current and new viewports.
   * @private
   */
  private async applyResolutionAnimation(
    stretchX: [from: number, to: number],
    stretchY: [from: number, to: number],
    duration: TimeSpanConvertible,
    fixPoint?: Point
  ): Promise<void> {
    const animateTimescale = stretchX[0] !== stretchX[1]
    if (stretchX[1] < 0.00001 || stretchY[1] < 0.00001) {
      return
    }
    try {
      /**
       * A linear interpolation between a start and end point over t steps.
       * @param start The start point (number) of the interpolation.
       * @param end The end point (number) of the interpolation.
       * @param t The interpolation step t.
       */
      const interpolateLinear = (start: number, end: number, t: number): number => {
        if (t <= 0) {
          return start
        }
        if (t >= 1) {
          return end
        }
        return (1 - t) * start + t * end
      }

      /**
       * An exponential interpolation between the current and new zoom level.
       * @param start The start zoom level (number)
       * @param end The end zoom level (number).
       * @param t The interpolation step t.
       */
      const interpolateZoom = (start: number, end: number, t: number): number => {
        if (start !== end) {
          if (t <= 0) {
            return start
          }
          if (t >= 1) {
            return end
          }
          return Math.exp(interpolateLinear(Math.log(start), Math.log(end), t))
        } else {
          return start
        }
      }

      fixPoint ??= this.graphComponent.viewport.center
      const fixViewPoint = this.graphComponent.worldToViewCoordinates(fixPoint)

      const viewPointTime = this.coordinateMapping.xToTime(fixPoint.x, stretchX[0])
      const yWorld = this.mapPositionToYUnits(fixPoint.y, stretchY[0])

      const timescaleUpdatingViewportAnim = IAnimation.fromHandler((t) => {
        // check the stretch value we are currently at
        const currentStretchX = interpolateZoom(stretchX[0], stretchX[1], t)
        const currentStretchY = interpolateZoom(stretchY[0], stretchY[1], t)
        this.coordinateMapping.stretchX = currentStretchX
        this.coordinateMapping.stretchY = currentStretchY
        this.graphComponent.graph.applyLayout(this.eventTimelineLayout)

        const worldForViewPointTime = this.coordinateMapping.timeToX(viewPointTime, currentStretchX)
        const yUnitForPosition = this.mapYUnitsToPosition(yWorld, currentStretchY)

        const viewForViewPointTime = this.graphComponent.worldToViewCoordinates(
          new Point(worldForViewPointTime, yUnitForPosition)
        )

        const error = fixViewPoint.subtract(viewForViewPointTime).multiply(this.graphComponent.zoom)
        this.graphComponent.viewPoint = this.graphComponent.viewPoint.subtract(error)

        if (animateTimescale) {
          this.timescale.renderTimescaleAtInterval(
            this.calculateVisibleRange(this.graphComponent.viewport, currentStretchX)
          )
        }
      }, duration)

      await new Animator({
        canvasComponent: this.graphComponent,
        allowUserInteraction: false
      }).animate(timescaleUpdatingViewportAnim.createEasedAnimation())
    } finally {
      this.updateStyles()
      this.graphComponent.updateContentBounds()
      this.determineYUnits()
    }
  }

  /**
   * Updates all node tags in the graph, specifically their visibility status.
   * @private
   */
  private updateNodeTag(): void {
    let prevNode: INode | null = null
    this.sortedNodes.forEach((currNode: INode) => {
      ;(currNode.tag as NodeTag).visible = true
      if (prevNode) {
        const prevLabel = prevNode.labels.at(0)
        const currLabel = currNode.labels.at(0)
        if (
          prevLabel &&
          currLabel &&
          currLabel.layout.center.y - prevLabel.layout.center.y <
            TIMELINE_CONSTANTS.NODE_LABEL_HEIGHT
        ) {
          ;(prevNode.tag as NodeTag).visible = false
          ;(currNode.tag as NodeTag).visible = false
        }
      }
      prevNode = currNode
    })
  }

  /**
   * Collapses a node group (that has been clicked).
   * @param node The node (that has been clicked) whose node group is to be collapsed.
   * @private
   */
  private async collapseNodeGroup(node: INode): Promise<void> {
    try {
      const group = this.nodeGroups[this.getNodeGroupName(node)]!
      group.collapsed = !group.collapsed
      group.nodes.forEach((n) =>
        n.labels.forEach((l) => {
          if (
            l.style instanceof ViewportLockedLabelStyle &&
            'cssClass' in l.style.wrappedStyle &&
            typeof l.style.wrappedStyle.cssClass === 'string'
          ) {
            l.style.wrappedStyle.cssClass = group.collapsed
              ? l.style.wrappedStyle.cssClass + ' hidden'
              : l.style.wrappedStyle.cssClass.replace(' hidden', '')
          }
        })
      )
      this.determineYUnits()
      await this.runLayout('1s')
    } finally {
      this.updateStyles()
      this.graphComponent.updateContentBounds()
    }
  }

  /**
   * Determines the number of y-units in the drawing, i.e., the number of
   * (uncollapsed) nodes and (uncollapsed) node groups. The number of y-units is then utilized to
   * calculate the unit height as a function of the total canvas height.
   * @private
   */
  private determineYUnits(): void {
    // Determine the number of node groups
    const nNodeGroups: number = Object.keys(this.nodeGroups).length

    // Determine the number of uncollapsed nodes
    const unCollapsedNodes = Object.values(this.nodeGroups).reduce(
      (nNodes: number, nodeGroup: NodeGroup<INode> | undefined): number => {
        if (!nodeGroup?.collapsed) {
          nNodes += nodeGroup?.nodes.length ?? 0
        }
        return nNodes
      },
      0
    )

    // Determine the number of uncollapsed node groups
    const nUncollapsedGroups = Object.values(this.nodeGroups).reduce(
      (nUncollapsedGroups: number, nodeGroup: NodeGroup<INode> | undefined): number => {
        if (!nodeGroup?.collapsed) {
          nUncollapsedGroups += 1
        }
        return nUncollapsedGroups
      },
      0
    )

    // Calculate the number of units along the x-axis
    this.coordinateMapping.yUnits = Math.max(
      unCollapsedNodes - nUncollapsedGroups + (nNodeGroups - 1) * 2,
      1
    )
  }

  /**
   * Configures the edge label model, i.e., to ensure the labels always
   * "stick" to the top of the drawing, regardless of the zoom level.
   * @private
   */
  private configureLabelModel(): void {
    this.graphComponent.graph.edgeLabels.forEach((l) =>
      this.graphComponent.graph.setLabelLayoutParameter(
        l,
        new TopEdgeLabelModel(-40).createParameter()
      )
    )
  }

  /**
   * Drags, i.e., pans, the canvas in an animated fashion.
   * @private
   */
  private async dragging(): Promise<void> {
    this.timescale.armAnimation(this.calculateVisibleRange(this.graphComponent.viewport))
    this.timescale.animate(1)
  }

  /**
   * Visually centers a clicked hyperedge in the viewport.
   * @param upperY The largest y-coordinate of the clicked hyperedge.
   * @param lowerY The lowest y-coordinate of the clicked hyperedge.
   * @param bundle The clicked hyperedge bundle.
   * @private
   * @returns A changedResolution2D function object with an animation duration of 1s.
   */
  private async hyperEdgeCallback(
    upperY: number,
    lowerY: number,
    bundle: AggregatedEdgeGroup
  ): Promise<void> {
    const newVP = new Rect(
      bundle.edgeRange[0].sourcePort.location.x - this.graphComponent.viewport.width * 0.5,
      upperY - (lowerY - upperY) * 0.1,
      this.graphComponent.viewport.width,
      lowerY - upperY + (lowerY - upperY) * 0.2
    )
    return this.changeResolution2D(newVP, '1s')
  }

  /**
   * Checks whether two edges share a source/target node, i.e. a terminus.
   * @param edgeA The first IEdge object to be checked.
   * @param edgeB The second IEdge object to be checked.
   * @private
   * @returns A boolean indicating whether the two edges share a node terminus.
   */
  private doEdgesShareNodeTermini(edgeA: IEdge, edgeB: IEdge): boolean {
    return (
      edgeA.sourceNode === edgeB.sourceNode ||
      edgeA.sourceNode === edgeB.targetNode ||
      edgeA.targetNode === edgeB.targetNode ||
      edgeA.targetNode === edgeB.sourceNode
    )
  }
}
