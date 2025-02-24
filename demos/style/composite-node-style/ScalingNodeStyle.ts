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
  DelegatingNodeStyle,
  INode,
  INodeStyle,
  type IRenderContext,
  Rect,
  SimpleNode,
  Visual
} from '@yfiles/yfiles'

/**
 * A custom node style that scales the visual representation of a node.
 * Extends the functionality of the {@link DelegatingNodeStyle} by applying a scaling transformation.
 */
export class ScalingNodeStyle extends DelegatingNodeStyle {
  private readonly scaledNode = new SimpleNode()

  /**
   * Initializes a new instance of the ScalingNodeStyle class.
   * @param style The wrapped node style to which the scaling transformation is applied.
   * @param sx The horizontal scaling factor. Defaults to 1.
   * @param sy The vertical scaling factor. Defaults to 1.
   */
  constructor(
    private readonly style: INodeStyle,
    private readonly sx = 1,
    private readonly sy = 1
  ) {
    super()
  }

  /**
   * Retrieves a scaled version of the node, applying the scaling transformation.
   *
   * This method calculates the new layout of the node by scaling its width and height
   * according to the specified horizontal (sx) and vertical (sy) scaling factors.
   * It then creates a new {@link SimpleNode} with the updated layout.
   *
   * @param node The node for which the scaled version is created.
   * @returns A new {@link INode} representing the scaled node with updated layout.
   */
  protected getNode(node: INode): INode {
    const {
      center: { x, y },
      width,
      height
    } = node.layout
    const w = width * this.sx
    const h = height * this.sy
    this.scaledNode.layout = new Rect(x - w / 2, y - h / 2, w, h)
    return this.scaledNode
  }

  /**
   * Gets the wrapped node style for the specified node.
   * @param node The node for which the wrapped style is retrieved.
   * @returns The wrapped {@link INodeStyle} instance.
   */
  protected getStyle(node: INode): INodeStyle {
    return this.style
  }

  /**
   * Creates the visual representation of the node, applying the scaling transformation.
   */
  protected createVisual(context: IRenderContext, node: INode): Visual | null {
    return super.createVisual(context, this.getNode(node))
  }

  /**
   * Updates the visual representation of the node to reflect any changes, preserving the scaling transformation.
   */
  protected updateVisual(context: IRenderContext, oldVisual: Visual, node: INode): Visual | null {
    return super.updateVisual(context, oldVisual, this.getNode(node))
  }
}
