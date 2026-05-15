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
import { GraphComponent, LayoutExecutor, License } from '@yfiles/yfiles'
import licenseData from '../../lib/license.json'
import { finishLoading } from './modern/finish-loading'
import { initializeBasicDemoStyles } from '@yfiles/demo-utils/sample-graph'
import { DefaultApp } from './app/default-app'
import type { DemoApp } from './app/demo-app'
import { initializeSidePanel } from './initialize-ui'

License.value = licenseData
const graphComponent = new GraphComponent('#graphComponent')
graphComponent.maximumZoom = 5
graphComponent.minimumZoom = 0.2
initializeBasicDemoStyles(graphComponent.graph)

const toolbarFactory = () => document.querySelector<HTMLDivElement>('.toolbar')!

const sidebarFactory = () => {
  const sidebarPanel = document.createElement('div')
  sidebarPanel.className = 'interaction-panel'

  const descriptionPanel = document.querySelector<HTMLDivElement>('.description-panel')
  if (descriptionPanel) {
    descriptionPanel.before(sidebarPanel)
  } else {
    document.querySelector<HTMLDivElement>('.main-container')?.appendChild(sidebarPanel)
  }

  initializeSidePanel(document.querySelector('.interaction-panel'), 'Interaction')

  return sidebarPanel
}

const demoApp: DemoApp = new DefaultApp(
  toolbarFactory,
  sidebarFactory,
  document.querySelector<HTMLDivElement>('.yplay__message-host'),
  graphComponent
)

const graph = graphComponent.graph

finishLoading()

LayoutExecutor.ensure()

export { graphComponent, graph, demoApp }
