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
  type IPortOwner,
  IPortLocationModelParameter,
  type IPort,
  ILookup,
  IPortLocationModel,
  BaseClass,
  Point
} from '@yfiles/yfiles'

/**
 * A custom port location model that allows ports to be placed at absolute positions.
 * Unlike relative models, this places ports at fixed coordinates regardless of node transformations.
 *
 */
export class AbsoluteFreePortLocationModel extends BaseClass(IPortLocationModel) {
  /**
   * Creates a parameter for this port location model at the specified location.
   * @param owner The port owner (typically a node)
   * @param location The absolute position for the port
   * @returns A parameter describing the port's location
   */
  createParameter(owner: IPortOwner, location: Point): IPortLocationModelParameter {
    return new AbsoluteFreePortLocationModelParameter(this, location)
  }

  createDefaultParameter(): IPortLocationModelParameter {
    return new AbsoluteFreePortLocationModelParameter(this, Point.ORIGIN)
  }

  /**
   * Returns the lookup context for this port location model.
   * @param port The port to get the context for
   * @returns An empty lookup context
   */
  getContext(port: IPort): ILookup {
    return ILookup.EMPTY
  }

  /**
   * Gets the absolute location for the given port based on its parameter.
   * @param port The port to get the location for
   * @param locationParameter The parameter describing the port's location
   * @returns The absolute point where the port should be located
   * @throws Error if the parameter is not of the expected type
   */
  getLocation(port: IPort, locationParameter: IPortLocationModelParameter): Point {
    if (locationParameter instanceof AbsoluteFreePortLocationModelParameter) {
      return locationParameter.point
    } else {
      throw new Error('Not Supported')
    }
  }
}

/**
 * Parameter class storing the absolute position for a port.
 */
class AbsoluteFreePortLocationModelParameter extends BaseClass(IPortLocationModelParameter) {
  private readonly _model: AbsoluteFreePortLocationModel
  point: Point

  constructor(model: AbsoluteFreePortLocationModel, point: Point) {
    super()
    this._model = model
    this.point = point
  }

  get model(): AbsoluteFreePortLocationModel {
    return this._model
  }

  /**
   * Returns this parameter, as this is immutable.
   */
  clone(): this {
    return this
  }
}
