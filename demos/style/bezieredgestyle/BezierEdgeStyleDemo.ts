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
  ArrowType,
  BezierEdgePathLabelModel,
  BezierEdgeSegmentLabelModel,
  BezierEdgeStyle,
  GraphBuilder,
  GraphComponent,
  GraphEditorInputMode,
  HandleInputMode,
  HandlesRenderer,
  HorizontalTextAlignment,
  type IBend,
  type IHandle,
  type IInputMode,
  type ILabelModelParameter,
  LabelStyle,
  License,
  ShapeNodeShape,
  ShapeNodeStyle
} from '@yfiles/yfiles'
import { BezierGraphEditorInputMode } from './BezierGraphEditorInputMode'
import {
  InnerControlPointHandle,
  OuterControlPointHandle,
  SimpleControlPointHandle
} from './BezierHandles'
import { BezierBendCreator } from './BezierBendCreator'
import { BezierCreateEdgeInputMode } from './BezierCreateEdgeInputMode'
import SampleCircle from './resources/circle-sample-data.json'
import SampleLabels from './resources/label-sample-data.json'
import licenseData from '../../../lib/license.json'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import { BezierHandlesRenderer } from './BezierHandlesRenderer'
import {
  BezierBendSelectionHandleProvider,
  BezierEdgeSelectionHandleProvider
} from './BezierHandleProvider'

let graphComponent: GraphComponent = null!

/**
 * Configuration object for managing the demo settings
 */
const config = { smoothSegments: true, angle: 0, autoRotation: true, autoSnapping: true }

const bezierEdgeSegmentLabelModel = new BezierEdgeSegmentLabelModel({ autoSnapping: true })
const bezierPathLabelModel = new BezierEdgePathLabelModel({ autoSnapping: true })
const bezierEdgeStyle: BezierEdgeStyle = new BezierEdgeStyle({
  stroke: '3px #4169E1',
  targetArrow: new Arrow({ fill: '#4169E1', stroke: '#4169E1', type: ArrowType.TRIANGLE })
})

async function run(): Promise<void> {
  License.value = licenseData
  graphComponent = new GraphComponent('graphComponent')
  graphComponent.inputMode = createEditorMode()

  initializeGraph()

  initializeUI()
}

/**
 * Creates the default input mode for the GraphComponent, a {@link GraphEditorInputMode}.
 * a new GraphEditorInputMode instance and configures snapping and orthogonal edge editing
 */
function createEditorMode(): IInputMode {
  return new BezierGraphEditorInputMode(config)
}

/**
 * Initializes the graph instance setting default styles
 * and creating a small sample graph.
 */
function initializeGraph(): void {
  const graph = graphComponent.graph

  // We need to provide our own handles for bezier edge bends:
  registerBezierDecorators()

  graph.nodeDefaults.style = new ShapeNodeStyle({
    shape: ShapeNodeShape.ELLIPSE,
    fill: 'lightgray',
    stroke: null
  })
  graph.edgeDefaults.style = bezierEdgeStyle
  graph.edgeDefaults.labels.style = new LabelStyle({
    backgroundFill: '#FFFFFF',
    backgroundStroke: '#FFA500',
    padding: 3,
    horizontalTextAlignment: HorizontalTextAlignment.CENTER
  })
  graph.edgeDefaults.labels.layoutParameter = bezierPathLabelModel.createParameter(0.5)

  loadSample(SampleCircle)

  graph.undoEngineEnabled = true
}

function registerBezierDecorators(): void {
  const graph = graphComponent.graph

  graph.decorator.bends.handle.addWrapperFactory(
    (b) => b.owner.style instanceof BezierEdgeStyle && b.owner.bends.size % 3 == 2,
    (bend: IBend | null, handle: IHandle | null) => {
      const index = bend!.index
      if (config.smoothSegments) {
        // smooth editing -> use custom handles which synchronize the other handles of the triple
        switch (index % 3) {
          case 0:
          case 1:
            // Handle for the first control point of a triple
            return new OuterControlPointHandle(handle!, bend!)
          case 2:
          default:
            // The "middle" control point controls the previous and next ones
            return new InnerControlPointHandle(handle!, bend!)
        }
      }
      // No smooth editing -> use the same custom handle for inner and outer control points which store their bend.
      // This information is relevant for the handles renderer which renders lines from outer control points to
      // inner one.
      return new SimpleControlPointHandle(handle!, bend!, index % 3 != 2)
    }
  )

  // Override the default for bezier edges
  graph.decorator.edges.bendCreator.addWrapperFactory(
    (edge) => edge.style instanceof BezierEdgeStyle,
    (edge, originalBendCreator) =>
      originalBendCreator != null ? new BezierBendCreator(edge, originalBendCreator) : null
  )

  // Always show the outer control point handles of selected bezier edges
  graph.decorator.edges.handleProvider.addWrapperFactory(
    (edge) => edge.style instanceof BezierEdgeStyle,
    (edge, coreImpl) => new BezierEdgeSelectionHandleProvider(edge, coreImpl)
  )

  const geim = (graphComponent.inputMode as GraphEditorInputMode)!
  const him = new HandleInputMode({
    // Use a custom handles renderer which connects the outer control point handles with the inner one
    handlesRenderer: new BezierHandlesRenderer(new HandlesRenderer())
  })

  // Dragging an unselected bend does not work if there are other handles. For this case we have to temporarily
  // disable the custom provider which provides all handles.
  let draggingBend = false
  geim.createBendInputMode.addEventListener('dragging', () => {
    draggingBend = true
  })
  him.addEventListener('drag-finished', () => {
    if (draggingBend) {
      draggingBend = false
      requeryHandles()
    }
  })
  him.addEventListener('drag-canceled', () => {
    if (draggingBend) {
      draggingBend = false
      requeryHandles()
    }
  })

  geim.handleInputMode = him

  // Provide the whole control point triplet if the inner control point bend is selected
  graph.decorator.bends.handleProvider.addWrapperFactory(
    (bend) => bend.owner.style instanceof BezierEdgeStyle && !draggingBend,
    (bend, _) =>
      new BezierBendSelectionHandleProvider(
        bend,
        graphComponent.selection.edges.includes(bend.owner)
      )
  )
}

// since removing bends also affects our handles, we need to let the input mode
// requery the handles to get the fresh ones.
function requeryHandles(): void {
  ;(graphComponent.inputMode as GraphEditorInputMode).requeryHandles()
}

function loadSample(sample: any): void {
  graphComponent.graph.clear()
  const builder = new GraphBuilder(graphComponent.graph)
  builder.createNodesSource({ data: sample.nodes, id: 'id', layout: 'layout' })
  const edgeCreator = builder.createEdgesSource(sample.edges, 'source', 'target', 'id').edgeCreator

  if (sample === SampleLabels) {
    // add label with the according label models from the sample data
    const labelCreator = edgeCreator.createLabelsSource((data: any) => data.labels).labelCreator
    labelCreator.textProvider = (data: any): string => data.text
    labelCreator.layoutParameterProvider = (data: any): ILabelModelParameter => {
      if (data.model === 'segment') {
        if (data.fromSource) {
          return bezierEdgeSegmentLabelModel.createParameterFromSource(
            data.segmentIndex,
            data.segmentRatio,
            data.distance
          )
        } else {
          return bezierEdgeSegmentLabelModel.createParameterFromTarget(
            data.segmentIndex,
            data.segmentRatio,
            data.distance
          )
        }
      } else {
        return bezierPathLabelModel.createParameter(data.ratio, data.distance)
      }
    }
  }
  const graph = builder.buildGraph()

  // add label with the according label models from the sample data
  graph.edges.forEach((edge) => {
    if (edge.tag.bends) {
      edge.tag.bends.forEach((bend: any): void => {
        graph.addBend(edge, bend)
      })
    }
  })

  void graphComponent.fitGraphBounds()

  graph.undoEngine?.clear()
}

function initializeUI(): void {
  document.querySelector<HTMLInputElement>('#smooth-editing')!.addEventListener('click', () => {
    config.smoothSegments = !config.smoothSegments
    if (graphComponent) {
      const geim = graphComponent.inputMode
      if (geim instanceof GraphEditorInputMode) {
        const bceim = geim.createEdgeInputMode
        if (bceim instanceof BezierCreateEdgeInputMode) {
          bceim.createSmoothSplines = config.smoothSegments
        }
        geim.requeryHandles()
      }
    }
  })

  document.querySelector<HTMLInputElement>('#auto-rotation')!.addEventListener('click', () => {
    config.autoRotation = !config.autoRotation
    bezierEdgeSegmentLabelModel.autoRotation = config.autoRotation
    bezierPathLabelModel.autoRotation = config.autoRotation
    if (graphComponent) {
      graphComponent.updateVisual()
    }
  })
  document.querySelector<HTMLInputElement>('#auto-snapping')!.addEventListener('click', () => {
    config.autoSnapping = !config.autoSnapping
    bezierEdgeSegmentLabelModel.autoSnapping = config.autoSnapping
    bezierPathLabelModel.autoSnapping = config.autoSnapping
    if (graphComponent) {
      graphComponent.updateVisual()
    }
  })
  const angleLabel = document.querySelector<HTMLLabelElement>('#angle-label')!
  document.querySelector<HTMLInputElement>('#angle-range')!.addEventListener('input', (evt) => {
    const value = (evt.target as HTMLInputElement).value
    config.angle = Number(value)
    bezierEdgeSegmentLabelModel.angle = (Math.PI * config.angle) / 180.0
    bezierPathLabelModel.angle = (Math.PI * config.angle) / 180.0
    angleLabel.innerText = String(config.angle)
    if (graphComponent) {
      graphComponent.updateVisual()
    }
  })

  document.querySelector<HTMLSelectElement>('#sample-select')!.addEventListener('change', (evt) => {
    const value = (evt.target as HTMLSelectElement).value
    if (value === 'circle') {
      loadSample(SampleCircle)
    } else {
      loadSample(SampleLabels)
    }
  })
}

run().then(finishLoading)
