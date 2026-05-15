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
  ExteriorNodeLabelModel,
  type IEdge,
  IEdgeStyle,
  type IGraph,
  type ILabel,
  type INode,
  type LinearGradient,
  PolylineEdgeStyle,
  Stroke
} from '@yfiles/yfiles'
import type { EdgeColorMode, NodeGroups, RepresentativeEdgeTag } from '../EventTimelineTypes'
import { SimpleGradientDelegatingEdgeStyle } from '../styles/SimpleGradientDelegatingEdgeStyle'
import { representativeFilter, TIMELINE_CONSTANTS } from '../EventTimeline'
import { EventTimelineEdgeEndsStyle } from '../styles/EventTimelineEdgeEndsStyle'
import { ViewportWidthNodeStyle } from '../styles/ViewportWidthNodeStyle'
import { ViewportLockedLabelStyle } from '../styles/ViewportLockedLabelStyle'
import type { EdgeAggregator } from './EdgeAggregator'
import { EventTimelineHyperEdgeStyle } from '../styles/EventTimelineHyperEdgeStyle'
import { EventTimelineAggregatedEdgesStyle } from '../styles/EventTimelineAggregatedEdgesStyle'
import { LevelOfDetailLabelStyle } from '../styles/LevelOfDetailLabelStyle'

/**
 * The StyleManager object, responsible for managing the styles of edges and (different types of)
 * edges.
 */
export class StyleManager {
  simpleGradientStyle: CompositeEdgeStyle | undefined
  gradients: Map<string, LinearGradient> = new Map()
  private readonly graph: IGraph
  private readonly edgeColorMap: Map<string, string>
  private readonly getNodeGroupName: (node: INode) => string
  private readonly getEdgeGroupName: (edge: IEdge) => string | undefined
  private readonly edgeColorMode: EdgeColorMode

  /**
   * Instantiates a new StyleManager object.
   * @param graph The IGraph object to be visualized.
   * @param edgeColorMap A map describing which groups are to be colored using what color.
   * @param getNodeGroupName An accessor function to extract a node's group name from its tag.
   * @param getEdgeGroupName An accessor function to extract an edge's group name from its tag.
   * @param edgeColorMode Determines how edges are colored (according to their own group
   * membership, the group membership of their termini, or none).
   */
  constructor(
    graph: IGraph,
    edgeColorMap: Map<string, string>,
    getNodeGroupName: (node: INode) => string,
    getEdgeGroupName: (edge: IEdge) => string | undefined,
    edgeColorMode: EdgeColorMode
  ) {
    this.graph = graph
    this.edgeColorMap = edgeColorMap
    this.getNodeGroupName = getNodeGroupName
    this.getEdgeGroupName = getEdgeGroupName
    this.edgeColorMode = edgeColorMode
  }

  /**
   * Method to generate a new composite edge style.
   */
  generateStyles(): void {
    this.simpleGradientStyle = new CompositeEdgeStyle(
      new SimpleGradientDelegatingEdgeStyle(
        new PolylineEdgeStyle({
          stroke: new Stroke({ thickness: TIMELINE_CONSTANTS.EDGE_THICKNESS }),
          cssClass: 'event-timeline-edge'
        }),
        this.generateNodeToColorMap(),
        this.gradients,
        TIMELINE_CONSTANTS.CSS_VAR_PREFIX
      ),
      new EventTimelineEdgeEndsStyle(
        TIMELINE_CONSTANTS.EDGE_THICKNESS,
        TIMELINE_CONSTANTS.EDGE_RADIUS,
        this.generateNodeToColorMap(),
        TIMELINE_CONSTANTS.CSS_VAR_PREFIX
      )
    )
  }

  /**
   * Method to set the node style.
   * @param nodeGroups An unused NodeGroups object.
   */
  setNodeStyle(nodeGroups: NodeGroups<INode>): void {
    const lineNodeStyle = new ViewportWidthNodeStyle('event-timeline-node')
    this.graph.nodes.forEach((node: INode): void => {
      const nodeGroup: string | undefined = this.getNodeGroupName(node)
      const nodeColor: string = nodeGroup
        ? this.edgeColorMap.get(nodeGroup)!
        : TIMELINE_CONSTANTS.DEFAULT_NODE_COLOR
      this.graph.setStyle(node, lineNodeStyle.clone())
      node.labels.forEach((label) => {
        this.graph.setLabelLayoutParameter(label, ExteriorNodeLabelModel.LEFT)
        this.graph.setStyle(
          label,
          new ViewportLockedLabelStyle(
            new LevelOfDetailLabelStyle('horizontal', 'event-timeline-node-label', '', nodeColor),
            'horizontal'
          )
        )
      })
    })
  }

  /**
   * Method with which to update all edges' styles.
   * @param edgeAggregator The edgeAggregator which determines whether edges are aggregated or not
   * based on their horizontal positions.
   */
  updateEdgeStyle(edgeAggregator: EdgeAggregator): void {
    this.graph.edges.filter(representativeFilter).forEach((edge) => {
      const { colorA, colorB } = this.getEdgeColors(edge)
      if (!colorB) {
        this.graph.setStyle(
          edge,
          new CompositeEdgeStyle(
            new PolylineEdgeStyle({
              stroke: new Stroke(this.getEdgeColorMix(colorA), TIMELINE_CONSTANTS.EDGE_THICKNESS),
              cssClass: 'event-timeline-edge'
            }),
            new EventTimelineEdgeEndsStyle(
              TIMELINE_CONSTANTS.EDGE_THICKNESS,
              TIMELINE_CONSTANTS.EDGE_RADIUS,
              this.generateNodeToColorMap(),
              TIMELINE_CONSTANTS.CSS_VAR_PREFIX
            )
          )
        )
      } else {
        this.graph.setStyle(edge, this.simpleGradientStyle!)
      }
    })

    edgeAggregator.representativeAggregateEdges.forEach((edge): void => {
      const group = (edge.tag as RepresentativeEdgeTag).representedGroup!
      const radius = 5

      this.graph.setStyle(
        edge,
        new EventTimelineAggregatedEdgesStyle(
          group.edges,
          radius + 3,
          TIMELINE_CONSTANTS.EDGE_AGGREGATION_DELTA,
          this.generateNodeToColorMap(),
          this.gradients,
          'event-timeline-aggregate-edge'
        )
      )

      group.edges.forEach((groupEdge: IEdge): void => {
        this.graph.setStyle(groupEdge, IEdgeStyle.VOID_EDGE_STYLE)
      })
    })

    edgeAggregator.representativeHyperEdges.forEach((edge: IEdge): void => {
      const group = (edge.tag as RepresentativeEdgeTag).representedGroup!
      this.graph.setStyle(
        edge,
        new EventTimelineHyperEdgeStyle(
          group.edges,
          TIMELINE_CONSTANTS.EDGE_RADIUS,
          TIMELINE_CONSTANTS.EDGE_AGGREGATION_DELTA,
          this.generateNodeToColorMap(),
          this.gradients,
          'event-timeline-hyper-edge'
        )
      )
      group.edges.forEach((groupEdge: IEdge): void => {
        this.graph.setStyle(groupEdge, IEdgeStyle.VOID_EDGE_STYLE)
      })
    })
  }

  /**
   * Method with which to set the edge label style.
   */
  setEdgeLabelStyle(): void {
    const LODStyle = new LevelOfDetailLabelStyle('vertical', 'event-timeline-edge-label')
    this.graph.edges.filter(representativeFilter).forEach((edge: IEdge): void => {
      edge.labels.forEach((label: ILabel): void => {
        this.graph.setStyle(label, new ViewportLockedLabelStyle(LODStyle, 'vertical'))
      })
    })
  }

  /**
   * Method with which to get an edge's color as a function of the selected edge color mode and its
   * group's assigned color in the edge color map.
   * @param edge The IEdge whose color is to be extracted.
   * @private
   * @returns Two colors, colorA and colorB, which describe the edge's start and end color.
   */
  private getEdgeColors(edge: IEdge): { colorA: string | undefined; colorB: string | undefined } {
    let colorA: string | undefined, colorB: string | undefined
    const group = this.getEdgeGroupName(edge)
    if (this.edgeColorMode === 'EdgeGroups' && group) {
      colorA = this.edgeColorMap.get(group)
    } else if (this.edgeColorMode === 'NodeGroups' || this.edgeColorMode === 'NodeGroupsInverted') {
      const sG = this.getNodeGroupName(edge.sourceNode)
      const tG = this.getNodeGroupName(edge.targetNode)
      if (sG && tG) {
        if (sG === tG) {
          colorA = this.edgeColorMap.get(sG)
        } else {
          colorA =
            this.edgeColorMode === 'NodeGroupsInverted'
              ? this.edgeColorMap.get(tG)
              : this.edgeColorMap.get(sG)
          colorB =
            this.edgeColorMode === 'NodeGroupsInverted'
              ? this.edgeColorMap.get(sG)
              : this.edgeColorMap.get(tG)
        }
      }
    }
    return { colorA, colorB }
  }

  /**
   * Given a color, calculate the mix of said color with the canvas' background color.
   * @param color The (possible undefined) color as a string.
   * @private
   * @returns The mixed color as a string.
   */
  private getEdgeColorMix(color: string | undefined): CssFill {
    const base =
      color ??
      `var(--${TIMELINE_CONSTANTS.CSS_VAR_PREFIX}-edge-color, '${TIMELINE_CONSTANTS.EDGE_BASE_COLOR}')`
    return new CssFill(
      `color-mix(in oklab, ${base} var(--${TIMELINE_CONSTANTS.CSS_VAR_PREFIX}-edge-color-value, 100%), var(--${TIMELINE_CONSTANTS.CSS_VAR_PREFIX}-background-color, ${TIMELINE_CONSTANTS.BACKGROUND_COLOR}) var(--${TIMELINE_CONSTANTS.CSS_VAR_PREFIX}-background-color-value, 0%)`
    )
  }

  /**
   * Method with which to generate a node color map, i.e., a map that takes as input some node and returns a string
   * describing its color.
   */
  generateNodeToColorMap(): (node: INode) => string {
    return (node: INode): string => this.edgeColorMap.get(this.getNodeGroupName(node))!
  }
}
