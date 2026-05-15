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
  type GraphComponent,
  IAnimation,
  type IBend,
  type IEdge,
  type TimeSpan
} from '@yfiles/yfiles'
import { getCuttingLength, updateCuttingLength } from '../utils'

/**
 * An animation that changes the cutting length of a bend of an edge.
 *
 * If the bend is not known at the beginning of the animation, it is looked up lazily. The main graph animation
 * creates new bends in the first time step, afterward, the cutting length animation for the bend can start.
 */
export class CuttingLengthAnimation extends BaseClass(IAnimation) {
  /**
   * The {@link GraphComponent} to which the animation is applied.
   * @private
   */
  private graphComponent: GraphComponent

  /**
   * The bend for which this animation is responsible. May be initialized lazily during the animation.
   */
  private bend: IBend | null

  /**
   * The owner edge of the bend.
   */
  private readonly edge: IEdge

  /**
   * The target cutting lengths for the edge's bends. The array index corresponds to the index of the bend in the edge.
   */
  private readonly edgeCuttingLengths: number[]

  /**
   * The index of the bend in the edgeCuttingLengths array.
   */
  private readonly bendIndex: number

  /**
   * The preferred duration of the cutting length animation.
   */
  private readonly _preferredDuration: TimeSpan

  /**
   * Holds the initial cutting length of the bend. This is used to calculate the interpolated cutting length.
   */
  private startCuttingLength = 0

  /**
   * Whether this cutting length needs to be animated.
   */
  private needsAnimation = false

  constructor(
    graphComponent: GraphComponent,
    edge: IEdge,
    bend: IBend | null,
    bendIndex: number,
    edgeCuttingLengths: number[],
    preferredDuration: TimeSpan
  ) {
    super()
    this.graphComponent = graphComponent
    this.edge = edge
    this.bend = bend
    this.bendIndex = bendIndex
    this.edgeCuttingLengths = edgeCuttingLengths
    this._preferredDuration = preferredDuration
  }

  initialize(): void {
    this.startCuttingLength = this.bend ? getCuttingLength(this.bend) : 0
    this.needsAnimation = this.startCuttingLength !== this.getTargetCuttingLength()
  }

  animate(time: number): void {
    if (this.needsAnimation) {
      // if the bend was not there from the beginning, check again if it is created now
      this.configureAffectedBend()

      // interpolate and update the cutting length of the bend
      const targetCuttingLength = this.getTargetCuttingLength()
      if (time >= 1) {
        updateCuttingLength(this.bend, targetCuttingLength)
      } else {
        const interpolatedCuttingLength =
          this.startCuttingLength + (targetCuttingLength - this.startCuttingLength) * time
        updateCuttingLength(this.bend, interpolatedCuttingLength)
      }
      this.graphComponent.invalidate()
    }
  }

  cleanUp(): void {
    // Ensure the final cutting length is correct. For example, if bends have been removed during the
    // animation, the remaining bends can only be updated in the last step because it is unclear
    // during the animation, which bends are eventually removed.
    this.configureAffectedBend()
    updateCuttingLength(this.bend, this.getTargetCuttingLength())
  }

  get preferredDuration(): TimeSpan {
    return this._preferredDuration
  }

  /**
   * Returns the target cutting length that this animation should result to.
   */
  private getTargetCuttingLength(): number {
    return this.edgeCuttingLengths[this.bendIndex]
  }

  /**
   * Lazily determines the actual bend that this animation is responsible for.
   *
   * When new bends are created as a result of the main graph animation, the cutting length animation for the new bend
   * can start. This is done lazily because the bend is not available at the beginning of the animation.
   */
  private configureAffectedBend(): void {
    if (this.bend) {
      return
    }

    // when all bends are created, we can safely map the target cutting lengths
    const currentEdgeBends = this.edge.bends
    if (currentEdgeBends.size === this.edgeCuttingLengths.length) {
      this.bend = currentEdgeBends.at(this.bendIndex)!
      this.startCuttingLength = getCuttingLength(this.bend)
    }
  }
}
