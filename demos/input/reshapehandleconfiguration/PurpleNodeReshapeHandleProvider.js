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
  EventRecognizers,
  HandlePositions,
  HandleType,
  IHandle,
  IInputModeContext,
  INode,
  IReshapeHandler,
  NodeReshapeHandleProvider,
  NodeReshapeHandlerHandle,
  ReshapePolicy
} from '@yfiles/yfiles'
/**
 * A NodeReshapeHandleProvider for purple nodes that provides different handles for corners and borders.
 */
export class PurpleNodeReshapeHandleProvider extends NodeReshapeHandleProvider {
  constructor(node, reshapeHandler) {
    super(node, reshapeHandler, HandlePositions.BORDER)
  }
  getHandle(inputModeContext, position) {
    const handle = new NodeReshapeHandlerHandle(this.node, this.reshapeHandler, position)
    const atCorner = (position & HandlePositions.CORNERS) !== HandlePositions.NONE
    if (atCorner) {
      // handles at corners shall always keep the aspect ratio
      handle.reshapePolicy = ReshapePolicy.PROJECTION
      handle.ratioReshapeRecognizer = EventRecognizers.ALWAYS
      handle.type = HandleType.RESIZE
    } else {
      // handles at the sides shall ignore the aspect ratio and use another handle visualization
      handle.reshapePolicy = ReshapePolicy.NONE
      handle.ratioReshapeRecognizer = EventRecognizers.NEVER
      handle.type = HandleType.RESIZE
    }
    return handle
  }
}
