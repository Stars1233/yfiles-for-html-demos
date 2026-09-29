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
  type GraphComponent,
  GraphCopier,
  GraphViewerInputMode,
  HierarchicalNestingPolicy,
  IEdge,
  ILabel,
  INode,
  IPort
} from '@yfiles/yfiles'
import { SubgraphLayout } from '../layout/SubgraphLayout'
import type { AggregatedEdgeGroup } from '../EventTimelineTypes'
import { ItemState } from '../EventTimelineTypes'
import { initializeEventTimelineGraph } from '../graph/initializeEventTimelineGraph'
import { InteractionManager } from './InteractionManager'
import type { EventTimeline } from '../EventTimeline'

/**
 * A component that visualizes a subgraph in a EventTimeline-style layout.
 * It is typically triggered when a hyperedge in the EventTimeline is clicked.
 */
export class EventTimelineSubgraph {
  private readonly subGraphComponent: GraphComponent
  private readonly subGraphDialog?: HTMLDialogElement
  private readonly host: EventTimeline
  private readonly interactionManager: InteractionManager
  private readonly symmetricXPadding: number = 50
  private readonly labelXPadding: number = 100
  private readonly labelYPadding: number = 50

  /**
   * Instantiates a new EventTimelineSubGraph.
   * @param host The hosting EventTimeline
   * @param subGraphComponent The GraphComponent where the subgraph will be rendered.
   * @param subGraphDialog Optional dialog element to show/hide the subgraph.
   */
  constructor(
    host: EventTimeline,
    subGraphComponent: GraphComponent,
    subGraphDialog?: HTMLDialogElement
  ) {
    this.host = host
    this.subGraphComponent = subGraphComponent
    this.subGraphDialog = subGraphDialog

    this.interactionManager = new InteractionManager({
      graphComponent: this.subGraphComponent,
      richInteraction: false,
      config: host.config,
      nodeLabelAccessor: host.nodeLabelAccessor,
      nodeGroupAccessor: host.nodeGroupAccessor,
      edgeTypeAccessor: host.edgeTypeAccessor,
      timeAccessorFunction: host.timeAccessorFunction
    })
    this.configureGraphComponent()
    this.configureDialog()
  }

  private configureGraphComponent(): void {
    const gcElem = this.subGraphComponent.htmlElement
    gcElem.classList.add('event-timeline-subgraph-component')
    gcElem.setAttribute(
      'style',
      'position: absolute; width: 100%; height: 100%; overflow: hidden; background-color: rgba(255, 255, 255, 0.05);'
    )
    this.subGraphComponent.graphModelManager.hierarchicalNestingPolicy =
      HierarchicalNestingPolicy.NODES
    this.subGraphComponent.graphModelManager.edgeGroup.above(
      this.subGraphComponent.graphModelManager.nodeGroup
    )
    const gvim = new GraphViewerInputMode()
    this.subGraphComponent.inputMode = gvim
    gvim.clickableItems = 'none'
    gvim.selectableItems = 'none'
    gvim.moveViewportInputMode.enabled = false
    this.subGraphComponent.mouseWheelBehavior = 'none'
    initializeEventTimelineGraph({ graphComponent: this.subGraphComponent, itemStates: new Map() })

    this.interactionManager.configure()
  }

  private configureDialog(): void {
    if (this.subGraphDialog) {
      this.subGraphDialog.classList.add('event-timeline-subgraph-dialog')
      this.subGraphDialog.setAttribute('style', 'position: absolute; background: transparent;')
      this.subGraphDialog.addEventListener('click', (e) => {
        const dialogDimensions = this.subGraphDialog!.getBoundingClientRect()
        if (
          e.clientX < dialogDimensions.left ||
          e.clientX > dialogDimensions.right ||
          e.clientY < dialogDimensions.top ||
          e.clientY > dialogDimensions.bottom
        ) {
          this.close()
        }
      })
    }
  }

  close(): void {
    if (this.subGraphDialog) {
      this.subGraphDialog.close()
    }
  }

  /**
   * Shows the subgraph for the given edge bundle.
   */
  async show(bundle: AggregatedEdgeGroup): Promise<void> {
    const dialogWidth = bundle.edges.length * 75 + 2 * this.symmetricXPadding + this.labelXPadding

    const getMainGraphState = (): {
      dialogX: number
      dialogY: number
      dialogHeight: number
      upperY: number
      lowerY: number
      rect: DOMRect
    } => {
      const ys = bundle.edges.flatMap((e) => [e.sourcePort.location.y, e.targetPort.location.y])
      const upperY = Math.min(...ys)
      const lowerY = Math.max(...ys)
      const dialogHeight = lowerY - upperY

      const rect = this.host.graphComponent.htmlElement.getBoundingClientRect()
      const sourcePos = this.host.graphComponent.worldToViewCoordinates([
        bundle.edges[0].sourcePort.location.x,
        upperY
      ])

      const dialogX = sourcePos.x + rect.left - dialogWidth * 0.5
      const dialogY = sourcePos.y + rect.top

      return { dialogX, dialogY, dialogHeight, upperY, lowerY, rect }
    }

    let state = getMainGraphState()

    const isOutOfBounds =
      state.dialogX < state.rect.left ||
      state.dialogX + dialogWidth > state.rect.right ||
      state.dialogY < state.rect.top ||
      state.dialogY + state.dialogHeight > state.rect.bottom

    if (isOutOfBounds) {
      this.host.clearHighlights()
      await this.host.revealHyperEdgeBundle(state.upperY, state.lowerY, bundle)
      state = getMainGraphState()
    }

    if (this.subGraphDialog) {
      Object.assign(this.subGraphDialog.style, {
        left: `${state.dialogX}px`,
        top: `${state.dialogY}px`,
        width: `${dialogWidth}px`,
        height: `${state.dialogHeight}px`
      })
      this.subGraphDialog.showModal()
    }

    this.populateGraph(bundle)

    const graph = this.subGraphComponent.graph
    const nodeOrder = graph.nodes
      .toSorted((a, b) => {
        const idA = this.host.nodeIdAccessor(a.tag)
        const idB = this.host.nodeIdAccessor(b.tag)
        const originalA = this.host.graphComponent.graph.nodes.find(
          (n) => this.host.nodeIdAccessor(n.tag) === idA
        )
        const originalB = this.host.graphComponent.graph.nodes.find(
          (n) => this.host.nodeIdAccessor(n.tag) === idB
        )
        if (!originalA || !originalB) return 0
        return originalA.layout.y - originalB.layout.y
      })
      .toArray()

    graph.applyLayout(
      new SubgraphLayout(
        dialogWidth,
        state.dialogHeight,
        nodeOrder,
        this.symmetricXPadding,
        this.labelXPadding,
        this.labelYPadding,
        this.host.nodeIdAccessor
      )
    )
    this.updateStyles()
  }

  private populateGraph(edgeBundle: AggregatedEdgeGroup): void {
    const graph = this.subGraphComponent.graph
    graph.clear()
    graph.tag = { subgraph: true }
    const nodes = edgeBundle.edges.flatMap((e) => [e.sourceNode, e.targetNode])
    const labels = edgeBundle.edges
      .flatMap((e) => e.labels.toArray())
      .concat(nodes.flatMap((n) => n.labels.toArray()))

    new GraphCopier().copy({
      sourceGraph: this.host.graphComponent.graph,
      targetGraph: graph,
      copyPredicate: (item) =>
        (item instanceof IEdge && edgeBundle.edges.includes(item)) ||
        (item instanceof INode && nodes.includes(item)) ||
        (item instanceof IPort &&
          edgeBundle.edges.some((e) => e.sourcePort === item || e.targetPort === item)) ||
        (item instanceof ILabel && labels.includes(item))
    })

    // Build a lookup map to avoid O(n²) node searches
    const nodeIdMap = new Map<string | number, INode>()
    this.host.graphComponent.graph.nodes.forEach((node) => {
      nodeIdMap.set(this.host.nodeIdAccessor(node.tag), node)
    })

    graph.nodes.forEach((node) => {
      const original = nodeIdMap.get(this.host.nodeIdAccessor(node.tag))
      const state = node.lookup(ItemState)
      const originalState = original?.lookup(ItemState)
      if (state && originalState) {
        state.visible = originalState.visible ?? true
        state.nodeColor = originalState.nodeColor
        state.highlightedAdjacent = originalState.highlightedAdjacent
      }
      node.labels.forEach((label) => {
        const labelState = label.lookup(ItemState)
        if (labelState && state) {
          labelState.nodeColor = state.nodeColor
          labelState.labelHidden = state.labelHidden
        }
      })
    })

    // Build a lookup map for edges to avoid O(n²) edge searches
    const edgeIdMap = new Map<string | number, IEdge>()
    edgeBundle.edges.forEach((edge) => {
      edgeIdMap.set(this.host.nodeIdAccessor(edge.tag), edge)
    })

    graph.edges.forEach((edge) => {
      const state = edge.lookup(ItemState)
      if (state) {
        const original = edgeIdMap.get(this.host.nodeIdAccessor(edge.tag))
        const originalState = original?.lookup(ItemState)
        state.visible = true
        state.edgeColorA = originalState?.edgeColorA
        state.edgeColorB = originalState?.edgeColorB
        state.edgeKind = originalState?.edgeKind
      }
    })
  }

  private updateStyles(): void {
    const graph = this.subGraphComponent.graph
    const nodeStyle = this.host.getSharedNodeStyle()
    const edgeStyle = this.host.getSharedSimpleEdgeStyle()
    const nodeLabelStyle = this.host.getSharedNodeLabelStyle()
    const edgeLabelStyle = this.host.getSharedEdgeLabelStyle()

    graph.nodes.forEach((node) => {
      graph.setStyle(node, nodeStyle)
      node.labels.forEach((label) => graph.setStyle(label, nodeLabelStyle))
    })

    graph.edges.forEach((edge) => {
      graph.setStyle(edge, edgeStyle)
      edge.labels.forEach((label) => graph.setStyle(label, edgeLabelStyle))
    })
  }
}
