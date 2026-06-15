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
import { IEdge, Rect } from '@yfiles/yfiles'
import { ItemState } from '../EventTimelineTypes'
import { EventTimelineAggregatedEdgesStyle } from '../styles/EventTimelineAggregatedEdgesStyle'

export class HyperEdgeInteraction {
  edgeAggregator
  coordinateMapping
  viewportManager
  clearHighlights
  onHyperEdgeClicked
  timeAccessorFunction

  constructor(args) {
    this.edgeAggregator = args.edgeAggregator
    this.coordinateMapping = args.coordinateMapping
    this.viewportManager = args.viewportManager
    this.clearHighlights = args.clearHighlights
    this.onHyperEdgeClicked = args.onHyperEdgeClicked
    this.timeAccessorFunction = args.timeAccessorFunction
  }

  async handleItemClicked(item) {
    if (!(item instanceof IEdge)) {
      return false
    }

    if (item.style instanceof EventTimelineAggregatedEdgesStyle) {
      const bundle = item.lookup(ItemState).representedGroup
      const nodes = bundle.edges.flatMap((edge) => [
        edge.sourceNode.layout.centerY,
        edge.targetNode.layout.centerY
      ])
      const yMinMax = nodes.reduce(
        (acc, val) => {
          if (val < acc.min) acc.min = val
          if (val > acc.max) acc.max = val
          return acc
        },
        { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
      )
      const coordRange = bundle.edgeRange.map((edge) =>
        this.coordinateMapping.timeToX(this.timeAccessorFunction(edge))
      )
      const height = yMinMax.max - yMinMax.min
      const bounds = new Rect(
        coordRange[0],
        yMinMax.min,
        coordRange[1] - coordRange[0],
        height
      ).getEnlarged([height * 0.1, (coordRange[1] - coordRange[0]) * 0.1])
      this.clearHighlights()
      await this.viewportManager.changeResolution2D(bounds)
      return true
    }

    if (this.edgeAggregator.representativeHyperEdges.includes(item)) {
      const bundle = item.lookup(ItemState).representedGroup
      this.clearHighlights()
      await this.onHyperEdgeClicked?.(bundle)
      return true
    }

    return false
  }
}
