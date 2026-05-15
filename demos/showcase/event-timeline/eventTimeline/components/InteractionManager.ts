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
  CompositeEdgeStyle,
  CssFill,
  EdgeStyleIndicatorRenderer,
  EventRecognizers,
  type GraphComponent,
  GraphItemTypes,
  type GraphViewerInputMode,
  type HoveredItemChangedEventArgs,
  IEdge,
  ILabel,
  INode,
  LabelStyleIndicatorRenderer,
  type MarqueeSelectionEventArgs,
  MarqueeSelectionInputMode,
  MouseWheelBehaviors,
  NodeStyleIndicatorRenderer,
  Point,
  PointerButtons,
  PointerEventArgs,
  PointerEventType,
  PolylineEdgeStyle,
  Rect,
  Stroke,
  TimeSpan
} from '@yfiles/yfiles'
import type { TimeScale } from './Timescale'
import type {
  AggregatedEdgeGroup,
  ChangeDirection,
  EdgeTag,
  NodeTag,
  RepresentativeEdgeTag
} from '../EventTimelineTypes'
import { EventTimelineHyperEdgeStyle } from '../styles/EventTimelineHyperEdgeStyle'
import { EventTimelineAggregatedEdgesStyle } from '../styles/EventTimelineAggregatedEdgesStyle'
import type { EdgeAggregator } from './EdgeAggregator'
import { ViewportLockedLabelStyle } from '../styles/ViewportLockedLabelStyle'
import { representativeFilter, TIMELINE_CONSTANTS } from '../EventTimeline'
import { ViewportWidthNodeStyle } from '../styles/ViewportWidthNodeStyle'
import { EventTimelineEdgeEndsStyle } from '../styles/EventTimelineEdgeEndsStyle'
import { MarqueeRectangleRenderer } from './MarqueeRectangleRenderer'
import { LevelOfDetailLabelStyle } from '../styles/LevelOfDetailLabelStyle'

type InteractionManagerArgs =
  | {
      graphComponent: GraphComponent
      richInteraction: true
      callbacks: {
        onChangeResolution1D: (delta: number, dir: ChangeDirection, pos?: Point) => Promise<void>
        onChangeResolution2D: (rect: Rect) => Promise<void>
        onCollapseNodeGroup: (node: INode) => Promise<void>
        onHyperEdgeClicked: (bundle: AggregatedEdgeGroup) => Promise<void>
        onDragging: () => Promise<void>
      }
      timescale: TimeScale
      edgeAggregator: EdgeAggregator
      timeAccessorFunction: (edge: IEdge) => Date
      timeToPositionFunction: (date: Date) => number
    }
  | { graphComponent: GraphComponent; richInteraction: false }

/**
 * The InteractionManager object is responsible for managing all user interactions with the
 * event timeline visualization.
 */
export class InteractionManager {
  private highlightedEdgeRepresentatives: Array<IEdge> = []
  private readonly graphComponent: GraphComponent
  private readonly timescale?: TimeScale
  private readonly edgeAggregator?: EdgeAggregator
  private readonly timeAccessorFunction?: (edge: IEdge) => Date
  private readonly timeToPositionFunction?: (date: Date) => number
  private readonly richInteraction: boolean // New flag
  private readonly callbacks?: {
    onChangeResolution1D: (delta: number, dir: ChangeDirection, pos?: Point) => Promise<void>
    onChangeResolution2D: (rect: Rect) => Promise<void>
    onCollapseNodeGroup: (node: INode) => Promise<void>
    onHyperEdgeClicked: (bundle: AggregatedEdgeGroup) => Promise<void>
    onDragging: () => Promise<void>
  }

  /**
   * Instantiates a new InteractionManager object.
   * @param args The user-specified InteractionManagerArgs.
   */
  constructor(args: InteractionManagerArgs) {
    this.graphComponent = args.graphComponent

    this.richInteraction = args.richInteraction
    if (args.richInteraction) {
      this.timescale = args.timescale
      this.edgeAggregator = args.edgeAggregator
      this.timeAccessorFunction = args.timeAccessorFunction
      this.timeToPositionFunction = args.timeToPositionFunction
      this.callbacks = args.callbacks
    }
  }

  /**
   * Configure all user interactions.
   */
  configure(): void {
    this.configureHighlighting()
    const inputMode = this.graphComponent.inputMode as GraphViewerInputMode

    inputMode.addEventListener('query-item-tool-tip', (evt): void => {
      if (evt.handled) return
      const hyperEdges: Array<IEdge> = this.edgeAggregator?.representativeHyperEdges ?? []
      const aggregatedEdges: Array<IEdge> = this.edgeAggregator?.representativeAggregateEdges ?? []
      if (
        evt.item instanceof IEdge &&
        !hyperEdges.includes(evt.item) &&
        !aggregatedEdges.includes(evt.item)
      ) {
        // Tooltip for a simple (non-hyper/non-aggregated) edge
        evt.toolTip = this.createEdgeToolTip(evt.item)
      } else if (evt.item instanceof IEdge && hyperEdges.includes(evt.item)) {
        // Tooltip for HyperEdge(s)
        evt.toolTip = this.createHyperEdgeToolTip(evt.item)
      } else if (evt.item instanceof IEdge && aggregatedEdges.includes(evt.item)) {
        // Tooltip for Aggregated Edge(s)
        evt.toolTip = this.createAggregatedEdgeToolTip(evt.item)
      } else if (evt.item instanceof INode) {
        // Tooltip for a simple (non-collapsed) node
        evt.toolTip = this.createNodeToolTip(evt.item)
      } else if (evt.item instanceof ILabel) {
        // Tooltip for owner of labels
        const owner = evt.item.owner
        if (owner instanceof INode && (owner.tag as NodeTag).visible) {
          evt.toolTip = this.createNodeToolTip(owner)
        } else if (owner instanceof IEdge && (owner.tag as EdgeTag).visible) {
          evt.toolTip = this.createEdgeToolTip(owner)
        }
      }
      evt.handled = true
    })
    // Only configure complex inputs if interactive

    if (this.richInteraction) {
      this.configureMarqueeZoom()
      this.graphComponent.mouseWheelBehavior = MouseWheelBehaviors.NONE
      // block pinching
      this.graphComponent.minimumZoom = 1.0
      this.graphComponent.maximumZoom = 1.0

      inputMode.waitInputMode.waitCursor = 'default'

      inputMode.moveViewportInputMode.addEventListener('dragging', async () => {
        await this.callbacks!.onDragging()
      })

      this.graphComponent.addEventListener('wheel', async (evt) => {
        evt.preventDefault()
        if (!inputMode.waitInputMode.waiting) {
          const delta = evt.wheelDeltaY
          await this.callbacks!.onChangeResolution1D(
            delta,
            evt.ctrlKey ? 'vertical' : 'horizontal',
            evt.location
          )
        }
      })

      inputMode.addEventListener('item-clicked', async (evt) => {
        evt.handled = true
        const item = evt.item
        if (item instanceof IEdge && item.style instanceof EventTimelineAggregatedEdgesStyle) {
          const bundle = (item.tag as RepresentativeEdgeTag).representedGroup
          const nodes = bundle.edges.flatMap((edge) => [
            edge.sourceNode.layout.centerY,
            edge.targetNode.layout.centerY
          ])
          const yMinMax = nodes.reduce(
            (acc, val) => {
              if (val < acc.min) acc.min = val
              if (val > acc.max) acc.max = val
              return acc
            },
            { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
          )
          const coordRange = bundle.edgeRange.map((edge) =>
            this.timeToPositionFunction!(this.timeAccessorFunction!(edge))
          )
          const height = yMinMax.max - yMinMax.min
          const bounds = new Rect(
            coordRange[0],
            yMinMax.min,
            coordRange[1] - coordRange[0],
            height
          ).getEnlarged([height * 0.1, (coordRange[1] - coordRange[0]) * 0.1])
          await this.callbacks!.onChangeResolution2D(bounds)
        } else if (item instanceof INode) {
          await this.callbacks!.onCollapseNodeGroup(item)
        } else if (item instanceof ILabel && item.owner instanceof INode) {
          await this.callbacks!.onCollapseNodeGroup(item.owner)
        }
        if (item instanceof IEdge && this.edgeAggregator!.representativeHyperEdges.includes(item)) {
          const bundle = (item.tag as RepresentativeEdgeTag).representedGroup
          this.clearHighlights()
          await this.callbacks!.onHyperEdgeClicked(bundle)
        }
      })

      const toolTipInputMode = inputMode.toolTipInputMode
      toolTipInputMode.toolTipLocationOffset = new Point(15, 15)
      toolTipInputMode.delay = TimeSpan.fromMilliseconds(500)
      toolTipInputMode.duration = TimeSpan.fromSeconds(50)
    }
  }

  /**
   * For the interactively displayed edge/node context menu, add a separator between two other
   * HTMLDivElements.
   * @private
   * @returns A separator HTMLDivElement.
   */
  private createPropertySeparator(): HTMLDivElement {
    const separator: HTMLDivElement = document.createElement('div')
    separator.classList.add('separator')
    return separator
  }

  /**
   * For the interactively displayed edge/node context menu, add a property title.
   * @param title A string describing the title to be added.
   * @private
   * @returns A title HTMLDivElement.
   */
  private createPropertyTitle(title: string): HTMLDivElement {
    // Add Title (Label of Node)
    const titleDiv = document.createElement('h3')
    titleDiv.classList.add('title')
    titleDiv.textContent = title
    return titleDiv
  }

  /**
   * Create an interactively displayed hyperedge context tool tip.
   * @param edge The IEdge object that currently moused over
   * @private
   * @returns The tool tip content.
   */
  private createHyperEdgeToolTip(edge: IEdge): HTMLElement {
    // Initialize the new tool tip content HTMLDiv
    const toolTipContent: HTMLDivElement = document.createElement('div')

    // Get Hyper Edge Tag and its contents
    const edgeTag: RepresentativeEdgeTag = edge.tag as RepresentativeEdgeTag
    const edges: Array<IEdge> = edgeTag.representedGroup.edges

    // Add Title (Label of Node)
    toolTipContent.appendChild(this.createPropertyTitle('Hyper Edge'))

    // Add Edge Type and  Information
    const nTypes: number = new Set(edges.map((e: IEdge): string => (e.tag as EdgeTag).type)).size
    toolTipContent.appendChild(this.createPropertyRow('#Edges', edges.length.toString()))
    toolTipContent.appendChild(this.createPropertyRow('#Types', nTypes.toString()))

    // Add Separator
    toolTipContent.appendChild(this.createPropertySeparator())

    // Add Time of Hyperedge(s)
    const timeStamp = new Date(edgeTag.time)
    toolTipContent.appendChild(this.createPropertyDateRow(timeStamp))
    toolTipContent.appendChild(this.createPropertyTimeRow(timeStamp))
    return toolTipContent
  }

  /**
   * For the interactively displayed edge/node tool tip menu, add a row displaying the selected
   * item's timestamp in hours, minutes, and seconds.
   * @param timeStamp The timestamp Date object the time of which is to be displayed.
   * @private
   * @returns The created time property row.
   */
  private createPropertyTimeRow(timeStamp: Date): HTMLElement {
    const hours = (timeStamp.getUTCHours() < 10 ? '0' : '') + timeStamp.getUTCHours()
    const minutes = (timeStamp.getUTCMinutes() < 10 ? '0' : '') + timeStamp.getUTCMinutes()
    const seconds = (timeStamp.getUTCSeconds() < 10 ? '0' : '') + timeStamp.getUTCSeconds()
    const time = `${hours}:${minutes}:${seconds}`
    return this.createPropertyRow('Time', time)
  }

  /**
   * For the interactively displayed edge/node tool tip menu, add a row describing the timestamp's
   * date.
   * @param timeStamp The selected time stamp (as a Date object).
   * @private
   * @returns A Date property row.
   */
  private createPropertyDateRow(timeStamp: Date): HTMLElement {
    return this.createPropertyRow('Date', timeStamp.toLocaleDateString())
  }

  /**
   * Create a tool tip for a hovered node.
   * @param node The node over which the user is currently hovering.
   * @private
   * @returns The tool tip content for the selected node.
   */
  private createNodeToolTip(node: INode): HTMLElement {
    // Extract node tag
    const nodeTag: NodeTag = node.tag as NodeTag

    // Initialize the new tool tip content HTMLDiv
    const toolTipContent: HTMLDivElement = document.createElement('div')

    // Add Title (Label of Node)
    const title = document.createElement('h3')
    title.classList.add('title')
    title.textContent = nodeTag.label
    toolTipContent.appendChild(title)

    // Add Group Information
    toolTipContent.appendChild(this.createPropertyRow('Group', nodeTag.group))

    // Add Degree Information
    const nodeDegree: number = this.graphComponent.graph.degree(node)
    toolTipContent.appendChild(this.createPropertyRow('Degree', nodeDegree.toString()))

    // Add Separator
    toolTipContent.appendChild(this.createPropertySeparator())

    // Add First Edge Information
    const firstEdge: IEdge = this.graphComponent.graph
      .edgesAt(node)
      .reduce((acc: IEdge, cur: IEdge): IEdge => {
        const curTime: Date = new Date((cur.tag as EdgeTag).time)
        const accTime: Date = new Date((acc.tag as EdgeTag).time)
        if (curTime < accTime) {
          acc = cur
        }
        return acc
      })
    const firstEdgeTimeStamp = new Date((firstEdge.tag as EdgeTag).time)
    toolTipContent.appendChild(this.createPropertyRowHeader('First Edge'))
    toolTipContent.appendChild(this.createPropertyDateRow(firstEdgeTimeStamp))
    toolTipContent.appendChild(this.createPropertyTimeRow(firstEdgeTimeStamp))

    // Add Separator
    toolTipContent.appendChild(this.createPropertySeparator())

    // Add Last Edge Information
    const lastEdge: IEdge = this.graphComponent.graph
      .edgesAt(node)
      .reduce((acc: IEdge, cur: IEdge): IEdge => {
        const curTime: Date = new Date((cur.tag as EdgeTag).time)
        const accTime: Date = new Date((acc.tag as EdgeTag).time)
        if (curTime > accTime) {
          acc = cur
        }
        return acc
      })
    const lastEdgeTimeStamp = new Date((lastEdge.tag as EdgeTag).time)
    toolTipContent.appendChild(this.createPropertyRowHeader('Last Edge'))
    toolTipContent.appendChild(this.createPropertyDateRow(lastEdgeTimeStamp))
    toolTipContent.appendChild(this.createPropertyTimeRow(lastEdgeTimeStamp))

    return toolTipContent
  }

  /**
   * Create a tool tip for a hovered edge.
   * @param edge The edge over which the user is currently hovering.
   * @private
   * @returns The tool tip content for the selected edge.
   */
  private createEdgeToolTip(edge: IEdge): HTMLDivElement {
    const edgeTag: EdgeTag = edge.tag as EdgeTag
    const toolTipContent: HTMLDivElement = document.createElement('div')

    const title = document.createElement('h3')
    title.classList.add('title')
    title.textContent = edgeTag.label
    toolTipContent.appendChild(title)

    const sourceNode = this.graphComponent.graph.nodes.find(
      (node: INode) => (node.tag as NodeTag).id === edgeTag.source
    )
    if (sourceNode) {
      const sourceNodeLabel = (sourceNode.tag as NodeTag).label
      toolTipContent.appendChild(this.createPropertyRow('Source', sourceNodeLabel))
    }

    const targetNode = this.graphComponent.graph.nodes.find(
      (node: INode) => (node.tag as NodeTag).id === edgeTag.target
    )
    if (targetNode) {
      const targetNodeLabel = (targetNode.tag as NodeTag).label
      toolTipContent.appendChild(this.createPropertyRow('Target', targetNodeLabel))
    }

    toolTipContent.appendChild(this.createPropertySeparator())

    const timeStamp = new Date(edgeTag.time)
    toolTipContent.appendChild(this.createPropertyRow('Date', timeStamp.toLocaleDateString()))
    toolTipContent.appendChild(this.createPropertyTimeRow(timeStamp))

    return toolTipContent
  }

  /**
   * Create a header of a row for the tool tip popover.
   * @param header A string describing the content of the header.
   * @private
   * @returns The row header.
   */
  private createPropertyRowHeader(header: string): HTMLDivElement {
    const rowHeader = document.createElement('h4')
    rowHeader.classList.add('row-header')
    rowHeader.textContent = header
    return rowHeader
  }

  private createPropertyRow(rowTitle: string, rowContent: string): HTMLDivElement {
    const container = document.createElement('div')
    container.classList.add('row')
    const title = document.createElement('p')
    title.textContent = rowTitle
    title.classList.add('row-title')
    container.appendChild(title)
    const content = document.createElement('p')
    content.textContent = rowContent
    content.classList.add('row-content')
    container.appendChild(content)
    return container
  }

  /**
   * Configure the various highlighting in the visualization.
   * @private
   */
  private configureHighlighting(): void {
    const horizontalLabelRenderer = new LabelStyleIndicatorRenderer({
      labelStyle: new ViewportLockedLabelStyle(
        new LevelOfDetailLabelStyle('horizontal', 'event-timeline-node-label', 'highlight'),
        'horizontal'
      ),
      zoomPolicy: 'world-coordinates'
    })
    const verticalLabelRenderer = new LabelStyleIndicatorRenderer({
      labelStyle: new ViewportLockedLabelStyle(
        new LevelOfDetailLabelStyle('vertical', 'event-timeline-edge-label', 'highlight'),
        'vertical'
      ),
      zoomPolicy: 'world-coordinates',
      margins: [1]
    })

    const graph = this.graphComponent.graph
    graph.decorator.labels.highlightRenderer.addFactory((label: ILabel) => {
      if (label.owner instanceof INode) return horizontalLabelRenderer
      if (label.owner instanceof IEdge) {
        return verticalLabelRenderer
      }
      return null
    })
    graph.decorator.nodes.highlightRenderer.addConstant(
      new NodeStyleIndicatorRenderer({
        nodeStyle: new ViewportWidthNodeStyle('event-timeline-node highlight'),
        margins: 0,
        zoomPolicy: 'world-coordinates'
      })
    )
    const edgeFill = new CssFill(
      `color-mix(in oklab, var(--${TIMELINE_CONSTANTS.CSS_VAR_PREFIX}-highlight-edge-color, '${TIMELINE_CONSTANTS.HIGHLIGHT_EDGE_COLOR}') var(--${TIMELINE_CONSTANTS.CSS_VAR_PREFIX}-highlight-edge-color-value, 100%), var(--${TIMELINE_CONSTANTS.CSS_VAR_PREFIX}-background-color, ${TIMELINE_CONSTANTS.BACKGROUND_COLOR}) var(--${TIMELINE_CONSTANTS.CSS_VAR_PREFIX}-background-color-value, 0%)`
    )
    graph.decorator.edges.highlightRenderer.addConstant(
      new EdgeStyleIndicatorRenderer({
        zoomPolicy: 'world-coordinates',
        edgeStyle: new CompositeEdgeStyle(
          new PolylineEdgeStyle({
            stroke: new Stroke(edgeFill, TIMELINE_CONSTANTS.HIGHLIGHT_EDGE_THICKNESS),
            cssClass: 'event-timeline-edge highlight'
          }),
          new EventTimelineEdgeEndsStyle(
            TIMELINE_CONSTANTS.HIGHLIGHT_EDGE_THICKNESS,
            TIMELINE_CONSTANTS.HIGHLIGHT_EDGE_RADIUS,
            undefined,
            TIMELINE_CONSTANTS.CSS_VAR_PREFIX + '-highlight',
            'event-timeline-edge highlight'
          )
        )
      })
    )

    const gvim = this.graphComponent.inputMode as GraphViewerInputMode
    gvim.itemHoverInputMode.hoverItems = GraphItemTypes.ALL
    gvim.itemHoverInputMode.addEventListener(
      'hovered-item-changed',
      (evt: HoveredItemChangedEventArgs) => {
        this.clearHighlights()
        const item = evt.item
        if (!item) return

        if (item instanceof INode) this.highlightNode(item)
        else if (item instanceof IEdge) this.highlightEdge(item)
        else if (item instanceof ILabel) {
          if (item.owner instanceof INode) this.highlightNode(item.owner)
          else if (item.owner instanceof IEdge) this.highlightEdge(item.owner)
        }
        if (this.richInteraction) {
          this.highlightFromTick(
            this.graphComponent.highlights
              .filter((h) => h instanceof IEdge)
              .filter(representativeFilter)
              .toArray(),
            false
          )
        }
      }
    )
    this.graphComponent.highlights.addEventListener('item-added', () => {
      this.graphComponent.renderTree.highlightGroup.toArray().forEach((rte) => {
        if (rte.tag instanceof INode) {
          rte.toBack()
        } else {
          rte.toFront()
        }
      })
    })
  }

  /**
   * Clear all highlights.
   */
  clearHighlights(): void {
    // Skip bundle-specific CSS logic and timescale markers if not interactive
    if (this.richInteraction) {
      this.timescale!.highlightEdgeTicks = []
      this.highlightedEdgeRepresentatives.forEach((b) => {
        const style = b.style as EventTimelineAggregatedEdgesStyle
        if (style.cssClass) {
          style.cssClass = style.cssClass.replace(' highlight', '')
        }
      })
      this.timescale!.renderMarkers()
    }
    this.graphComponent.graph.nodes.forEach((node) => {
      const tag = node.tag as NodeTag
      tag.highlightedAdjacent = false
    })
    this.graphComponent.highlights.clear()
  }

  /**
   * Method with which to highlight a node.
   * @param node The node to be highlighted.
   * @private
   */
  private highlightNode(node: INode): void {
    this.graphComponent.highlights.add(node)
    this.graphComponent.graph
      .edgesAt(node)
      .filter(representativeFilter)
      .forEach((edge) => {
        this.highlightEdge(edge, true)
        edge.labels.forEach((label) => this.graphComponent.highlights.add(label))
      })
    node.labels.forEach((label) => this.graphComponent.highlights.add(label))
  }

  /**
   * Method with which to highlight a given edge.
   * @param edge The edge to be highlighted.
   * @param indirect A boolean flag indicating whether the user directly moused over the provided
   * edge or whether the edge is be highlighted owing to its incidence to a selected node.
   * @private
   */
  private highlightEdge(edge: IEdge, indirect: boolean = false): void {
    let bundle: AggregatedEdgeGroup | null = null

    if (this.richInteraction) {
      if (
        this.edgeAggregator!.representativeAggregateEdges.includes(edge) ||
        this.edgeAggregator!.representativeHyperEdges.includes(edge)
      ) {
        bundle = (edge.tag as RepresentativeEdgeTag).representedGroup
      }
    }

    const highlights = this.graphComponent.highlights
    if (bundle) {
      // Logic for Aggregates/HyperEdges
      this.highlightedEdgeRepresentatives.push(edge)
      if (
        edge.style instanceof EventTimelineAggregatedEdgesStyle ||
        edge.style instanceof EventTimelineHyperEdgeStyle
      ) {
        edge.style.cssClass += ' highlight'
      }
      bundle.edges.forEach((e) => {
        highlights.add(e.sourceNode)
        highlights.add(e.targetNode)
        e.sourceNode.labels.forEach((l) => highlights.add(l))
        e.targetNode.labels.forEach((l) => highlights.add(l))
        e.labels.forEach((l) => highlights.add(l))
      })
    } else {
      // Basic logic: highlight edge + its source/target nodes
      highlights.add(edge)

      if (!highlights.includes(edge.sourceNode) && indirect) {
        const sourceTag = edge.sourceNode.tag as NodeTag
        sourceTag.highlightedAdjacent = true
      }
      highlights.add(edge.sourceNode)
      if (!highlights.includes(edge.targetNode) && indirect) {
        const targetTag = edge.targetNode.tag as NodeTag
        targetTag.highlightedAdjacent = true
      }
      highlights.add(edge.targetNode)
      edge.sourceNode.labels.forEach((l) => highlights.add(l))
      edge.targetNode.labels.forEach((l) => highlights.add(l))
      edge.labels.forEach((l) => highlights.add(l))
    }
  }

  /**
   * Method with which to configure the Marquee zoom.
   * @private
   */
  private configureMarqueeZoom(): void {
    const mode = new MarqueeSelectionInputMode({
      marqueeRenderer: new MarqueeRectangleRenderer('time-selection'),
      beginRecognizer: (evt) =>
        evt instanceof PointerEventArgs &&
        evt.buttons === PointerButtons.MOUSE_RIGHT &&
        evt.eventType === PointerEventType.DOWN,
      moveRecognizer: (evt) =>
        evt instanceof PointerEventArgs && evt.eventType === PointerEventType.DRAG,
      finishRecognizer: (evt) =>
        evt instanceof PointerEventArgs &&
        evt.changedButtons === PointerButtons.MOUSE_RIGHT &&
        evt.eventType === PointerEventType.UP,
      cancelRecognizer: (evt, sender) =>
        EventRecognizers.ESCAPE_DOWN(evt, sender) ||
        (evt instanceof PointerEventArgs && evt.eventType === PointerEventType.DRAG_CAPTURE_LOST),
      useViewCoordinates: false
    })
    mode.addEventListener('drag-finished', (args: MarqueeSelectionEventArgs) =>
      this.callbacks!.onChangeResolution2D(args.rectangle)
    )
    ;(this.graphComponent.inputMode as GraphViewerInputMode).add(mode)
  }

  /**
   * Method with which to highlight edges from a timeline tick.
   * @param edges The edges to be highlighted.
   * @param highlightEdge A boolean flag indicating whether to highlight the edges or not.
   */
  highlightFromTick(edges: IEdge[], highlightEdge = true): void {
    const newTickHighlights: { time: Date; yStart: number }[] = []
    edges.forEach((edge) => {
      if (highlightEdge) {
        this.highlightEdge(edge)
      }
      newTickHighlights.push({
        time: this.timeAccessorFunction!(edge),
        yStart: Math.min(
          this.graphComponent.worldToViewCoordinates(edge.sourcePort.location).y,
          this.graphComponent.worldToViewCoordinates(edge.targetPort.location).y
        )
      })
    })

    this.timescale!.highlightEdgeTicks =
      this.timescale!.highlightEdgeTicks.concat(newTickHighlights)
    this.timescale!.renderMarkers()
  }

  /**
   * Method with which to create a tool tip for an aggregated edge that a user hovered over.
   * @param edge The edge over which the user is hovering.
   * @private
   * @returns The tool tip content.
   */
  private createAggregatedEdgeToolTip(edge: IEdge): HTMLDivElement {
    // Initialize
    const toolTipContent: HTMLDivElement = document.createElement('div')

    const edgeTag: RepresentativeEdgeTag = edge.tag as RepresentativeEdgeTag
    const edges: Array<IEdge> = edgeTag.representedGroup.edges
    const range: [IEdge, IEdge] = edgeTag.representedGroup.edgeRange

    // Title of the Tooltip
    toolTipContent.appendChild(this.createPropertyTitle('Connected Component'))

    const nTypes: number = new Set(edges.map((e: IEdge): string => (e.tag as EdgeTag).type)).size
    const nEdges: number = edges.length
    toolTipContent.appendChild(this.createPropertyRow('#Edges', nEdges.toString()))
    toolTipContent.appendChild(this.createPropertyRow('#Types', nTypes.toString()))

    // Separator
    toolTipContent.appendChild(this.createPropertySeparator())

    // First Edge in Connected Component
    const firstEdgeTimeStamp: Date = new Date((range[0].tag as EdgeTag).time)
    toolTipContent.appendChild(this.createPropertyRowHeader('First Edge'))
    toolTipContent.appendChild(this.createPropertyDateRow(firstEdgeTimeStamp))
    toolTipContent.appendChild(this.createPropertyTimeRow(firstEdgeTimeStamp))

    // Separator
    toolTipContent.appendChild(this.createPropertySeparator())

    // Last Edge in Connected Component
    const lastEdgeTimeStamp: Date = new Date((range[0].tag as EdgeTag).time)
    toolTipContent.appendChild(this.createPropertyRowHeader('Last Edge'))
    toolTipContent.appendChild(this.createPropertyDateRow(lastEdgeTimeStamp))
    toolTipContent.appendChild(this.createPropertyTimeRow(lastEdgeTimeStamp))

    return toolTipContent
  }
}
