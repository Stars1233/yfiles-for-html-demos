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
import { Graph, GraphComponent, LayoutOrientation, License } from '@yfiles/yfiles'

import { FlowchartConfiguration } from './FlowchartConfiguration'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { finishLoading } from '@yfiles/demo-resources/demo-page'
import { generateGraphMLIOHandler } from '../flowchart/style/generate-graphMLIO-handler'
import { saveGraphML } from '@yfiles/demo-utils/graphml-support'

let graphComponent: GraphComponent

/**
 * The HTML element used to show the action legend.
 */
let legendDiv: HTMLDivElement

let configuration: FlowchartConfiguration

const layoutOrientation = LayoutOrientation.TOP_TO_BOTTOM

/**
 * Bootstraps the demo.
 */
async function run(): Promise<void> {
  License.value = await fetchLicense()
  // initialize the GraphComponent
  graphComponent = new GraphComponent('graphComponent')
  legendDiv = document.querySelector<HTMLDivElement>('#legend')!
  configuration = new FlowchartConfiguration(layoutOrientation)

  // register actions for the toolbar
  initializeUI()

  // setup a new flowchart diagram
  setUpNewDiagram()

  graphComponent.focus()
}

function setUpNewDiagram(): void {
  graphComponent.graph = new Graph()

  // initialize the default styling, highlighting,g etc. for graph items
  configuration.initializeGraphDefaults(graphComponent)

  // initialize the input mode including adding the flowchart actions to the GraphWizardInputMode
  graphComponent.inputMode = configuration.createInputMode(graphComponent, legendDiv)

  // setup the initial diagram
  configuration.initializeDiagram(graphComponent)

  graphComponent.focus()
}

function initializeUI(): void {
  document.querySelector('#new')!.addEventListener('click', setUpNewDiagram)
  document.querySelector('#layout-button')!.addEventListener('click', async () => {
    await configuration.runFromScratchLayout(graphComponent)
  })
  const graphMLIOHandler = generateGraphMLIOHandler()
  document.querySelector<HTMLInputElement>('#save-button')!.addEventListener('click', async () => {
    await saveGraphML(graphComponent, 'flowchart.graphml', graphMLIOHandler)
  })
}

run().then(finishLoading)
