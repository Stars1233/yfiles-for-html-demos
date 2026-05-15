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
  GraphComponent,
  GraphEditorInputMode,
  GraphSnapContext,
  License,
  Stroke
} from '@yfiles/yfiles'
import { OctilinearEdgeStyle } from './OctilinearEdgeStyle'
import graphData from './sample.json'
import { registerOctilinearSegmentHandler } from './register-octilinear-segment-handler'
import { applyOctilinearLayout } from './layout/apply-octilinear-layout'
import './styles.css'
import { initializeToolbar } from './initialize-toolbar'
import { createHierarchicalLayout } from './utils'
import licenseData from '../../../lib/license.json'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import { buildGraph } from '@yfiles/demo-utils/build-graph'

/**
 * Bootstraps the demo.
 */
async function run(): Promise<void> {
  License.value = licenseData

  // initialize graph component
  const graphComponent = new GraphComponent('#graphComponent')
  // add some padding to prevent overlaps with the demo toolbar
  graphComponent.contentMargins = [80, 10, 10, 10]

  // enable graph editing
  graphComponent.inputMode = new GraphEditorInputMode({ snapContext: new GraphSnapContext() })

  // register octilinear segment interaction handlers
  registerOctilinearSegmentHandler(graphComponent)

  // configure the OctilinearEdgeStyle that renders bends as octilinear segments
  graphComponent.graph.edgeDefaults.style = new OctilinearEdgeStyle(
    Stroke.from('2px solid currentColor'),
    new Arrow({ stroke: null, fill: 'currentColor', type: 'triangle' }),
    30
  )

  // load sample graph
  buildGraph(graphComponent.graph, graphData)

  // make sure the graph is centered in the view before arranging it
  await graphComponent.fitGraphBounds()

  // apply an octilinear routed layout
  await applyOctilinearLayout(graphComponent, createHierarchicalLayout())

  // enable undo after the initial graph was populated since we don't want to allow undoing that
  graphComponent.graph.undoEngineEnabled = true

  initializeToolbar(graphComponent)
}

void run().then(finishLoading)
