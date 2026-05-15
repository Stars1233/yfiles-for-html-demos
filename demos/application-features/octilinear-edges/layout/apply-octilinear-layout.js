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
import { EdgeDataKey, GenericLayoutData, Mapper } from '@yfiles/yfiles'
import { OctilinearEdgeStyleLayoutStage } from './OctilinearEdgeStyleLayoutStage'
import { OctilinearLayoutExecutor } from './OctilinearLayoutExecutor'
import { OctilinearEdgeStyle } from '../OctilinearEdgeStyle'
import { updateCuttingLength } from '../utils'

/**
 * The key under which the layout stores the cutting lengths for each edge's bends'. These values
 * are then used by the layout animation and written by it into the bend tags
 */
export const edgeBendsCuttingLengthKey = new EdgeDataKey('edgeBendsCuttingLengthKey')

/**
 * Applies the given core layout to the graph and transforms the result to an orthogonal layout with the
 * {@link OctilinearEdgeStyleLayoutStage}.
 *
 * It is assumed that the core-layout runs an octilinear edge router.
 *
 * @param graphComponent The {@link GraphComponent} to which the layout is applied.
 * @param coreLayout The layout that is run before transforming the result to an orthogonal layout.
 * @param coreLayoutData The associated layout data for the core layout.
 */
export async function applyOctilinearLayout(graphComponent, coreLayout, coreLayoutData) {
  // Ensure that the edges visualize the cutting length from the layout result. For example, when graphml files with
  // different edge styles have been loaded.
  graphComponent.graph.edges.forEach((edge) => {
    if (!(edge.style instanceof OctilinearEdgeStyle)) {
      edge.bends.forEach((b) => updateCuttingLength(b, 0))
      graphComponent.graph.setStyle(edge, graphComponent.graph.edgeDefaults.style)
    }
  })

  // Register a result data-mapper to receive the octilinear cutting lengths from the layout result.
  const edgeBendsCuttingLengths = new Mapper()
  let layoutData = new GenericLayoutData()
  layoutData.addItemMapping(edgeBendsCuttingLengthKey, edgeBendsCuttingLengths)
  if (coreLayoutData) {
    layoutData = layoutData.combineWith(coreLayoutData)
  }

  // Apply the octilinear core layout that introduces bends for each octilinear edge segment, afterward,
  // transform the result to an orthogonal layout and get the calculated octilinear edge segment lengths.
  const layoutExecutor = new OctilinearLayoutExecutor({
    graphComponent,
    layout: new OctilinearEdgeStyleLayoutStage(coreLayout),
    layoutData,
    animationDuration: '1s',
    animateViewport: true
  })

  // Store the result data mapper on the layout executor such that the layout animation can use the target values.
  layoutExecutor.edgeBendsCuttingLengths = edgeBendsCuttingLengths

  await layoutExecutor.start()
}
