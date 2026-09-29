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
  EdgeSides,
  type GraphComponent,
  GraphEditorInputMode,
  GraphSnapContext,
  GridInfo,
  GridRenderer,
  GridStyle,
  GroupNodeLabelModel,
  IGroupPaddingProvider,
  Insets,
  LabelStyle,
  RenderMode,
  Stroke,
  type IGraph
} from '@yfiles/yfiles'
import { configureTwoPointerPanning } from '@yfiles/demo-utils/configure-two-pointer-panning'
import { Pseudo3DController } from './core/Pseudo3DController'
import { Pseudo3DEdgeLabelStyle } from './styles/Pseudo3DEdgeLabelStyle'
import { Pseudo3DEdgeStyle } from './styles/Pseudo3DEdgeStyle'
import { Pseudo3DLabelStyle } from './styles/Pseudo3DLabelStyle'
import type { ExtrudedPerimeterStyle } from './styles/ExtrudedPerimeterStyle'
import { createGroupStyle, getDemoNodeStyle } from './styles/NodeStyleSupport'

const isFirefox = /Firefox|FxiOS/i.test(navigator.userAgent)

export type Pseudo3DRuntimeOptions = { onProjectionChanged?: () => void }

/** Installs the advanced pseudo-3D projection, styles, ordering, and editor interactions. */
export class Pseudo3DRuntime {
  readonly rotationMinimum = 0
  readonly rotationMaximum = 360
  readonly rotationStep = 1

  private readonly graphComponent: GraphComponent
  private readonly onProjectionChanged?: () => void
  private readonly nodeStyleCache = new Map<string, ExtrudedPerimeterStyle>()
  private controller: Pseudo3DController | null = null
  private gridRenderer: GridRenderer | null = null

  constructor(graphComponent: GraphComponent, options: Pseudo3DRuntimeOptions = {}) {
    this.graphComponent = graphComponent
    this.onProjectionChanged = options.onProjectionChanged
  }

  initialize(): void {
    const graphEditorInputMode = new GraphEditorInputMode()
    graphEditorInputMode.orthogonalEdgeEditingContext.enabled = true
    graphEditorInputMode.snapContext = new GraphSnapContext()
    configureTwoPointerPanning(this.graphComponent)

    this.controller = new Pseudo3DController(this.graphComponent, {
      inputMode: graphEditorInputMode,
      onProjectionChanged: this.onProjectionChanged
    })

    this.gridRenderer = new GridRenderer({
      gridStyle: GridStyle.DOTS,
      stroke: new Stroke(100, 100, 100, 255, isFirefox ? 2 : 1),
      renderMode: isFirefox ? RenderMode.CANVAS : RenderMode.SVG,
      visibilityThreshold: 10
    })
    this.graphComponent.renderTree.createElement(
      this.graphComponent.renderTree.backgroundGroup,
      new GridInfo(20, 20),
      this.gridRenderer
    )
  }

  initializeGraph(graph: IGraph): void {
    graph.nodeDefaults.style = getDemoNodeStyle(undefined, this.nodeStyleCache)
    graph.nodeDefaults.labels.style = new Pseudo3DLabelStyle(graph.nodeDefaults.labels.style)

    graph.edgeDefaults.style = new Pseudo3DEdgeStyle({
      width: 2,
      color: 'darkslategray',
      lineCap: 'butt'
    })
    const edgeLabelModel = new EdgePathLabelModel({
      autoRotation: true,
      sideOfEdge: EdgeSides.ABOVE_EDGE,
      distance: 8
    })
    graph.edgeDefaults.labels.layoutParameter = edgeLabelModel.createRatioParameter(
      0.5,
      EdgeSides.ON_EDGE
    )
    graph.edgeDefaults.labels.style = new Pseudo3DEdgeLabelStyle(
      new LabelStyle({
        textFill: '#f4f0ff',
        backgroundFill: '#4c395f',
        backgroundStroke: '#cbb4e6',
        shape: 'round-rectangle',
        padding: [3, 8],
        font: '600 12px Inter, system-ui, sans-serif'
      })
    )

    graph.groupNodeDefaults.labels.layoutParameter = new GroupNodeLabelModel({
      considerTabPadding: true
    }).createTabBackgroundParameter()
    graph.groupNodeDefaults.labels.style = new Pseudo3DLabelStyle(
      new LabelStyle({ textFill: 'white', font: '600 14px Inter, system-ui, sans-serif' })
    )
    graph.groupNodeDefaults.style = createGroupStyle('#bfbfbf', '#878787', 'gray', 'darkslategrey')
    graph.decorator.nodes.groupPaddingProvider.addConstant(
      (node) => graph.isGroupNode(node),
      IGroupPaddingProvider.create(() => new Insets(50, 20, 20, 20))
    )
  }

  applyStyles(graph: IGraph): void {
    const nodeStyle = graph.nodeDefaults.style
    const groupStyle = graph.groupNodeDefaults.style
    const nodeLabelStyle = graph.nodeDefaults.labels.style
    const groupLabelStyle = graph.groupNodeDefaults.labels.style
    const edgeStyle = graph.edgeDefaults.style
    const edgeLabelStyle = graph.edgeDefaults.labels.style

    for (const node of graph.nodes) {
      if (graph.isGroupNode(node)) {
        graph.setStyle(node, groupStyle)
        node.labels.forEach((label) => graph.setStyle(label, groupLabelStyle))
      } else {
        graph.setStyle(node, this.getNodeStyle(node) ?? nodeStyle)
        node.labels.forEach((label) => graph.setStyle(label, nodeLabelStyle))
      }
    }
    for (const edge of graph.edges) {
      graph.setStyle(edge, edgeStyle)
      edge.labels.forEach((label) => graph.setStyle(label, edgeLabelStyle))
    }
  }

  getNodeStyle(dataItem: any): any {
    return getDemoNodeStyle(dataItem, this.nodeStyleCache)
  }

  setRotation(rotation: number): void {
    this.controller?.context.projectionState.setRotation(rotation)
    this.controller?.scheduleProjection()
  }

  getRotation(): number {
    return this.controller?.context.projectionState.rotation ?? 35
  }

  setInclination(inclination: number): void {
    this.controller?.context.projectionState.setInclination(inclination)
    this.controller?.scheduleProjection()
  }

  getInclination(): number {
    return this.controller?.context.projectionState.inclination ?? 55
  }

  setOrthogonalEditing(enabled: boolean): void {
    const inputMode = this.controller?.inputMode
    if (inputMode instanceof GraphEditorInputMode) {
      inputMode.orthogonalEdgeEditingContext.enabled = enabled
    }
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

  dispose(): void {
    this.controller?.dispose()
    this.controller = null
    this.gridRenderer = null
    this.nodeStyleCache.clear()
  }
}
