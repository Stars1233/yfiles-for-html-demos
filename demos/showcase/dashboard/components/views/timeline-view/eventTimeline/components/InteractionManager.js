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
import { HighlightInteraction } from '../interactions/HighlightInteraction'
import { TooltipInteraction } from '../interactions/TooltipInteraction'
import { NavigationInteraction } from '../interactions/NavigationInteraction'
import { CollapseInteraction } from '../interactions/CollapseInteraction'
import { HyperEdgeInteraction } from '../interactions/HyperEdgeInteraction'

export class InteractionManager {
  highlightInteraction
  tooltipInteraction
  navigationInteraction
  collapseInteraction
  hyperEdgeInteraction

  constructor(args) {
    const tooltipAccessors = {
      nodeLabelAccessor: args.nodeLabelAccessor,
      nodeGroupAccessor: args.nodeGroupAccessor,
      edgeTypeAccessor: args.edgeTypeAccessor,
      timeAccessorFunction: args.timeAccessorFunction
    }

    this.highlightInteraction = new HighlightInteraction(
      args.graphComponent,
      args.config,
      args.richInteraction,
      args.richInteraction ? args.edgeAggregator : undefined,
      args.richInteraction ? args.timescale : undefined,
      args.timeAccessorFunction
    )
    this.tooltipInteraction = new TooltipInteraction(
      args.graphComponent,
      tooltipAccessors,
      args.config,
      args.richInteraction ? args.edgeAggregator : undefined
    )
    this.navigationInteraction = new NavigationInteraction(
      args.graphComponent,
      args.richInteraction,
      args.config,
      args.richInteraction ? args.timescale : undefined,
      args.richInteraction ? args.coordinateMapping : undefined,
      args.richInteraction ? args.viewportManager : undefined,
      () => this.clearHighlights()
    )

    if (args.richInteraction) {
      this.collapseInteraction = new CollapseInteraction(args.onCollapseNodeGroup)
      this.hyperEdgeInteraction = new HyperEdgeInteraction({
        edgeAggregator: args.edgeAggregator,
        coordinateMapping: args.coordinateMapping,
        viewportManager: args.viewportManager,
        clearHighlights: () => this.clearHighlights(),
        onHyperEdgeClicked: args.onHyperEdgeClicked,
        timeAccessorFunction: args.timeAccessorFunction
      })
    }
  }

  configure() {
    this.highlightInteraction.configure()
    this.tooltipInteraction.configure()
    this.navigationInteraction.configure()
    if (this.collapseInteraction || this.hyperEdgeInteraction) {
      const inputMode = this.highlightInteraction.graphComponent.inputMode
      inputMode.addEventListener('item-clicked', async (evt) => {
        evt.handled = true

        if (await this.hyperEdgeInteraction?.handleItemClicked(evt.item)) {
          return
        }

        await this.collapseInteraction?.handleItemClicked(evt.item)
      })
    }
  }

  clearHighlights() {
    this.highlightInteraction.clearHighlights()
  }

  highlightFromTick(edges, highlightEdge = true) {
    this.highlightInteraction.highlightFromTick(edges, highlightEdge)
  }
}
