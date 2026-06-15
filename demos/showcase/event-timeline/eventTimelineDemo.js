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
import { GraphComponent, License } from '@yfiles/yfiles'

import licenseData from '../../../lib/license.json'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import data from './resources/traffic-data.json'
import example from './resources/example.json'
import { EventTimeline } from './eventTimeline/EventTimeline'
import { EventTimelineSubgraph } from './eventTimeline/components/EventTimelineSubgraph'

const demoAccessors = {
  nodeGroupAccessor: (node) => {
    return node.tag.group
  },
  edgeTypeAccessor: (edge) => {
    return edge.tag.type
  },
  timeAccessorFunction: (edge) => {
    return new Date(edge.tag.time)
  }
}
/**
 * Runs the demo in its totality.
 */
async function run() {
  License.value = licenseData

  const exampleEventTimeline = new EventTimeline({
    selector: '#exampleGraphComponent',
    accessors: demoAccessors,
    config: { unitHeight: 100 }
  })
  await exampleEventTimeline.setData(example, true)

  const eventTimeline = new EventTimeline({
    selector: '#graphComponent',
    accessors: demoAccessors,
    config: { unitHeight: 100 },
    callbacks: {
      onHyperEdgeClicked: async (bundle) => {
        await subGraph.show(bundle)
      }
    }
  })

  const subGraphDialog = document.createElement('dialog')
  const subGraphComponent = new GraphComponent()
  subGraphDialog.append(subGraphComponent.htmlElement)
  eventTimeline.graphComponent.htmlElement.parentElement?.appendChild(subGraphDialog)

  const subGraph = new EventTimelineSubgraph(eventTimeline, subGraphComponent, subGraphDialog)

  await eventTimeline.setData(data, true)
  initializeUI(eventTimeline)
}

/**
 * Binds actions to the demo's UI controls.
 */
function initializeUI(eventTimeline) {
  document
    .getElementById('zoom-reset-button')
    .addEventListener('click', () => eventTimeline.resetZoom())
  document
    .getElementById('horizontal-increase-stretch-button')
    .addEventListener('click', () => eventTimeline.zoomHorizontal(-20))
  document
    .getElementById('horizontal-decrease-stretch-button')
    .addEventListener('click', () => eventTimeline.zoomHorizontal(20))
  document
    .getElementById('vertical-increase-stretch-button')
    .addEventListener('click', () => eventTimeline.zoomVertical(-20))
  document
    .getElementById('vertical-decrease-stretch-button')
    .addEventListener('click', () => eventTimeline.zoomVertical(20))
}

// Run the Demo
await run().then(finishLoading)
