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
  type GraphComponent,
  type GraphViewerInputMode,
  IEdge,
  ILabel,
  INode
} from '@yfiles/yfiles'
import type { EdgeAggregator } from '../components/EdgeAggregator'
import { ItemState, type TooltipAccessors } from '../EventTimelineTypes'
import { TooltipHelper } from '../components/TooltipHelper'
import type { EventTimelineConfig } from '../EventTimelineConfig'
import type { ResolvedConfig } from 'vite'

export class TooltipInteraction {
  private readonly graphComponent: GraphComponent

  private readonly edgeAggregator?: EdgeAggregator

  private readonly tooltipAccessors: TooltipAccessors

  private readonly tooltipHelper: TooltipHelper
  constructor(
    graphComponent: GraphComponent,
    tooltipAccessors: TooltipAccessors,
    config: EventTimelineConfig,
    edgeAggregator?: EdgeAggregator
  ) {
    this.tooltipAccessors = tooltipAccessors
    this.edgeAggregator = edgeAggregator
    this.graphComponent = graphComponent
    this.tooltipHelper = new TooltipHelper(config.dateTimeFormatOptions)
  }

  configure(): void {
    ;(this.graphComponent.inputMode as GraphViewerInputMode).addEventListener(
      'query-item-tool-tip',
      (evt): void => {
        if (evt.handled) return
        const hyperEdges: Array<IEdge> = this.edgeAggregator?.representativeHyperEdges ?? []
        const aggregatedEdges: Array<IEdge> =
          this.edgeAggregator?.representativeAggregateEdges ?? []
        if (
          evt.item instanceof IEdge &&
          !hyperEdges.includes(evt.item) &&
          !aggregatedEdges.includes(evt.item)
        ) {
          evt.toolTip = this.tooltipHelper.createEdgeToolTip(evt.item, this.tooltipAccessors)
        } else if (evt.item instanceof IEdge && hyperEdges.includes(evt.item)) {
          evt.toolTip = this.tooltipHelper.createAggregatedEdgeToolTip(
            evt.item,
            this.tooltipAccessors
          )
        } else if (evt.item instanceof IEdge && aggregatedEdges.includes(evt.item)) {
          evt.toolTip = this.tooltipHelper.createAggregatedEdgeToolTip(
            evt.item,
            this.tooltipAccessors
          )
        } else if (evt.item instanceof INode) {
          evt.toolTip = this.tooltipHelper.createNodeToolTip(
            evt.item,
            this.graphComponent.graph,
            this.tooltipAccessors
          )
        } else if (evt.item instanceof ILabel) {
          const owner = evt.item.owner
          if (owner instanceof INode) {
            evt.toolTip = this.tooltipHelper.createNodeToolTip(
              owner,
              this.graphComponent.graph,
              this.tooltipAccessors
            )
          } else if (owner instanceof IEdge) {
            evt.toolTip = this.tooltipHelper.createEdgeToolTip(owner, this.tooltipAccessors)
          }
        }
        evt.handled = true
      }
    )
  }
}
