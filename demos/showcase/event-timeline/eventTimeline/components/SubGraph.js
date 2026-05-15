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
  GraphCopier,
  GraphViewerInputMode,
  HierarchicalNestingPolicy,
  IEdge,
  ILabel,
  INode,
  IPort,
  PolylineEdgeStyle,
  Stroke
} from '@yfiles/yfiles'
import { SubgraphLayout } from '../SubgraphLayout'
import { ViewportWidthNodeStyle } from '../styles/ViewportWidthNodeStyle'
import { SimpleGradientDelegatingEdgeStyle } from '../styles/SimpleGradientDelegatingEdgeStyle'
import { TIMELINE_CONSTANTS } from '../EventTimeline'
import { EventTimelineEdgeEndsStyle } from '../styles/EventTimelineEdgeEndsStyle'
import { InteractionManager } from './InteractionManager'

/**
 *
 */
export class SubGraph {
  graphComponent
  subGraphDialog
  mainGraphCallback
  styleManager
  subGraphComponent
  interactionManager
  symmetricXPadding = 50
  labelXPadding = 100
  labelYPadding = 50

  /**
   * Instantiates a new Subgraph object.
   * @param graphComponent The graph component containing the subgraph.
   * @param subGraphComponent The graph component containing the main graph.
   * @param subGraphDialog The HTML dialog for the subgraph.
   * @param styleManager The StyleManager object responsible for managing node/edge styles
   * @param mainGraphCallback Callback function with which to correctly position the viewport
   * in preparation for the subgraph's visualization.
   */
  constructor(graphComponent, subGraphComponent, subGraphDialog, styleManager, mainGraphCallback) {
    this.graphComponent = graphComponent
    this.subGraphComponent = subGraphComponent
    this.subGraphDialog = subGraphDialog
    this.styleManager = styleManager

    this.mainGraphCallback = mainGraphCallback
    this.interactionManager = new InteractionManager({
      graphComponent: this.graphComponent,
      richInteraction: false
    })
    this.configureGraphComponent()
    this.configureDialog()
  }

  /**
   * Method with which to configure the graph component's interaction modes.
   * @private
   */
  configureGraphComponent() {
    this.graphComponent.graphModelManager.hierarchicalNestingPolicy =
      HierarchicalNestingPolicy.NODES
    this.graphComponent.graphModelManager.edgeGroup.above(
      this.graphComponent.graphModelManager.nodeGroup
    )
    const gvim = new GraphViewerInputMode()
    this.graphComponent.inputMode = gvim
    gvim.clickableItems = 'none'
    gvim.selectableItems = 'none'
    gvim.moveViewportInputMode.enabled = false
    this.graphComponent.mouseWheelBehavior = 'none'

    this.interactionManager.configure()
  }

  /**
   * Method with which to configure the subgraph's HTML dialog.
   */
  configureDialog() {
    this.subGraphDialog.addEventListener('click', (e) => {
      const dialogDimensions = this.subGraphDialog.getBoundingClientRect()
      if (
        e.clientX < dialogDimensions.left ||
        e.clientX > dialogDimensions.right ||
        e.clientY < dialogDimensions.top ||
        e.clientY > dialogDimensions.bottom
      ) {
        this.subGraphDialog.close()
      }
    })
  }

  /**
   * Method with which to populate the biofabric subgraph.
   * @param edgeBundle the AggregatedEdgeGroup to be visualized as a biofabric subgraph.
   */
  populateGraph(edgeBundle) {
    const graph = this.graphComponent.graph
    graph.clear()
    const nodes = edgeBundle.edges.flatMap((e) => [e.sourceNode, e.targetNode])
    const labels = edgeBundle.edges
      .flatMap((e) => e.labels.toArray())
      .concat(nodes.flatMap((n) => n.labels.toArray()))
    new GraphCopier().copy({
      sourceGraph: this.subGraphComponent.graph,
      targetGraph: graph,
      copyPredicate: (item) =>
        (item instanceof IEdge && edgeBundle.edges.includes(item)) ||
        (item instanceof INode && nodes.includes(item)) ||
        (item instanceof IPort &&
          edgeBundle.edges.some((e) => e.sourcePort === item || e.targetPort === item)) ||
        (item instanceof ILabel && labels.includes(item))
    })
    graph.edges.forEach((e) => {
      e.tag = { ...e.tag, visible: true }
    })
  }

  /**
   * Method with which to update node and edge styles in the subgraph's graph component.
   */
  updateStyles() {
    const graph = this.graphComponent.graph
    graph.nodes.forEach((node) => {
      graph.setStyle(node, new ViewportWidthNodeStyle('event-timeline-node'))
    })
    const simpleEdgeStyle = new CompositeEdgeStyle(
      new SimpleGradientDelegatingEdgeStyle(
        new PolylineEdgeStyle({
          cssClass: 'event-timeline-edge',
          stroke: new Stroke({ thickness: TIMELINE_CONSTANTS.EDGE_THICKNESS })
        }),
        this.styleManager.generateNodeToColorMap(),
        this.styleManager.gradients,
        TIMELINE_CONSTANTS.CSS_VAR_PREFIX
      ),
      new EventTimelineEdgeEndsStyle(
        TIMELINE_CONSTANTS.EDGE_THICKNESS,
        TIMELINE_CONSTANTS.EDGE_RADIUS,
        this.styleManager.generateNodeToColorMap(),
        TIMELINE_CONSTANTS.CSS_VAR_PREFIX
      )
    )

    graph.edges.forEach((edge) => {
      graph.setStyle(edge, simpleEdgeStyle.clone())
    })
  }

  /**
   * Method called when a user clicks on a hyperedge group, i.e., a cluster of edges that all share
   * the exact same timestamp.
   * @param bundle The clicked AggregatedEdgeGroup bundle.
   */
  async hyperEdgeGroupClicked(bundle) {
    const { graph } = this.graphComponent
    const dialogWidth = bundle.edges.length * 75 + 2 * this.symmetricXPadding + this.labelXPadding

    // Helper to get current Y bounds and View coordinates
    const getMainGraphState = () => {
      const ys = bundle.edges.flatMap((e) => [e.sourcePort.location.y, e.targetPort.location.y])
      const upperY = Math.min(...ys)
      const lowerY = Math.max(...ys)
      const dialogHeight = lowerY - upperY

      const rect = this.subGraphComponent.htmlElement.getBoundingClientRect()
      const sourcePos = this.subGraphComponent.worldToViewCoordinates([
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
      await this.mainGraphCallback(state.upperY, state.lowerY, bundle)
      state = getMainGraphState() // Recalculate after callback
    }

    Object.assign(this.subGraphDialog.style, {
      left: `${state.dialogX}px`,
      top: `${state.dialogY}px`,
      width: `${dialogWidth}px`,
      height: `${state.dialogHeight}px`
    })

    this.subGraphDialog.showModal()
    this.populateGraph(bundle)
    const nodeOrder = graph.nodes
      .toSorted((a, b) => {
        const originalA = this.subGraphComponent.graph.nodes.find(
          (n) => n.tag.label === a.tag.label
        )
        const originalB = this.subGraphComponent.graph.nodes.find(
          (n) => n.tag.label === b.tag.label
        )
        if (!originalA || !originalB) {
          return 0
        }
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
        this.labelYPadding
      )
    )

    this.updateStyles()
  }
}
