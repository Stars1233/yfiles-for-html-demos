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
  type ILayoutAlgorithm,
  ILayoutStage,
  type LayoutBend,
  type LayoutGraph,
  type Point
} from '@yfiles/yfiles'
import { EPS, type OctilinearBendTag } from '../utils'
import { edgeBendsCuttingLengthKey } from './apply-octilinear-layout'

/**
 * A layout stage that transforms octilinear edge routes to orthogonal edge routes.
 *
 * Octilinear edge routes usually consist of bends with a specific angle, which can be transformed to orthogonal
 * edge routes by adjusting the bend locations and removing the superfluous bends afterward. The octilinear
 * cutting length is stored in the mapper provided by the {@link edgeBendsCuttingLengthKey}.
 */
export class OctilinearEdgeStyleLayoutStage extends BaseClass(ILayoutStage) {
  private readonly _coreLayout: ILayoutAlgorithm | null

  get coreLayout(): ILayoutAlgorithm | null {
    return this._coreLayout
  }

  get enabled(): boolean {
    return true
  }

  constructor(coreLayout: ILayoutAlgorithm | null = null) {
    super()
    this._coreLayout = coreLayout
  }

  applyLayout(graph: LayoutGraph): void {
    this.coreLayout?.applyLayout(graph)

    // store the octilinear cutting lengths in the mapper to apply them to the bends afterward
    const edgeBendsMapper = graph.context.getItemData(edgeBendsCuttingLengthKey)!

    for (const edge of graph.edges) {
      const sourcePoint = edge.sourcePortLocation
      const targetPoint = edge.targetPortLocation
      const bends = edge.bends

      for (let i = 0; i < bends.size; i++) {
        const bend = bends.get(i)
        const bendLocation = bend.location

        const prevLocation = i === 0 ? sourcePoint : bends.get(i - 1).location
        const nextLocation = i === bends.size - 1 ? targetPoint : bends.get(i + 1).location

        const incomingVector = bendLocation.subtract(prevLocation)
        const outgoingVector = nextLocation.subtract(bendLocation)

        const normalizedDotProduct = this.normalizedDotProduct(incomingVector, outgoingVector)

        if (this.is90DegreeApart(normalizedDotProduct)) {
          // no need to delete the next bend, just store a cutting length of zero for this bend
          this.writeBendCuttingLength(bend, 0)
          continue
        }

        if (this.is135DegreeApart(normalizedDotProduct)) {
          const nextNextPoint =
            i === bends.size - 2
              ? targetPoint
              : i < bends.size - 2
                ? bends.get(i + 2).location
                : null

          if (nextNextPoint) {
            const nextOutgoingVector = nextNextPoint.subtract(nextLocation)

            if (
              this.isSameDirection(this.normalizedDotProduct(incomingVector, nextOutgoingVector))
            ) {
              // A "Z" shaped octilinear segment without an extra horizontal/vertical segment.
              // In this case, we need to keep both existing bends to preserve the octilinear shape.
              const nextBend = bends.get(i + 1)
              if (prevLocation.y === bendLocation.y) {
                // horizontal segment, the bends need to be moved horizontally
                const meanX = (bendLocation.x + nextLocation.x) * 0.5
                const cuttingLength = Math.abs(meanX - nextLocation.x)
                bend.x = meanX
                nextBend.x = meanX

                this.writeBendCuttingLength(bend, cuttingLength)
                this.writeBendCuttingLength(nextBend, cuttingLength)
              }
              if (prevLocation.x === bendLocation.x) {
                // vertical segment, the bends need to be moved vertically
                const meanY = (bendLocation.y + nextLocation.y) * 0.5
                const cuttingLength = Math.abs(meanY - nextLocation.y)

                bend.y = meanY
                nextBend.y = meanY

                this.writeBendCuttingLength(bend, cuttingLength)
                this.writeBendCuttingLength(nextBend, cuttingLength)
              }
              continue
            }
          }

          // An octilinear segment that is followed by a horizontal/vertical segment.
          // in this case, move one bend to make it orthogonally, which implicitly makes the other bend collinear.
          let cuttingLength = 0
          if (Math.abs(bendLocation.y - prevLocation.y) <= EPS) {
            cuttingLength = Math.abs(bendLocation.x - nextLocation.x)
            bend.x = nextLocation.x
          } else {
            cuttingLength = Math.abs(bendLocation.y - nextLocation.y)
            bend.y = nextLocation.y
          }
          this.writeBendCuttingLength(bend, cuttingLength)
        }

        // else 180°, collinear bend location, do nothing, will be removed afterward
      }
    }

    // remove collinear bends now
    for (const edge of graph.edges) {
      const bendCuttingLengths: number[] = []
      const bends = edge.bends.toArray()
      for (let i = 0; i < bends.length; i++) {
        const bend = bends[i]
        if (bend.tag) {
          bendCuttingLengths.push((bend.tag as OctilinearBendTag).cuttingLength)
        } else {
          graph.remove(bend)
        }
      }

      // store the cutting lengths in the output mapper
      edgeBendsMapper.set(edge, bendCuttingLengths)
    }
  }

  private normalizedDotProduct(v1: Point, v2: Point): number {
    return v1.normalized.scalarProduct(v2.normalized)
  }

  private is135DegreeApart(normalizedDotProduct: number): boolean {
    const target = Math.SQRT1_2 // -> 1 / Math.sqrt(2)
    return Math.abs(normalizedDotProduct - target) <= EPS
  }

  private is90DegreeApart(normalizedDotProduct: number): boolean {
    return Math.abs(normalizedDotProduct) <= EPS
  }

  private isSameDirection(normalizedDotProduct: number): boolean {
    return normalizedDotProduct >= 1 - EPS
  }

  private writeBendCuttingLength(bend: LayoutBend, cuttingLength: number): void {
    if (!bend.tag) {
      bend.tag = { cuttingLength: cuttingLength } as OctilinearBendTag
    }
  }
}
