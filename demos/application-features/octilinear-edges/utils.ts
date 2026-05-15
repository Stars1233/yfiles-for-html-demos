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
  HierarchicalLayout,
  HierarchicalLayoutRoutingStyle,
  type IBend,
  IPort,
  type Point,
  RoutingStyleDescriptor
} from '@yfiles/yfiles'
import { OctilinearEdgeStyle } from './OctilinearEdgeStyle'

export type OctilinearBendTag = { cuttingLength: number }
export type Corner = 'TopLeft' | 'TopRight' | 'BottomLeft' | 'BottomRight'

export const EPS = 1e-6

/**
 * Creates a hierarchical layout with an octilinear routing style.
 */
export function createHierarchicalLayout(fromSketch = false): HierarchicalLayout {
  return new HierarchicalLayout({
    fromSketchMode: fromSketch,
    nodeDistance: 150,
    nodeToEdgeDistance: 70,
    defaultEdgeDescriptor: {
      minimumFirstSegmentLength: 30,
      minimumLastSegmentLength: 30,
      minimumOctilinearSegmentLength: 30,
      routingStyleDescriptor: new RoutingStyleDescriptor(HierarchicalLayoutRoutingStyle.OCTILINEAR)
    }
  })
}

/**
 * Calculates the cutting length for a given octilinear segment length. The cutting length is the
 * side of the triangle with the bend as tip and with the octilinear segment as hypotenuse
 */
export function segmentLengthToCuttingLength(segmentLength: number): number {
  return Math.sqrt(0.5 * Math.pow(segmentLength, 2))
}

/**
 * Returns the cutting length of the given bend or port stored in the item's tag or the preferred
 * length set on the style if no tag is present.
 */
export function getCuttingLength(item: IBend | IPort): number {
  if (item instanceof IPort) {
    return 0
  }

  if (isOctilinearBendTag(item.tag)) {
    return item.tag.cuttingLength
  } else if (item.owner.style instanceof OctilinearEdgeStyle) {
    return segmentLengthToCuttingLength(item.owner.style.preferredOctilinearSegmentLength)
  }

  return 0
}

/**
 * Returns the previous bend or the source port of the given bend.
 */
export function getPreviousEdgeItem(bend: IBend): IBend | IPort {
  const bendIndex = bend.index
  const edge = bend.owner
  return bendIndex === 0 ? edge.sourcePort : edge.bends.get(bendIndex - 1)
}

/**
 * Returns the next bend or the target port of the given bend.
 */
export function getNextEdgeItem(bend: IBend): IBend | IPort {
  const bendIndex = bend.index
  const edge = bend.owner
  return bendIndex === edge.bends.size - 1 ? edge.targetPort : edge.bends.get(bendIndex + 1)
}

/**
 * Calculates the current cutting length of the given bend or port based on the edge's geometry.
 */
export function getVisualCuttingLength(item: IBend | IPort): number {
  if (item instanceof IPort) {
    return 0
  }

  const prevItem = getPreviousEdgeItem(item)
  const nextItem = getNextEdgeItem(item)
  return getVisualCuttingLengthForItems(prevItem, item, nextItem)
}

/**
 * Calculates the current cutting length of the given bend or port based on the edge's geometry.
 */
export function getVisualCuttingLengthForItems(
  prevItem: IBend | IPort,
  bend: IBend,
  nextItem: IBend | IPort
): number {
  const bendPoint = bend.location.toPoint()
  const prevPoint = prevItem.location.toPoint()
  const nextPoint = nextItem.location.toPoint()

  const vectorToPrev = prevPoint.subtract(bendPoint)
  const vectorToNext = nextPoint.subtract(bendPoint)
  const prevBendDist = vectorToPrev.vectorLength
  const nextBendDist = vectorToNext.vectorLength

  const bendCuttingLength = getCuttingLength(bend)
  const prevCuttingLength = getCuttingLength(prevItem)
  const nextCuttingLength = getCuttingLength(nextItem)

  // the available space between neighboring bends is split regarding the ratio of their cutting length
  const prevMaxFraction =
    bendCuttingLength === 0 ? 0 : bendCuttingLength / (bendCuttingLength + prevCuttingLength)
  const nextMaxFraction =
    bendCuttingLength === 0 ? 0 : bendCuttingLength / (bendCuttingLength + nextCuttingLength)

  const prevMax = prevMaxFraction * prevBendDist
  const nextMax = nextMaxFraction * nextBendDist

  return Math.min(bendCuttingLength, prevMax, nextMax)
}

/**
 * Calculates the maximum cutting length of the given bend based on the edge's geometry.
 */
export function getMaxCuttingLength(bend: IBend): number {
  const edge = bend.owner
  const bendIndex = bend.index

  const prevItem = bendIndex === 0 ? edge.sourcePort : edge.bends.get(bendIndex - 1)
  const nextItem =
    bendIndex === edge.bends.size - 1 ? edge.targetPort : edge.bends.get(bendIndex + 1)

  const bendPoint = bend.location.toPoint()
  const prevPoint = prevItem.location.toPoint()
  const nextPoint = nextItem.location.toPoint()

  const prevCuttingLength = getVisualCuttingLength(prevItem)
  const nextCuttingLength = getVisualCuttingLength(nextItem)

  const vectorToPrev = prevPoint.subtract(bendPoint)
  const vectorToNext = nextPoint.subtract(bendPoint)

  return Math.min(
    vectorToPrev.vectorLength - prevCuttingLength,
    vectorToNext.vectorLength - nextCuttingLength
  )
}

/**
 * Writes the given cutting length in the bend's tag.
 * @param bend The bend for which the cutting length should be updated.
 * @param cuttingLength The new cutting length of the bend.
 */
export function updateCuttingLength(bend: IBend | null, cuttingLength: number | undefined): void {
  if (bend && typeof cuttingLength !== 'undefined') {
    bend.tag = { cuttingLength: cuttingLength } as OctilinearBendTag
  }
}

function isOctilinearBendTag(tag: unknown): tag is OctilinearBendTag {
  return !!tag && typeof (tag as OctilinearBendTag).cuttingLength !== 'undefined'
}

/**
 * Calculates the offset of the handle to its given bend based on the current cutting length.
 */
export function getHandleOffset(bend: IBend): Point {
  const edge = bend.owner
  const bendIndex = bend.index

  const prevItem = bendIndex === 0 ? edge.sourcePort : edge.bends.get(bendIndex - 1)
  const nextItem =
    bendIndex === edge.bends.size - 1 ? edge.targetPort : edge.bends.get(bendIndex + 1)

  const bendPoint = bend.location.toPoint()
  const prevPoint = prevItem.location.toPoint()
  const nextPoint = nextItem.location.toPoint()

  const vectorToPrev = prevPoint.subtract(bendPoint)
  const vectorToNext = nextPoint.subtract(bendPoint)

  const cuttingLength = getVisualCuttingLengthForItems(prevItem, bend, nextItem)

  return vectorToPrev.normalized
    .multiply(0.5 * cuttingLength)
    .add(vectorToNext.normalized.multiply(0.5 * cuttingLength))
}

/**
 * Calculates the corner type of the given bend based on the edge's geometry.
 */
export function getCornerType(bend: IBend): Corner {
  const edge = bend.owner
  const bendIndex = bend.index

  const prevItem = bendIndex === 0 ? edge.sourcePort! : edge.bends.get(bendIndex - 1)!
  const nextItem =
    bendIndex === edge.bends.size - 1 ? edge.targetPort! : edge.bends.get(bendIndex + 1)!

  const bendPoint = bend.location.toPoint()
  const prevPoint = prevItem.location.toPoint()
  const nextPoint = nextItem.location.toPoint()

  const vectorToPrev = prevPoint.subtract(bendPoint)
  const vectorToNext = nextPoint.subtract(bendPoint)

  if (vectorToPrev.y > EPS || vectorToNext.y > EPS) {
    if (vectorToPrev.x > EPS || vectorToNext.x > EPS) {
      return 'TopLeft'
    } else {
      return 'TopRight'
    }
  } else {
    if (vectorToPrev.x > EPS || vectorToNext.x > EPS) {
      return 'BottomLeft'
    } else {
      return 'BottomRight'
    }
  }
}
