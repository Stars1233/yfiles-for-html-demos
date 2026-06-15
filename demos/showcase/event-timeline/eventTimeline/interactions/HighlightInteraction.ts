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
  EdgeStyleIndicatorRenderer,
  type GraphComponent,
  GraphItemTypes,
  type GraphViewerInputMode,
  IEdge,
  ILabel,
  INode,
  Insets,
  LabelStyleIndicatorRenderer,
  NodeStyleIndicatorRenderer,
  PolylineEdgeStyle,
  Stroke
} from '@yfiles/yfiles'
import type { EdgeAggregator } from '../components/EdgeAggregator'
import type { TimeScale } from '../components/Timescale'
import type { EventTimelineConfig } from '../EventTimelineConfig'
import type { AggregatedEdgeGroup } from '../EventTimelineTypes'
import { ItemState } from '../EventTimelineTypes'
import { EventTimelineEdgeEndsStyle } from '../styles/EventTimelineEdgeEndsStyle'
import { SimpleGradientDelegatingEdgeStyle } from '../styles/SimpleGradientDelegatingEdgeStyle'
import { LevelOfDetailLabelStyle } from '../styles/LevelOfDetailLabelStyle'
import { ViewportLockedLabelStyle } from '../styles/ViewportLockedLabelStyle'
import { ViewportWidthNodeStyle } from '../styles/ViewportWidthNodeStyle'
import { representativeFilter } from '../EventTimelineUtils'

export class HighlightInteraction {
  private highlightedEdgeRepresentatives: Array<IEdge> = []

  readonly graphComponent: GraphComponent

  private readonly config: EventTimelineConfig

  private readonly richInteraction: boolean

  private readonly edgeAggregator?: EdgeAggregator

  private readonly timescale?: TimeScale

  private readonly timeAccessorFunction?: (edge: IEdge) => Date

  constructor(
    graphComponent: GraphComponent,
    config: EventTimelineConfig,
    richInteraction: boolean,
    edgeAggregator?: EdgeAggregator,
    timescale?: TimeScale,
    timeAccessorFunction?: (edge: IEdge) => Date
  ) {
    this.timeAccessorFunction = timeAccessorFunction
    this.timescale = timescale
    this.edgeAggregator = edgeAggregator
    this.richInteraction = richInteraction
    this.config = config
    this.graphComponent = graphComponent
  }

  configure(): void {
    this.configureHighlighting()
  }

  clearHighlights(): void {
    if (this.richInteraction) {
      this.timescale!.highlightEdgeTicks = []
      this.highlightedEdgeRepresentatives.forEach((edge) => {
        const state = edge.lookup(ItemState)
        if (state) {
          state.highlighted = false
        }
      })
      this.graphComponent.invalidate()
      this.timescale!.renderMarkers()
    }
    this.graphComponent.graph.nodes.forEach((node) => {
      const state = node.lookup(ItemState)
      if (state) {
        state.highlightedAdjacent = false
      }
    })
    this.graphComponent.highlights.clear()
  }

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
    newTickHighlights.sort((a, b) => a.time.getTime() - b.time.getTime())
    this.timescale!.highlightEdgeTicks = newTickHighlights
    this.timescale!.renderMarkers()
  }

  private configureHighlighting(): void {
    const horizontalLabelRenderer = new LabelStyleIndicatorRenderer({
      labelStyle: createHighlightLabelStyle(
        new ViewportLockedLabelStyle(
          new LevelOfDetailLabelStyle('horizontal', this.config),
          'horizontal'
        )
      ),
      zoomPolicy: 'world-coordinates'
    })
    const verticalLabelRenderer = new LabelStyleIndicatorRenderer({
      labelStyle: createHighlightLabelStyle(
        new ViewportLockedLabelStyle(
          new LevelOfDetailLabelStyle('vertical', this.config),
          'vertical',
          new Insets(this.config.timescaleHeight + 10, 10, 10, 10)
        )
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
        nodeStyle: new ViewportWidthNodeStyle(true),
        margins: 0,
        zoomPolicy: 'world-coordinates'
      })
    )
    graph.decorator.edges.highlightRenderer.addConstant(
      new EdgeStyleIndicatorRenderer({
        zoomPolicy: 'world-coordinates',
        edgeStyle: new CompositeEdgeStyle(
          new SimpleGradientDelegatingEdgeStyle(
            new PolylineEdgeStyle({
              stroke: new Stroke({ thickness: this.config.edgeThickness + 2 }),
              cssClass: 'event-timeline-edge highlight'
            }),
            this.generateHighlightEdgeColor,
            new Map(),
            false
          ),
          new EventTimelineEdgeEndsStyle(
            this.config.edgeThickness + 2,
            this.config.edgeRadius + 3,
            () => 'var(--yfiles-event-timeline-highlight-edge-color, #d9bb7d)'
          )
        )
      })
    )

    const gvim = this.graphComponent.inputMode as GraphViewerInputMode
    gvim.itemHoverInputMode.hoverItems = GraphItemTypes.ALL
    gvim.itemHoverInputMode.addEventListener('hovered-item-changed', (evt) => {
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
            .filter((e) => representativeFilter(e as IEdge))
            .toArray() as IEdge[],
          false
        )
      }
    })
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

  private highlightNode(node: INode): void {
    this.graphComponent.highlights.add(node)
    const edges = this.graphComponent.graph
      .edgesAt(node)
      .filter((e) => representativeFilter(e))
      .toArray()
    edges.forEach((edge) => {
      this.highlightEdge(edge, true)
      edge.labels.forEach((label) => this.graphComponent.highlights.add(label))
    })
    node.labels.forEach((label) => this.graphComponent.highlights.add(label))

    if (this.richInteraction) {
      this.highlightFromTick(edges, false)
    }
  }

  private highlightEdge(edge: IEdge, indirect = false): void {
    let bundle: AggregatedEdgeGroup | null = null

    if (this.richInteraction) {
      if (
        this.edgeAggregator!.representativeAggregateEdges.includes(edge) ||
        this.edgeAggregator!.representativeHyperEdges.includes(edge)
      ) {
        bundle = edge.lookup(ItemState)!.representedGroup!
      }
    }

    const highlights = this.graphComponent.highlights
    if (bundle) {
      this.highlightedEdgeRepresentatives.push(edge)
      const state = edge.lookup(ItemState)
      if (state) {
        state.highlighted = true
      }
      this.graphComponent.invalidate()
      bundle.edges.forEach((e) => {
        highlights.add(e.sourceNode)
        highlights.add(e.targetNode)
        e.sourceNode.labels.forEach((l) => highlights.add(l))
        e.targetNode.labels.forEach((l) => highlights.add(l))
        e.labels.forEach((l) => highlights.add(l))
      })
    } else {
      highlights.add(edge)

      if (!highlights.includes(edge.sourceNode) && indirect) {
        const sourceState = edge.sourceNode.lookup(ItemState)
        if (sourceState) {
          sourceState.highlightedAdjacent = true
        }
      }
      highlights.add(edge.sourceNode)
      if (!highlights.includes(edge.targetNode) && indirect) {
        const targetState = edge.targetNode.lookup(ItemState)
        if (targetState) {
          targetState.highlightedAdjacent = true
        }
      }
      highlights.add(edge.targetNode)
      edge.sourceNode.labels.forEach((l) => highlights.add(l))
      edge.targetNode.labels.forEach((l) => highlights.add(l))
      edge.labels.forEach((l) => highlights.add(l))
    }
  }

  private generateHighlightEdgeColor = (): string =>
    'var(--yfiles-event-timeline-highlight-edge-color, #d9bb7d)'
}

function createHighlightLabelStyle(style: ViewportLockedLabelStyle): ViewportLockedLabelStyle {
  const wrappedStyle = style.wrappedStyle
  if (wrappedStyle instanceof LevelOfDetailLabelStyle) {
    wrappedStyle.textLabelStyle.cssClass = `${wrappedStyle.cssPrefix}-${
      wrappedStyle.orientation === 'vertical' ? 'edge-label' : 'node-label'
    } highlight`
    wrappedStyle.lineLabelStyle.cssClass = `${wrappedStyle.cssPrefix}-${
      wrappedStyle.orientation === 'vertical' ? 'edge-label' : 'node-label'
    }-collapsed highlight`
  }
  return style
}
