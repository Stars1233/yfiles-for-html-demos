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
  BaseClass,
  IEdge,
  ILabelModel,
  ILabelModelParameter,
  ILookup,
  OrientedRectangle
} from '@yfiles/yfiles'

/**
 * The TopEdgeLabelModel ensures that an edge label always "sticks" to the top of the visualization,
 * either at a specified y position or the top of the screen space when zoomed in.
 */
export class TopEdgeLabelModel extends BaseClass(ILabelModel) {
  y

  /**
   * Instantiates a new TopEdgeLabelModel.
   * @param y The top-most y-coordinate of all edge labels.
   */
  constructor(y) {
    super()
    this.y = y
  }

  /**
   * Returns an empty ILookup context.
   * @param label the label whose context is to be extracted.
   * @returns An empty ILookup
   */
  getContext(label) {
    return ILookup.EMPTY
  }

  /**
   * Extracts an oriented rectangle describing the geometry of a provided label.
   * @param label The label whose geometry is to be extracted.
   * @param layoutParameter An unused TopEdgeLabelModelParameter object.
   * @returns An oriented rectangle describing the geometry of the provided label.
   */
  getGeometry(label, layoutParameter) {
    const owner = label.owner
    if (owner instanceof IEdge) {
      return new OrientedRectangle(
        owner.sourcePort.location.x + 0.5 * label.preferredSize.height,
        this.y,
        label.preferredSize.width,
        label.preferredSize.height,
        -1,
        0
      )
    } else {
      return new OrientedRectangle()
    }
  }

  /**
   * Creates a new TopEdgeLabelModelParameter.
   * @returns A new TopEdgeLabelModelParameter object.
   */
  createParameter() {
    return new TopEdgeLabelModelParameter(this)
  }
}

/**
 * The TopEdgeLabelModelParameter
 */
export class TopEdgeLabelModelParameter extends BaseClass(ILabelModelParameter) {
  _model

  /**
   * Instantiates a new TopEdgeLabelModelParameter
   * @param _model The ILabelModel, i.e., TopEdgeLabelModel
   */
  constructor(_model) {
    super()
    this._model = _model
  }

  /**
   * Clone method.
   * @returns This
   */
  clone() {
    return this
  }

  /**
   * Get the model of the TopEdgeLabelModelParameter
   * @returns The TopEdgeLabelModelParameter's model, i.e., a TopEdgeLabelModel./
   */
  get model() {
    return this._model
  }
}
