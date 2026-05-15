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
  type GeneralPath,
  type IBend,
  IBendSelectionTester,
  type IEdge,
  IEnumerable,
  type IInputModeContext,
  type Point,
  type Rect
} from '@yfiles/yfiles'
import { getHandleOffset } from './utils'

/**
 * A custom bend selection tester for octilinear edges that considers the translated bend handle location, so
 * that clicking the center of an octilinear segment actually selects the bend's handle.
 */
export class OctilinearBendSelectionTester extends BaseClass(IBendSelectionTester) {
  private edge: IEdge

  constructor(edge: IEdge) {
    super()
    this.edge = edge
  }

  /**
   * Returns the translated location of the given bend, taking into account the handle offset.
   * @param bend The bend for which to get the translated location.
   */
  private getTranslatedBendLocation(bend: IBend): Point {
    return bend.location.toPoint().add(getHandleOffset(bend))
  }

  getBendsInBox(context: IInputModeContext, rectangle: Rect): IEnumerable<IBend> {
    return this.edge.bends.filter((bend) => {
      return rectangle.contains(this.getTranslatedBendLocation(bend), context.hitTestRadius)
    })
  }

  getBendsInPath(context: IInputModeContext, lassoPath: GeneralPath): IEnumerable<IBend> {
    const result = new Array<IBend>()
    this.edge.bends.forEach((bend) => {
      const bendLocation = this.getTranslatedBendLocation(bend)
      if (lassoPath.areaOrPathContains(bendLocation, context.hitTestRadius)) {
        result.push(bend)
      }
    })
    return IEnumerable.from(result)
  }

  getHitBend(context: IInputModeContext, location: Point): IBend | null {
    const bends = this.edge.bends
    if (bends.size === 0) {
      return null
    }

    let minL = Number.MAX_VALUE
    let radius = context.hitTestRadius
    radius *= radius * 1.5
    let nearest: IBend | null = null
    bends.forEach((bend) => {
      const bendLocation = this.getTranslatedBendLocation(bend)
      const dx = bendLocation.x - location.x
      const dy = bendLocation.y - location.y
      const l = dx * dx + dy * dy
      if (l < radius) {
        if (l < minL) {
          minL = l
          nearest = bend
        }
      }
    })
    return nearest
  }
}
