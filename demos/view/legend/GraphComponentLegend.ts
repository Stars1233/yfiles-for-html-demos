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
import { LegendBase } from './LegendBase'
import { GraphComponent, GraphViewerInputMode } from '@yfiles/yfiles'
import type { NodeTypeId } from './node-types'
import { maybeStartViewTransition } from '@yfiles/demo-app/modern/element-utils'

/**
 * Legend that displays the entries in a separate graph component.
 */
export class GraphComponentLegend extends LegendBase {
  private readonly anchor: HTMLElement
  private readonly container: HTMLElement
  private readonly header: HTMLElement
  private readonly legendGraphComponent: GraphComponent
  private collapsed = false

  constructor(graphComponent: GraphComponent) {
    super(graphComponent)
    this.anchor = document.querySelector<HTMLElement>('#legend-gc-anchor')!
    this.container = this.anchor.querySelector<HTMLElement>('#legendGcContainer')!
    this.header = this.container.querySelector<HTMLElement>('.graph-overview__header')!
    this.legendGraphComponent = new GraphComponent(
      this.container.querySelector<HTMLElement>('#legendGraphComponent')!
    )
    this.legendGraphComponent.contentMargins = 10
    // disable editing in the legend graph component
    this.legendGraphComponent.inputMode = new GraphViewerInputMode({
      selectableItems: 'none',
      focusableItems: 'none'
    })
    this.initializeCollapsibleHeader()
  }

  protected override onShow(): void {
    this.anchor.classList.remove('legend-gc-anchor--hidden')
  }

  protected override onHide(): void {
    this.anchor.classList.add('legend-gc-anchor--hidden')
  }

  protected override refreshCore(visibleTypes: ReadonlySet<NodeTypeId>): void {
    const legendGraph = this.legendGraphComponent.graph
    legendGraph.clear()
    this.addLegendEntries(visibleTypes, legendGraph)
    this.updateContainerSize(visibleTypes.size)
    void this.legendGraphComponent.fitGraphBounds()
  }

  private initializeCollapsibleHeader(): void {
    const showLegend = (show: boolean): void => {
      this.collapsed = !show
      this.header.textContent = show ? 'Legend' : 'list'
      this.header.title = show ? 'Close legend' : 'Show legend'
      this.header.classList.toggle('material-symbols-outlined', !show)
      this.container.classList.toggle('graph-overview--collapsed', !show)
      this.anchor.classList.toggle('anchor--collapsed', !show)
      if (show) {
        void this.legendGraphComponent.fitGraphBounds()
      }
    }

    showLegend(true)
    this.header.addEventListener('click', (evt): void => {
      // optional: use the same CSS transition as the graph overview
      maybeStartViewTransition((): void => {
        showLegend(this.collapsed)
      })
      evt.stopPropagation()
    })
  }

  /**
   * Updates the size of the legend graph component based on the number of entries.
   */
  private updateContainerSize(entryCount: number): void {
    const headerHeight = 40
    if (this.horizontal) {
      const contentWidth = Math.max(160, entryCount * 120 + 24)
      const contentHeight = 120
      this.anchor.style.width = `${contentWidth}px`
      this.anchor.style.height = `${headerHeight + contentHeight}px`
    } else {
      const contentHeight = Math.max(120, entryCount * 50 + 24)
      this.anchor.style.width = ''
      this.anchor.style.height = `${headerHeight + contentHeight}px`
    }
  }
}
