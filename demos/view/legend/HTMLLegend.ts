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
import type { GraphComponent } from '@yfiles/yfiles'
import { createNodeStyleForType, NODE_TYPE_INFOS, type NodeTypeId } from './node-types'
import { LegendBase } from './LegendBase'

/**
 * Legend that consists of simple HTML elements. The icons are created using an SVG export from the node style.
 */
export class HTMLLegend extends LegendBase {
  private readonly container: HTMLElement
  private readonly listElement: HTMLElement

  constructor(graphComponent: GraphComponent) {
    super(graphComponent)
    this.container = document.querySelector<HTMLElement>('#legend-html')!
    this.listElement = this.container.querySelector<HTMLElement>('.legend-html__list')!

    this.listElement.addEventListener('mouseover', (evt): void => {
      graphComponent.highlights.clear()
      const entry = (evt.target as HTMLElement).closest<HTMLElement>('.legend-entry')
      if (entry) {
        for (const node of graphComponent.graph.nodes) {
          if (node.tag === entry.dataset.typeId) {
            graphComponent.highlights.add(node)
          }
        }
      }
    })
    this.listElement.addEventListener('mouseleave', (): void => graphComponent.highlights.clear())
  }

  protected override onShow(): void {
    this.container.classList.remove('legend-html--hidden')
  }

  protected override onHide(): void {
    this.container.classList.add('legend-html--hidden')
  }

  protected override refreshCore(visibleTypes: ReadonlySet<NodeTypeId>): void {
    this.listElement.replaceChildren()

    for (const type of visibleTypes) {
      const entry = document.createElement('div')
      entry.className = 'legend-entry'
      entry.dataset.typeId = type

      const icon = document.createElement('div')
      icon.appendChild(this.createNodeTypeVisual(createNodeStyleForType(type)))

      const label = document.createElement('span')
      label.textContent = NODE_TYPE_INFOS[type].name

      entry.append(icon, label)

      this.listElement.appendChild(entry)
    }
  }
}
