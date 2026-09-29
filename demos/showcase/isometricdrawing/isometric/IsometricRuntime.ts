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
  EdgePathLabelModel,
  ExteriorNodeLabelModel,
  type GraphComponent,
  GraphEditorInputMode,
  GraphSnapContext,
  GridInfo,
  GridRenderer,
  GridStyle,
  HierarchicalNestingPolicy,
  IGroupPaddingProvider,
  Insets,
  LabelLayerPolicy,
  LabelStyle,
  Matrix,
  PolylineEdgeStyle,
  RenderMode,
  StretchNodeLabelModel,
  Stroke,
  type IGraph,
  type INode
} from '@yfiles/yfiles'
import { configureTwoPointerPanning } from '@yfiles/demo-utils/configure-two-pointer-panning'
import { HeightHandleProvider } from './HeightHandleProvider'
import { IsometricNodeComparator } from './IsometricNodeComparator'
import { IsometricNodeStyle } from './IsometricNodeStyle'

const MINIMUM_NODE_HEIGHT = 3

/** Configuration for the standalone isometric rendering and interaction pipeline. */
export type IsometricRuntimeOptions = { onProjectionChanged?: () => void }

/**
 * Installs the simple isometric projection, ordering, styles, and interactions on a graph
 * component. The shared demo coordinator owns the graph data and toolbar actions.
 */
export class IsometricRuntime {
  readonly rotationMinimum = 0
  readonly rotationMaximum = 360
  readonly rotationStep = 1

  private readonly graphComponent: GraphComponent
  private readonly onProjectionChanged?: () => void
  private gridRenderer: GridRenderer | null = null
  private isometricNodeComparator: IsometricNodeComparator | null = null
  private rotation = 0

  constructor(graphComponent: GraphComponent, options: IsometricRuntimeOptions = {}) {
    this.graphComponent = graphComponent
    this.onProjectionChanged = options.onProjectionChanged
  }

  /** Installs the projection, graph-model ordering, editor input mode, and grid. */
  initialize(): void {
    this.initializeProjection()
    this.initializeInputMode()
    this.initializeGridVisual()
  }

  /** Installs the isometric defaults and the height-editing decorators on the given graph. */
  initializeGraph(graph: IGraph): void {
    graph.nodeDefaults.style = new IsometricNodeStyle()
    graph.nodeDefaults.labels.layoutParameter = ExteriorNodeLabelModel.BOTTOM_LEFT
    graph.edgeDefaults.style = new PolylineEdgeStyle({
      stroke: '2px #444',
      orthogonalEditing: true
    })
    graph.edgeDefaults.labels.layoutParameter = new EdgePathLabelModel(10).createRatioParameter()
    graph.groupNodeDefaults.labels.layoutParameter = new StretchNodeLabelModel({
      padding: 10
    }).createParameter('bottom')
    graph.groupNodeDefaults.labels.style = new LabelStyle({
      font: 'bold 14px Arial,sans-serif',
      horizontalTextAlignment: 'right'
    })
    graph.groupNodeDefaults.style = new IsometricNodeStyle()

    graph.decorator.nodes.handleProvider.addWrapperFactory(
      (node) => !graph.isGroupNode(node),
      (node, delegateProvider) =>
        new HeightHandleProvider(node, delegateProvider!, MINIMUM_NODE_HEIGHT)
    )

    graph.decorator.nodes.groupPaddingProvider.addConstant(
      (node) => graph.isGroupNode(node),
      IGroupPaddingProvider.create(() => new Insets(10, 10, 50, 10))
    )

    graph.addEventListener('node-created', (evt) => {
      this.ensureNodeTag(evt.item)
      if (graph.isGroupNode(evt.item)) {
        this.adaptGroupNodes(graph)
      }
    })
    graph.addEventListener('is-group-node-changed', () => this.adaptGroupNodes(graph))
  }

  /** Restores the styles owned by this runtime after GraphML deserialization. */
  applyStyles(graph: IGraph): void {
    const nodeStyle = graph.nodeDefaults.style
    const groupStyle = graph.groupNodeDefaults.style
    const nodeLabelStyle = graph.nodeDefaults.labels.style
    const groupLabelStyle = graph.groupNodeDefaults.labels.style
    const edgeStyle = graph.edgeDefaults.style
    const edgeLabelStyle = graph.edgeDefaults.labels.style

    for (const node of graph.nodes) {
      this.ensureNodeTag(node)
      if (graph.isGroupNode(node)) {
        graph.setStyle(node, groupStyle)
        node.labels.forEach((label) => graph.setStyle(label, groupLabelStyle))
      } else {
        graph.setStyle(node, nodeStyle)
        node.labels.forEach((label) => graph.setStyle(label, nodeLabelStyle))
      }
    }
    for (const edge of graph.edges) {
      graph.setStyle(edge, edgeStyle)
      edge.labels.forEach((label) => graph.setStyle(label, edgeLabelStyle))
    }
    this.adaptGroupNodes(graph)
  }

  /** Applies a rotation in radians and refreshes the simple z-order comparator. */
  setRotation(rotation: number): void {
    this.rotation = rotation
    const isometricProjection = Matrix.ISOMETRIC.clone()
    isometricProjection.rotate((rotation * Math.PI) / 180)
    this.graphComponent.projection = isometricProjection

    this.isometricNodeComparator?.update()
    const nodeManager = this.graphComponent.graphModelManager.nodeManager
    for (const node of this.graphComponent.graph.nodes) {
      nodeManager.update(node)
    }
    this.graphComponent.invalidate()
    this.onProjectionChanged?.()
  }

  getRotation(): number {
    return this.rotation
  }

  setGridVisible(visible: boolean): void {
    if (this.gridRenderer) {
      this.gridRenderer.visible = visible
      this.graphComponent.invalidate()
    }
  }

  getGridVisible(): boolean {
    return this.gridRenderer?.visible ?? false
  }

  setOrthogonalEditing(enabled: boolean): void {
    const inputMode = this.graphComponent.inputMode
    if (inputMode instanceof GraphEditorInputMode) {
      inputMode.orthogonalEdgeEditingContext.enabled = enabled
    }
  }

  /** Releases runtime-owned references before the graph component is discarded. */
  dispose(): void {
    this.gridRenderer = null
    this.isometricNodeComparator = null
  }

  private initializeProjection(): void {
    this.graphComponent.projection = Matrix.ISOMETRIC
    this.isometricNodeComparator = new IsometricNodeComparator(this.graphComponent)

    const manager = this.graphComponent.graphModelManager
    manager.hierarchicalNestingPolicy = HierarchicalNestingPolicy.GROUP_NODES
    manager.nodeLabelLayerPolicy = LabelLayerPolicy.AT_OWNER
    manager.edgeLabelLayerPolicy = LabelLayerPolicy.AT_OWNER
    manager.nodeManager.comparator = this.isometricNodeComparator.compare.bind(
      this.isometricNodeComparator
    )
    manager.provideRenderTagOnMainRenderTreeElement = true
  }

  private initializeInputMode(): void {
    const graphEditorInputMode = new GraphEditorInputMode()
    graphEditorInputMode.snapContext = new GraphSnapContext()
    this.graphComponent.inputMode = graphEditorInputMode
    configureTwoPointerPanning(this.graphComponent)
  }

  private initializeGridVisual(): void {
    this.gridRenderer = new GridRenderer({
      gridStyle: GridStyle.LINES,
      stroke: new Stroke(210, 210, 210, 255, 0.1),
      renderMode: RenderMode.WEBGL,
      visibilityThreshold: 10
    })
    this.graphComponent.renderTree.createElement(
      this.graphComponent.renderTree.backgroundGroup,
      new GridInfo(20, 20),
      this.gridRenderer
    )
  }

  private adaptGroupNodes(graph: IGraph): void {
    for (const groupNode of graph.nodes.filter((node) => graph.isGroupNode(node))) {
      this.ensureNodeTag(groupNode)
      const nestingLevel = graph.groupingSupport.getAncestors(groupNode).size
      const tag = groupNode.tag
      tag.height = nestingLevel * 0.01
      tag.color.a = (Math.min(1, 0.4 + nestingLevel * 0.1) * 255) | 0
    }
    this.graphComponent.invalidate()
  }

  private ensureNodeTag(node: INode): void {
    if (!node.tag || typeof node.tag !== 'object') {
      node.tag = {}
    }
    if (typeof node.tag.height !== 'number') {
      node.tag.height = MINIMUM_NODE_HEIGHT + Math.round(Math.random() * 30)
    }
    if (typeof node.tag.color !== 'object') {
      node.tag.color = {}
    }
    const color = node.tag.color
    for (const component of 'rgba'.split('')) {
      if (typeof color[component] !== 'number' || color[component] < 0 || 255 < color[component]) {
        color[component] = component === 'a' ? 255 : (Math.random() * 256) | 0
      }
    }
  }
}
