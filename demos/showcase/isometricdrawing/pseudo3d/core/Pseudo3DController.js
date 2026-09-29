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
  Arrow,
  EdgeStyleIndicatorRenderer,
  GraphViewerInputMode,
  HierarchicalNestingPolicy,
  IArrow,
  IGraph,
  ILookupDecorator,
  IPortCandidateProvider,
  LabelLayerPolicy,
  LookupDecorator,
  OrthogonalEdgeHelper,
  StyleIndicatorZoomPolicy
} from '@yfiles/yfiles'
import { EdgePortHandleProvider } from '../interaction/EdgePortHandleProvider'
import {
  wrapPortCandidateProvider,
  wrapReconnectionPortCandidateProvider
} from '../interaction/ProjectedPortCandidateProvider'
import { OrbitInputMode } from '../interaction/OrbitInputMode'
import { ProjectionAwareGraphModelManager } from '../ordering/ProjectionAwareGraphModelManager'
import { ProjectionAwareRenderOrder } from '../ordering/ProjectionAwareRenderOrder'
import { Pseudo3DProjectionState } from './Pseudo3DProjection'
import { Pseudo3DSelectionStyle } from '../styles/Pseudo3DSelectionStyle'
import { Pseudo3DEdgeStyle } from '../styles/Pseudo3DEdgeStyle'
import { ExtrudedPerimeterStyle } from '../styles/ExtrudedPerimeterStyle'
import TopFaceReshapeHandleProvider, {
  NodeHeightHandleProvider
} from '../interaction/TopFaceReshapeHandleProvider'

/** Installs the shared pseudo-3D rendering, ordering, and interaction plumbing. */
export class Pseudo3DController {
  projectionState
  context
  graphModelManager
  nodeComparator
  inputMode
  orbitInputMode

  projectionUpdateFrame = 0

  isDisposed = false

  graphComponent

  graph

  previousInputMode

  previousContextMenuEnabled

  previousGraphModelManager

  onGraphChanged = () => {
    this.scheduleProjection()
  }

  constructor(graphComponent, options = {}) {
    this.graphComponent = graphComponent
    this.graph = graphComponent.graph
    this.previousInputMode = graphComponent.inputMode
    this.previousGraphModelManager = graphComponent.graphModelManager

    const lookupDecorator = this.graph.lookup(ILookupDecorator)
    if (!lookupDecorator) {
      throw new Error('The graph must provide an ILookupDecorator')
    }

    this.projectionState = new Pseudo3DProjectionState(options.inclination, options.rotation)
    this.inputMode =
      options.inputMode ?? this.graphComponent.inputMode ?? new GraphViewerInputMode()
    this.previousContextMenuEnabled = this.inputMode.contextMenuInputMode.enabled
    graphComponent.inputMode = this.inputMode

    this.graphModelManager = new ProjectionAwareGraphModelManager()
    this.graphModelManager.hierarchicalNestingPolicy = HierarchicalNestingPolicy.NONE
    this.graphModelManager.edgeLabelLayerPolicy = LabelLayerPolicy.AT_OWNER
    this.graphModelManager.nodeLabelLayerPolicy = LabelLayerPolicy.AT_OWNER
    graphComponent.graphModelManager = this.graphModelManager

    new LookupDecorator(IGraph, Pseudo3DProjectionState, lookupDecorator).addConstant(
      this.projectionState
    )
    this.context = {
      graphComponent,
      graph: this.graph,
      projectionState: this.projectionState,
      getRefreshVersion: () => this.graphModelManager.projectionRevision
    }
    this.nodeComparator = new ProjectionAwareRenderOrder(this.context)
    this.graphModelManager.nodeManager.comparator = (node1, node2) =>
      this.nodeComparator.compare(node1, node2)

    this.installDecorators()
    this.graphModelManager.edgeGroup.above(this.graphModelManager.nodeGroup)

    this.orbitInputMode = new OrbitInputMode(this.projectionState, () => {
      options.onProjectionChanged?.()
      this.scheduleProjection()
    })
    this.inputMode.add(this.orbitInputMode)
    this.inputMode.contextMenuInputMode.enabled = false

    this.installListeners()
    this.graphModelManager.applyProjection(this.context, this.nodeComparator)
  }

  /** Applies the current projection immediately and refreshes all dependent visuals. */
  applyProjection() {
    if (this.isDisposed) {
      return
    }
    this.cancelScheduledProjection()
    this.graphModelManager.applyProjection(this.context, this.nodeComparator)
  }

  /** Coalesces projection changes into one refresh per animation frame. */
  scheduleProjection() {
    if (this.isDisposed) {
      return
    }
    if (this.projectionUpdateFrame !== 0) {
      return
    }

    this.projectionUpdateFrame = requestAnimationFrame(() => {
      this.projectionUpdateFrame = 0
      this.applyProjection()
    })
  }

  /** Removes controller-owned integration and cancels pending refreshes. */
  dispose() {
    if (this.isDisposed) {
      return
    }
    this.isDisposed = true

    this.cancelScheduledProjection()
    this.removeListeners()
    this.inputMode.remove(this.orbitInputMode)
    if (this.graphComponent.inputMode === this.inputMode) {
      this.inputMode.contextMenuInputMode.enabled = this.previousContextMenuEnabled
      this.graphComponent.inputMode = this.previousInputMode
    }
    if (this.graphComponent.graphModelManager === this.graphModelManager) {
      this.graphComponent.graphModelManager = this.previousGraphModelManager
    }
  }

  installDecorators() {
    const { graph, projectionState } = this.context

    graph.decorator.nodes.reshapeHandleProvider.addWrapperFactory(
      (node) => node.style instanceof ExtrudedPerimeterStyle,
      (node, originalProvider) =>
        originalProvider
          ? new TopFaceReshapeHandleProvider(originalProvider, node, this.context)
          : null
    )

    graph.decorator.nodes.handleProvider.addWrapperFactory(
      (node) => !graph.isGroupNode(node) && node.style instanceof ExtrudedPerimeterStyle,
      (node, originalProvider) =>
        new NodeHeightHandleProvider(node, originalProvider, this.context, () =>
          this.graphModelManager.applyProjection(this.context, this.nodeComparator)
        )
    )

    graph.decorator.edges.portHandleProvider.addWrapperFactory(
      (edge) => edge.style instanceof Pseudo3DEdgeStyle,
      (edge, originalProvider) =>
        originalProvider ? new EdgePortHandleProvider(originalProvider, edge, this.context) : null
    )

    graph.decorator.edges.orthogonalEdgeHelper.addFactory(
      (edge) => edge.style instanceof Pseudo3DEdgeStyle,
      (edge) => new OrthogonalEdgeHelper(edge)
    )

    graph.decorator.nodes.portCandidateProvider.addFactory((node) =>
      IPortCandidateProvider.fromShapeGeometry(node, 0, 0.5)
    )
    graph.decorator.nodes.portCandidateProvider.addWrapperFactory(
      (node) => !graph.isGroupNode(node),
      (node, originalProvider) =>
        originalProvider ? wrapPortCandidateProvider(originalProvider, this.context) : null
    )

    graph.decorator.edges.reconnectionPortCandidateProvider.addWrapperFactory(
      (edge) => edge.style instanceof Pseudo3DEdgeStyle,
      (edge, originalProvider) =>
        originalProvider
          ? wrapReconnectionPortCandidateProvider(originalProvider, this.context)
          : null
    )

    graph.decorator.nodes.selectionRenderer.addConstant(
      new Pseudo3DSelectionStyle(projectionState).createSelectionRenderer()
    )
    graph.decorator.nodes.highlightRenderer.addConstant(
      new Pseudo3DSelectionStyle(projectionState, '#01baff', 3, 'base').createHighlightRenderer()
    )
    graph.decorator.edges.selectionRenderer.addConstant(
      new EdgeStyleIndicatorRenderer({
        edgeStyle: new Pseudo3DEdgeStyle({
          width: 7,
          color: '#01baff',
          sourceArrow: IArrow.NONE,
          targetArrow: new Arrow({
            type: 'stealth',
            fill: '#01baff',
            stroke: '#01baff',
            lengthScale: 1,
            widthScale: 1
          })
        }),
        zoomPolicy: StyleIndicatorZoomPolicy.WORLD_COORDINATES
      })
    )
  }

  installListeners() {
    this.graph.addEventListener('parent-changed', this.onGraphChanged)
    this.graph.addEventListener('node-created', this.onGraphChanged)
    this.graph.addEventListener('node-removed', this.onGraphChanged)
    this.graph.addEventListener('edge-created', this.onGraphChanged)
    this.graph.addEventListener('node-layout-changed', this.onGraphChanged)
    this.graph.addEventListener('node-tag-changed', this.onGraphChanged)
    this.graph.addEventListener('label-added', this.onGraphChanged)
    this.graph.addEventListener('label-layout-parameter-changed', this.onGraphChanged)
    this.graph.addEventListener('label-preferred-size-changed', this.onGraphChanged)
    this.graph.addEventListener('is-group-node-changed', this.onGraphChanged)
  }

  removeListeners() {
    this.graph.removeEventListener('parent-changed', this.onGraphChanged)
    this.graph.removeEventListener('node-created', this.onGraphChanged)
    this.graph.removeEventListener('node-removed', this.onGraphChanged)
    this.graph.removeEventListener('edge-created', this.onGraphChanged)
    this.graph.removeEventListener('node-layout-changed', this.onGraphChanged)
    this.graph.removeEventListener('node-tag-changed', this.onGraphChanged)
    this.graph.removeEventListener('label-added', this.onGraphChanged)
    this.graph.removeEventListener('label-layout-parameter-changed', this.onGraphChanged)
    this.graph.removeEventListener('label-preferred-size-changed', this.onGraphChanged)
    this.graph.removeEventListener('is-group-node-changed', this.onGraphChanged)
  }

  cancelScheduledProjection() {
    if (this.projectionUpdateFrame === 0) {
      return
    }
    cancelAnimationFrame(this.projectionUpdateFrame)
    this.projectionUpdateFrame = 0
  }
}
