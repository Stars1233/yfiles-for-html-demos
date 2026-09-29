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
  type GraphComponent,
  type IEdge,
  type INode,
  type WebGLAnimation,
  WebGLGraphModelManager
} from '@yfiles/yfiles'
import { getEdgeTag, getNodeTag } from './types'

/** Tracks whether a beacon animation is currently active. */
let beaconActive = false

/** Stores the current beacon animation for cleanup. */
let beaconAnimation: WebGLAnimation | null = null

const beaconInputElement = document.querySelector<HTMLInputElement>('#error-beacon-animation')!

/**
 * Initializes the error/beacon animation UI and wiring for the given GraphComponent.
 *
 * @param graphComponent - The GraphComponent whose WebGLGraphModelManager will be used
 *                         to register animations on graph items with problems.
 * @param supportsWebGL2 - Whether the browser supports WebGL2
 */
export function initializeErrorBeaconAnimation(
  graphComponent: GraphComponent,
  supportsWebGL2: boolean
): void {
  const errorAnimationElement = document.querySelector<HTMLInputElement>('#error-animation')!
  errorAnimationElement.title = 'Available only when WebGL is supported'
  beaconInputElement.disabled = true
  if (supportsWebGL2) {
    beaconInputElement.addEventListener('change', async (e) => {
      if ((e.currentTarget as HTMLInputElement).checked) {
        await startBeaconAnimation(graphComponent)
      } else {
        await stopBeaconAnimation()
      }
    })
  }
}

/**
 * Starts the shared beacon animation and apply it to all nodes and edges
 * that are marked as problematic via their tag (getNodeTag / getEdgeTag).
 *
 * @param graphComponent - The GraphComponent whose graphModelManager (assumed to be
 *                         a WebGLGraphModelManager) will be used to create and set animations.
 */
async function startBeaconAnimation(graphComponent: GraphComponent): Promise<void> {
  const graphModelManager = graphComponent.graphModelManager as WebGLGraphModelManager
  beaconAnimation = graphModelManager.createBeaconAnimation({
    type: 'no-fade',
    pulseWidth: 30,
    color: '#ff6933',
    magnitude: 50,
    useViewCoordinates: false,
    timing: '300ms ease-in-out infinite'
  })

  const graph = graphComponent.graph
  graph.nodes.forEach((node) => {
    if (getNodeTag(node).problem) {
      graphModelManager.setAnimations(node, [beaconAnimation!])
    }
  })
  graph.edges.forEach((edge) => {
    if (getEdgeTag(edge).problem) {
      graphModelManager.setAnimations(edge, [beaconAnimation!])
    }
  })

  beaconActive = true
  await beaconAnimation.start()
}

/**
 * Stops the shared beacon animation if it is active.
 */
async function stopBeaconAnimation(): Promise<void> {
  if (beaconActive && beaconAnimation) {
    beaconActive = false
    await beaconAnimation.stop()
  }
}

/**
 * Stops any active beacon animation and reset the checkbox UI to unchecked.
 */
export async function resetBeaconAnimation(): Promise<void> {
  await stopBeaconAnimation()
  beaconInputElement.checked = false
}

/**
 * Removes any animations registered on the provided graph item (node or edge).
 *
 * @param graphComponent - The GraphComponent whose graphModelManager will be used
 * @param item - The INode or IEdge to clear animations from
 */
export function removeBeaconAnimation(graphComponent: GraphComponent, item: INode | IEdge): void {
  const supportsWebGL = graphComponent.graphModelManager instanceof WebGLGraphModelManager
  if (supportsWebGL) {
    ;(graphComponent.graphModelManager as WebGLGraphModelManager).setAnimations(item, [])
  }
}
