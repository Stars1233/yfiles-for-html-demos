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
  ExteriorNodeLabelModel,
  type IEdge,
  IEdgeStyle,
  type IGraph,
  type ILabelStyle,
  type INode,
  type INodeStyle,
  Insets,
  type LinearGradient,
  PolylineEdgeStyle,
  Stroke
} from '@yfiles/yfiles'
import type { EdgeColorMode, NodeGroup } from '../EventTimelineTypes'
import { ItemState } from '../EventTimelineTypes'
import type { EventTimelineConfig } from '../EventTimelineConfig'
import { ViewportWidthNodeStyle } from '../styles/ViewportWidthNodeStyle'
import { ViewportLockedLabelStyle } from '../styles/ViewportLockedLabelStyle'
import { SimpleGradientDelegatingEdgeStyle } from '../styles/SimpleGradientDelegatingEdgeStyle'
import { LevelOfDetailLabelStyle } from '../styles/LevelOfDetailLabelStyle'
import { representativeFilter } from '../EventTimelineUtils'
import type { EdgeAggregator } from './EdgeAggregator'
import { EventTimelineEdgeEndsStyle } from '../styles/EventTimelineEdgeEndsStyle'
import { EventTimelineAggregatedEdgesStyle } from '../styles/EventTimelineAggregatedEdgesStyle'
import { EventTimelineHyperEdgeStyle } from '../styles/EventTimelineHyperEdgeStyle'
import { TopEdgeLabelModel } from '../layout/TopEdgeLabelModel'

/**
 * The StyleManager object, responsible for managing the styles of edges and (different types of)
 * edges.
 */
export class StyleManager {
  gradients: Map<string, LinearGradient> = new Map()
  private readonly graph: IGraph
  private readonly edgeColorMap: Map<string, string>
  private readonly getNodeGroupName: (node: INode) => string
  private readonly getEdgeGroupName: (edge: IEdge) => string | undefined
  private readonly edgeColorMode: EdgeColorMode
  private readonly config: EventTimelineConfig
  private readonly sharedNodeStyle: INodeStyle
  private readonly sharedNodeLabelStyle: ILabelStyle
  private readonly sharedEdgeLabelStyle: ILabelStyle
  private readonly sharedSimpleEdgeStyle: IEdgeStyle
  private readonly sharedAggregatedEdgeStyle: IEdgeStyle
  private readonly sharedHyperEdgeStyle: IEdgeStyle

  /**
   * Instantiates a new StyleManager object.
   * @param graph The IGraph object to be visualized.
   * @param edgeColorMap A map describing which groups are to be colored using what color.
   * @param getNodeGroupName An accessor function to extract a node's group name from its tag.
   * @param getEdgeGroupName An accessor function to extract an edge's group name from its tag.
   * @param config The configuration that governs the aesthetics and behavior of the timeline.
   */
  constructor(
    graph: IGraph,
    edgeColorMap: Map<string, string>,
    getNodeGroupName: (node: INode) => string,
    getEdgeGroupName: (edge: IEdge) => string | undefined,
    config: EventTimelineConfig
  ) {
    this.graph = graph
    this.edgeColorMap = edgeColorMap
    this.getNodeGroupName = getNodeGroupName
    this.getEdgeGroupName = getEdgeGroupName
    this.config = config
    this.edgeColorMode = config.edgeColorMode
    this.sharedNodeStyle = new ViewportWidthNodeStyle()
    this.sharedNodeLabelStyle = new ViewportLockedLabelStyle(
      new LevelOfDetailLabelStyle('horizontal', this.config),
      'horizontal'
    )
    this.sharedEdgeLabelStyle = new ViewportLockedLabelStyle(
      new LevelOfDetailLabelStyle('vertical', this.config),
      'vertical',
      new Insets(this.config.timescaleHeight + 10, 10, 10, 10)
    )
    this.sharedSimpleEdgeStyle = new CompositeEdgeStyle(
      new SimpleGradientDelegatingEdgeStyle(
        new PolylineEdgeStyle({
          stroke: new Stroke({ thickness: this.config.edgeThickness }),
          cssClass: 'event-timeline-edge'
        }),
        this.generateNodeToColorMap(),
        this.gradients
      ),
      new EventTimelineEdgeEndsStyle(
        this.config.edgeThickness,
        this.config.edgeRadius,
        this.generateNodeToColorMap()
      )
    )
    this.sharedAggregatedEdgeStyle = new EventTimelineAggregatedEdgesStyle(
      this.config.edgeRadius + 3,
      this.config.edgeAggregationDelta,
      this.generateNodeToColorMap(),
      this.gradients
    )
    this.sharedHyperEdgeStyle = new EventTimelineHyperEdgeStyle(
      this.config.edgeRadius,
      this.config.edgeAggregationDelta,
      this.generateNodeToColorMap(),
      this.gradients
    )
  }

  /**
   * Applies the node and node label styles to all nodes in the graph.
   */
  setNodeStyle(): void {
    this.graph.nodes.forEach((node: INode): void => {
      const nodeGroup: string | undefined = this.getNodeGroupName(node)
      const nodeColor: string = nodeGroup
        ? (this.edgeColorMap.get(nodeGroup) ?? this.config.defaultColors[0])
        : this.config.defaultColors[0]
      const state = node.lookup(ItemState)
      if (state) {
        state.nodeColor = nodeColor
      }

      this.graph.setStyle(node, this.sharedNodeStyle)

      node.labels.forEach((label) => {
        this.graph.setLabelLayoutParameter(label, ExteriorNodeLabelModel.LEFT)
        const labelState = label.lookup(ItemState)
        if (labelState) {
          labelState.nodeColor = nodeColor
          labelState.labelHidden = state?.visible === false
        }
        this.graph.setStyle(label, this.sharedNodeLabelStyle)
      })
    })
  }

  /**
   * Method with which to update all edges' styles.
   * @param edgeAggregator The edgeAggregator which determines whether edges are aggregated or not
   * based on their horizontal positions.
   */
  updateEdgeStyle(edgeAggregator: EdgeAggregator): void {
    this.graph.edges
      .filter((e) => representativeFilter(e))
      .forEach((edge) => {
        const { colorA, colorB } = this.getEdgeColors(edge)
        const state = edge.lookup(ItemState)
        if (state) {
          state.edgeColorA = colorA
          state.edgeColorB = colorB
          state.edgeKind = 'simple'
        }
        this.graph.setStyle(edge, this.sharedSimpleEdgeStyle)
      })

    edgeAggregator.representativeAggregateEdges.forEach((edge): void => {
      const group = edge.lookup(ItemState)!.representedGroup!
      const state = edge.lookup(ItemState)
      if (state) {
        state.edgeKind = 'aggregate'
      }

      this.graph.setStyle(edge, this.sharedAggregatedEdgeStyle)

      group.edges.forEach((groupEdge: IEdge): void => {
        this.graph.setStyle(groupEdge, IEdgeStyle.VOID_EDGE_STYLE)
      })
    })

    edgeAggregator.representativeHyperEdges.forEach((edge: IEdge): void => {
      const group = edge.lookup(ItemState)!.representedGroup!
      const state = edge.lookup(ItemState)
      if (state) {
        state.edgeKind = 'hyper'
      }
      this.graph.setStyle(edge, this.sharedHyperEdgeStyle)
      group.edges.forEach((groupEdge: IEdge): void => {
        this.graph.setStyle(groupEdge, IEdgeStyle.VOID_EDGE_STYLE)
      })
    })
  }

  /**
   * Updates the visibility of labels for a given node group based on its collapsed state.
   * @param group The node group.
   */
  updateGroupLabelVisibility(group: NodeGroup<INode>): void {
    group.nodes.forEach((n) =>
      n.labels.forEach((l) => {
        const state = l.lookup(ItemState)
        if (state) {
          state.labelHidden = group.collapsed
        }
      })
    )
  }

  /**
   * Method with which to set the edge label style.
   */
  setEdgeLabelStyle(): void {
    const parameter = new TopEdgeLabelModel(-40).createParameter()
    this.graph.edges
      .filter((e) => representativeFilter(e))
      .forEach((edge) => {
        const { colorA } = this.getEdgeColors(edge)
        const edgeState = edge.lookup(ItemState)
        if (edgeState) {
          edgeState.edgeColorA = colorA
        }
        edge.labels.forEach((label) => {
          const labelState = label.lookup(ItemState)
          if (labelState) {
            labelState.edgeColorA = colorA
            labelState.labelHidden = edgeState?.visible === false
          }
          this.graph.setStyle(label, this.sharedEdgeLabelStyle)
          this.graph.setLabelLayoutParameter(label, parameter)
        })
      })
  }

  getSharedNodeStyle(): INodeStyle {
    return this.sharedNodeStyle
  }

  getSharedSimpleEdgeStyle(): IEdgeStyle {
    return this.sharedSimpleEdgeStyle
  }

  getSharedNodeLabelStyle(): ILabelStyle {
    return this.sharedNodeLabelStyle
  }

  getSharedEdgeLabelStyle(): ILabelStyle {
    return this.sharedEdgeLabelStyle
  }

  /**
   * Method with which to get an edge's color as a function of the selected edge color mode and its
   * group's assigned color in the edge color map.
   * @param edge The IEdge whose color is to be extracted.
   * @private
   * @returns Two colors, colorA and colorB, which describe the edge's start and end color.
   */
  private getEdgeColors(edge: IEdge): { colorA: string; colorB: string | undefined } {
    let colorA: string, colorB: string | undefined
    const group = this.getEdgeGroupName(edge)
    colorA = this.config.defaultColors[0]
    if (this.edgeColorMode === 'EdgeGroups' && group) {
      colorA = this.edgeColorMap.get(group) ?? this.config.defaultColors[0]
    } else if (this.edgeColorMode === 'NodeGroups' || this.edgeColorMode === 'NodeGroupsInverted') {
      const sG = this.getNodeGroupName(edge.sourceNode)
      const tG = this.getNodeGroupName(edge.targetNode)
      if (sG && tG) {
        if (sG === tG) {
          colorA = this.edgeColorMap.get(sG) ?? this.config.defaultColors[0]
        } else {
          colorA =
            (this.edgeColorMode === 'NodeGroupsInverted'
              ? this.edgeColorMap.get(tG)
              : this.edgeColorMap.get(sG)) ?? this.config.defaultColors[0]
          colorB =
            (this.edgeColorMode === 'NodeGroupsInverted'
              ? this.edgeColorMap.get(sG)
              : this.edgeColorMap.get(tG)) ?? this.config.defaultColors[0]
        }
      }
    }
    return { colorA, colorB }
  }

  /**
   * Method with which to generate a node color map, i.e., a map that takes as input some node and returns a string
   * describing its color.
   */
  generateNodeToColorMap(): (node: INode) => string {
    return (node: INode): string =>
      this.edgeColorMap.get(this.getNodeGroupName(node)) || this.config.defaultColors[0]
  }
}
