/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) by yWorks GmbH, Vor dem Kreuzberg 28,
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
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CanvasComponent,
  ClearAreaStrategy,
  ComponentAssignmentStrategy,
  EventRecognizers,
  GraphBuilder,
  GraphComponent,
  GraphEditorInputMode,
  GraphItemTypes,
  IHitTester,
  IInputModeContext,
  INode,
  IRenderContext,
  License,
  MarqueeRenderTag,
  MarqueeSelectionEventArgs,
  MarqueeSelectionInputMode,
  ObjectRendererBase,
  Point,
  PointerButtons,
  PointerEventArgs,
  PointerEventType,
  Rect,
  SvgVisual
} from '@yfiles/yfiles'

import SampleData from './resources/SampleData'
import { ClearAreaLayoutHelper } from './ClearAreaLayoutHelper'
import { createDemoGroupStyle, initDemoStyles } from '@yfiles/demo-resources/demo-styles'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { addNavigationButtons, finishLoading } from '@yfiles/demo-resources/demo-page'

let graphComponent = null

let layoutHelper = null

let componentAssignmentStrategy = ComponentAssignmentStrategy.SINGLE

let clearAreaStrategy = ClearAreaStrategy.PRESERVE_SHAPES

async function run() {
  License.value = await fetchLicense()
  graphComponent = new GraphComponent('#graphComponent')
  initializeInputModes()
  initDemoStyles(graphComponent.graph)
  loadGraph('hierarchical')

  graphComponent.graph.undoEngine.clear()

  // bind the buttons to their actions
  initializeUI()
}

/**
 * Registers the {@link GraphEditorInputMode} as the {@link CanvasComponent.inputMode}
 * and initializes the marquee input mode that clears the area of the marquee rectangle.
 */
function initializeInputModes() {
  // enable undo/redo support
  graphComponent.graph.undoEngineEnabled = true

  // create an input mode to edit graphs
  const editMode = new GraphEditorInputMode()

  // create an input mode to clear the area of a marquee rectangle
  // using the right mouse button
  const marqueeClearInputMode = new MarqueeSelectionInputMode({
    marqueeRenderer: new ClearRectangleRenderer(),
    beginRecognizer: (evt) =>
      evt instanceof PointerEventArgs &&
      evt.buttons === PointerButtons.MOUSE_RIGHT &&
      evt.eventType === PointerEventType.DOWN,
    moveRecognizer: (evt) =>
      evt instanceof PointerEventArgs && evt.eventType === PointerEventType.DRAG,
    finishRecognizer: (evt) =>
      evt instanceof PointerEventArgs &&
      evt.changedButtons === PointerButtons.MOUSE_RIGHT &&
      evt.eventType === PointerEventType.UP,
    cancelRecognizer: (evt, sender) =>
      EventRecognizers.ESCAPE_DOWN(evt, sender) ||
      (evt instanceof PointerEventArgs && evt.eventType === PointerEventType.DRAG_CAPTURE_LOST),
    useViewCoordinates: false
  })

  // handle dragging the marquee
  marqueeClearInputMode.addEventListener('drag-starting', onDragStarting)
  marqueeClearInputMode.addEventListener('dragged', onDragged)
  marqueeClearInputMode.addEventListener('drag-canceled', onDragCanceled)
  marqueeClearInputMode.addEventListener('drag-finished', onDragFinished)

  // add this mode to the edit mode
  editMode.add(marqueeClearInputMode)

  // and install the edit mode into the canvas
  graphComponent.inputMode = editMode
}

/**
 * A renderer for the blue marquee rectangle.
 */
class ClearRectangleRenderer extends ObjectRendererBase {
  createVisual(context, renderTag) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('fill', 'rgba(0,187,255,0.65)')
    rect.setAttribute('stroke', 'rgba(77,131,153,0.65)')
    rect.setAttribute('stroke-width', '1.5')

    ClearRectangleRenderer.setBounds(rect, renderTag.selectionRectangle)
    return new SvgVisual(rect)
  }

  updateVisual(context, oldVisual, renderTag) {
    ClearRectangleRenderer.setBounds(oldVisual.svgElement, renderTag.selectionRectangle)
    return oldVisual
  }

  static setBounds(rect, bounds) {
    rect.setAttribute('x', String(bounds.x))
    rect.setAttribute('y', String(bounds.y))
    rect.setAttribute('width', String(bounds.width))
    rect.setAttribute('height', String(bounds.height))
  }
}

/**
 * The marquee rectangle is upon to be dragged.
 */
function onDragStarting(e) {
  const hitGroupNode = getHitGroupNode(e.context, e.context.canvasComponent.lastEventLocation)
  layoutHelper = new ClearAreaLayoutHelper(
    graphComponent,
    e.rectangle,
    hitGroupNode,
    componentAssignmentStrategy,
    clearAreaStrategy
  )
  layoutHelper.initializeLayout()
}

/**
 * The marquee rectangle is currently dragged. For each drag a new layout is calculated and applied
 * if the previous one is completed.
 */
function onDragged(e) {
  layoutHelper.clearRectangle = e.rectangle
  layoutHelper.runLayout()
}

/**
 * Dragging the marquee rectangle has been canceled so the state before the gesture must be restored.
 */
function onDragCanceled(e) {
  layoutHelper.clearRectangle = e.rectangle
  layoutHelper.cancelLayout()
}

/**
 * Dragging the marquee rectangle has been finished so
 * we execute the layout with the final rectangle.
 */
function onDragFinished(e) {
  layoutHelper.clearRectangle = e.rectangle
  layoutHelper.stopLayout()
}

/**
 * Returns the group node at the given location. If there is no group node, `null` is returned.
 */
function getHitGroupNode(context, location) {
  const hits = context.lookup(IHitTester).enumerateHits(context, location, GraphItemTypes.NODE)
  return hits.find((n) => graphComponent.graph.isGroupNode(n))
}

/**
 * Loads the sample graph associated with the given name
 */
function loadGraph(sampleName) {
  // @ts-ignore We don't have proper types for the sample data
  const data = SampleData[sampleName]

  const graph = graphComponent.graph
  graph.clear()

  const defaultNodeSize = graph.nodeDefaults.size
  const builder = new GraphBuilder(graph)
  builder.createNodesSource({
    data: data.nodes,
    id: 'id',
    parentId: 'parentId',
    layout: (data) => new Rect(data.x, data.y, defaultNodeSize.width, defaultNodeSize.height)
  })
  const groupStyle = createDemoGroupStyle({})
  // set hitTransparentContentArea to false so group nodes are properly hit in getHitGroupNode
  groupStyle.hitTransparentContentArea = false
  graph.groupNodeDefaults.style = groupStyle

  if (data.groups) {
    const nodesSource = builder.createGroupNodesSource({
      data: data.groups,
      id: 'id',
      parentId: 'parentId',
      layout: (data) => data // the data object itself has x, y, width, height properties
    })
  }
  builder.createEdgesSource(data.edges, 'source', 'target', 'id')

  builder.buildGraph()

  graph.edges.forEach((edge) => {
    if (edge.tag.sourcePort) {
      graph.setPortLocation(edge.sourcePort, Point.from(edge.tag.sourcePort))
    }
    if (edge.tag.targetPort) {
      graph.setPortLocation(edge.targetPort, Point.from(edge.tag.targetPort))
    }
    edge.tag.bends.forEach((bend) => {
      graph.addBend(edge, bend)
    })
  })

  graphComponent.fitGraphBounds()
}

/**
 * Registers actions for the items in the toolbar.
 */
function initializeUI() {
  const sampleGraphs = document.querySelector('#sample-graphs')
  addNavigationButtons(sampleGraphs).addEventListener('change', () => {
    const selectedIndex = sampleGraphs.selectedIndex
    const selectedOption = sampleGraphs.options[selectedIndex]
    loadGraph(selectedOption.value)
  })

  const assignmentStrategies = document.querySelector('#component-assignment-strategies')
  assignmentStrategies.addEventListener('change', () => {
    const selectedOption = assignmentStrategies.options[assignmentStrategies.selectedIndex]
    switch (selectedOption.value) {
      case 'single':
        componentAssignmentStrategy = ComponentAssignmentStrategy.SINGLE
        break
      case 'connected':
        componentAssignmentStrategy = ComponentAssignmentStrategy.CONNECTED
        break
      case 'clustering':
        componentAssignmentStrategy = ComponentAssignmentStrategy.CLUSTERING
        break
    }
  })

  const clearAreaStrategies = document.querySelector('#clear-area-strategies')
  clearAreaStrategies.addEventListener('change', () => {
    const selectedOption = clearAreaStrategies.options[clearAreaStrategies.selectedIndex]
    switch (selectedOption.value) {
      case 'local':
        clearAreaStrategy = ClearAreaStrategy.LOCAL
        break
      case 'local-uniform':
        clearAreaStrategy = ClearAreaStrategy.LOCAL_UNIFORM
        break
      case 'global':
        clearAreaStrategy = ClearAreaStrategy.GLOBAL
        break
      case 'preserve-shapes':
        clearAreaStrategy = ClearAreaStrategy.PRESERVE_SHAPES
        break
      case 'preserve-shapes-uniform':
        clearAreaStrategy = ClearAreaStrategy.PRESERVE_SHAPES_UNIFORM
        break
    }
  })
}

run().then(finishLoading)
