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
import {
  Arrow,
  ArrowType,
  SmartEdgeLabelModel,
  FreeNodeLabelModel,
  GraphComponent,
  GraphEditorInputMode,
  GroupNodeLabelModel,
  GroupNodeStyle,
  HorizontalTextAlignment,
  LabelStyle,
  License,
  PolylineEdgeStyle,
  Size
} from '@yfiles/yfiles'
import { FlowchartNodeStyle, FlowchartNodeType } from './style/FlowchartStyle'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { configureTwoPointerPanning } from '@yfiles/demo-utils/configure-two-pointer-panning'
import { finishLoading } from '@yfiles/demo-resources/demo-page'
import {
  enableUI,
  getLayoutOptions,
  getSample,
  initializeOptionPanel
} from './option-panel/option-panel'
import { layoutFlowchart } from './layout/layout-flowchart'
import { loadFlowchart } from './model/load-flowchart'
import { generateGraphMLIOHandler } from './style/generate-graphMLIO-handler'
import { initializeSnapping } from './interaction/snapping'
import { initializeDnd } from './interaction/drag-and-drop'
import { openGraphML, saveGraphML } from '@yfiles/demo-utils/graphml-support'
let graphComponent = null
async function run() {
  License.value = await fetchLicense()
  graphComponent = new GraphComponent('graphComponent')
  initializeOptionPanel(loadSample, runLayout)
  configureUserInteraction()
  initializeGraphDefaults()
  initializeUI(graphComponent)
  await loadSample()
}
function initializeUI(graphComponent) {
  const graphMLIOHandler = generateGraphMLIOHandler()
  document.querySelector('#open-file-button').addEventListener('click', async () => {
    await openGraphML(graphComponent, graphMLIOHandler)
  })
  document.querySelector('#save-button').addEventListener('click', async () => {
    await saveGraphML(graphComponent, 'flowchart.graphml', graphMLIOHandler)
  })
}
async function loadSample() {
  const sample = getSample()
  loadFlowchart(graphComponent, sample)
  await runLayout()
}
async function runLayout() {
  enableUI(false)
  const layoutOptions = getLayoutOptions()
  await layoutFlowchart(graphComponent, layoutOptions)
  enableUI(true)
}
/**
 * Configures the input mode for the given graphComponent.
 */
function configureUserInteraction() {
  const graphEditorInputMode = new GraphEditorInputMode()
  initializeSnapping(graphEditorInputMode)
  initializeDnd(graphEditorInputMode)
  graphComponent.inputMode = graphEditorInputMode
  // use two-finger panning to allow easier editing with touch gestures
  configureTwoPointerPanning(graphComponent)
}
/**
 * Initializes defaults for the graph.
 */
function initializeGraphDefaults() {
  const graph = graphComponent.graph
  const nodeDefaults = graph.nodeDefaults
  nodeDefaults.style = new FlowchartNodeStyle(FlowchartNodeType.Start1)
  nodeDefaults.size = new Size(80, 40)
  nodeDefaults.labels.style = new LabelStyle({
    horizontalTextAlignment: HorizontalTextAlignment.CENTER
  })
  nodeDefaults.labels.layoutParameter = FreeNodeLabelModel.CENTER
  const edgeDefaults = graph.edgeDefaults
  edgeDefaults.style = new PolylineEdgeStyle({
    targetArrow: new Arrow(ArrowType.STEALTH),
    orthogonalEditing: true
  })
  edgeDefaults.labels.style = new LabelStyle({
    horizontalTextAlignment: HorizontalTextAlignment.CENTER
  })
  edgeDefaults.labels.layoutParameter = new SmartEdgeLabelModel({
    autoRotation: false
  }).createParameterFromSource(0)
  const groupNodeDefaults = graph.groupNodeDefaults
  groupNodeDefaults.style = new GroupNodeStyle({
    tabFill: 'rgb(214, 229, 248)'
  })
  groupNodeDefaults.labels.layoutParameter =
    new GroupNodeLabelModel().createTabBackgroundParameter()
}
void run().then(finishLoading)
