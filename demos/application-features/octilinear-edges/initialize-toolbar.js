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
import { applyOctilinearLayout } from './layout/apply-octilinear-layout'
import { EdgeRouter, EdgeRouterRoutingStyle, GraphMLIOHandler } from '@yfiles/yfiles'
import { enableOctilinearEdgeStyleSerialization, OctilinearEdgeStyle } from './OctilinearEdgeStyle'
import { openGraphML, saveGraphML } from '@yfiles/demo-utils/graphml-support'
import {
  createHierarchicalLayout,
  getMaxCuttingLength,
  segmentLengthToCuttingLength,
  updateCuttingLength
} from './utils'

/**
 * Creates a configured {@link GraphMLIOHandler} that serializes the {@link OctilinearEdgeStyle}.
 */
function createGraphMLIOHandler() {
  const ioHandler = new GraphMLIOHandler()
  enableOctilinearEdgeStyleSerialization(ioHandler)
  return ioHandler
}

/**
 * Initializes the toolbar for the demo.
 */
export function initializeToolbar(graphComponent) {
  document.querySelector('#open-file-button').addEventListener('click', async () => {
    await openGraphML(graphComponent, createGraphMLIOHandler())
    graphComponent.graph.undoEngine?.clear()
  })
  document.querySelector('#save-button').addEventListener('click', async () => {
    await saveGraphML(graphComponent, 'octilinear-graph.graphml', createGraphMLIOHandler())
  })

  document.querySelector('#octilinear-segment-length-slider').addEventListener('input', (evt) => {
    const segmentLength = Number(evt.target.value)
    graphComponent.graph.edges.forEach((edge) => {
      const edgeStyle = edge.style
      if (edgeStyle instanceof OctilinearEdgeStyle) {
        // set it in the edge style (for new bends)
        edgeStyle.preferredOctilinearSegmentLength = segmentLength
        edge.bends.forEach((bend) => {
          const maxCuttingLength = getMaxCuttingLength(bend)
          // live update the cutting length (for existing bends)
          updateCuttingLength(
            bend,
            Math.min(segmentLengthToCuttingLength(segmentLength), maxCuttingLength)
          )
        })
      }
    })
    graphComponent.invalidate()
  })

  document.querySelector('#apply-layout-button').addEventListener('click', async () => {
    void applyOctilinearLayout(graphComponent, createHierarchicalLayout(true))
  })

  document.querySelector('#apply-router-button').addEventListener('click', async () => {
    const octilinearRouter = new EdgeRouter({
      defaultEdgeDescriptor: { routingStyle: EdgeRouterRoutingStyle.OCTILINEAR }
    })
    await applyOctilinearLayout(graphComponent, octilinearRouter)
  })
}
