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
  type EdgesSource,
  GraphBuilder,
  type GraphComponent,
  type IEdge,
  type INode,
  type NodesSource
} from '@yfiles/yfiles'
import type { Data } from '../EventTimelineTypes'
import { ItemState } from '../EventTimelineTypes'
import { TopEdgeLabelModel } from '../layout/TopEdgeLabelModel'
import type { ResolvedEventTimelineOptions } from '../EventTimelineOptions'

/**
 * Owns the GraphBuilder-backed graph construction for the event timeline.
 */
export class TimelineGraphBuilderAdapter {
  private graphBuilder!: GraphBuilder
  private nodesSource!: NodesSource<unknown>
  private edgesSource!: EdgesSource<unknown>
  private resolvedEventTimelineOptions!: ResolvedEventTimelineOptions
  private readonly nodeLabelAccessor: (node: INode) => string

  private readonly edgeLabelAccessor: (edge: IEdge) => string

  private readonly nodeIdAccessor: (nodeData: unknown) => string | number

  private readonly edgeIdAccessor: (edgeData: unknown) => string | number

  private readonly edgeSourceIdAccessor: (edgeData: unknown) => string | number

  private readonly edgeTargetIdAccessor: (edgeData: unknown) => string | number

  constructor(
    nodeLabelAccessor: (node: INode) => string,
    edgeLabelAccessor: (edge: IEdge) => string,
    nodeIdAccessor: (nodeData: unknown) => string | number,
    edgeIdAccessor: (edgeData: unknown) => string | number,
    edgeSourceIdAccessor: (edgeData: unknown) => string | number,
    edgeTargetIdAccessor: (edgeData: unknown) => string | number,
    resolvedEventTimelineOptions: ResolvedEventTimelineOptions
  ) {
    this.edgeTargetIdAccessor = edgeTargetIdAccessor
    this.edgeSourceIdAccessor = edgeSourceIdAccessor
    this.edgeIdAccessor = edgeIdAccessor
    this.nodeIdAccessor = nodeIdAccessor
    this.edgeLabelAccessor = edgeLabelAccessor
    this.nodeLabelAccessor = nodeLabelAccessor
    this.resolvedEventTimelineOptions = resolvedEventTimelineOptions
  }

  initialize(graphComponent: GraphComponent): void {
    this.graphBuilder = new GraphBuilder(graphComponent.graph)

    this.nodesSource = this.graphBuilder.createNodesSource<unknown>({
      data: [],
      id: (nodeData) => this.nodeIdAccessor(nodeData),
      tag: (nodeData) => nodeData,
      layout: () => [0, 0, 1, this.resolvedEventTimelineOptions.config.nodeHeight]
    })
    // createLabelBinding receives raw data; adapt by wrapping in a minimal tag-carrying object
    this.nodesSource.nodeCreator.createLabelBinding((nodeData) =>
      this.nodeLabelAccessor({ tag: nodeData } as unknown as INode)
    )
    this.nodesSource.nodeCreator.addEventListener('node-created', (evt) => {
      const state = evt.item.lookup(ItemState)
      if (state) {
        state.visible = false
      }
    })

    this.edgesSource = this.graphBuilder.createEdgesSource<unknown>({
      data: [],
      sourceId: (edgeData) => this.edgeSourceIdAccessor(edgeData),
      targetId: (edgeData) => this.edgeTargetIdAccessor(edgeData),
      id: (edgeData) => this.edgeIdAccessor(edgeData),
      tag: (edgeData) => edgeData
    })
    const labelBinding = this.edgesSource.edgeCreator.createLabelBinding((edgeData) =>
      this.edgeLabelAccessor({ tag: edgeData } as unknown as IEdge)
    )
    labelBinding.layoutParameterProvider = () => new TopEdgeLabelModel(-40).createParameter()

    this.edgesSource.edgeCreator.addEventListener('edge-created', (evt) => {
      const state = evt.item.lookup(ItemState)
      if (state) {
        state.visible = true
      }
    })
    this.edgesSource.edgeCreator.addEventListener('edge-updated', (evt) => {
      this.edgesSource.edgeCreator.updateLabels(evt.graph, evt.item, evt.dataItem)
    })
  }

  setData(data: Data): void {
    this.graphBuilder.setData(this.nodesSource, data.nodes)
    this.graphBuilder.setData(this.edgesSource, data.edges)
    this.graphBuilder.updateGraph()
  }
}
