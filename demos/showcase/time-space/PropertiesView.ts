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
import type { NodeData } from './data-types'
import type { FilteredGraphWrapper, INode } from '@yfiles/yfiles'
import { badgeIconMap, getImageUrl } from './graph/styling'

/**
 * Creates the properties view panel to display the properties of the clicked elements.
 */
export class PropertiesView {
  private element: Element
  private filteredGraph: FilteredGraphWrapper

  /**
   * Creates the PropertiesView.
   */
  constructor(element: Element, filteredGraph: FilteredGraphWrapper) {
    this.element = element
    this.filteredGraph = filteredGraph
  }

  /**
   * Displays the properties of the given node.
   * @param item The given node
   */
  showNodeProperties(item: INode): void {
    const propertiesView = this.element.querySelector('#propertiesView')!

    const nodeData = item.tag as NodeData

    const levelPercent = isFinite(nodeData.level) ? Math.round(nodeData.level * 100) : 0

    const successorsEnum = this.filteredGraph.successors(item)
    const predecessorsEnum = this.filteredGraph.predecessors(item)

    const incomingItems =
      predecessorsEnum.size > 0
        ? Array.from(
            predecessorsEnum,
            (predecessor) =>
              `<div class="prop-value full-grid-width indented-text">▪︎ ${(predecessor.tag as NodeData).name}</div>`
          ).join('')
        : '<div class="prop-value">None</div>'

    const outgoingItems =
      successorsEnum.size > 0
        ? Array.from(
            successorsEnum,
            (successor) =>
              `<div class=\"prop-value full-grid-width indented-text\">▪︎ ${(successor.tag as NodeData).name}</div>`
          ).join('')
        : '<div class="prop-value">None</div>'

    const badgesItems =
      nodeData.badges && nodeData.badges.length > 0
        ? nodeData.badges
            .map((badge) => {
              return `<span class="badge-icon material-symbols-outlined" title="${badge}">${badgeIconMap[badge] ?? badge}</span>`
            })
            .join('')
        : ''

    propertiesView.innerHTML = `
      <div class="event-section">
        <div class="properties-view-header">
          <img class="event-avatar" src="${getImageUrl(nodeData.image)}" alt="Event Image" />
          <span class="event-title">${nodeData.name || ''}</span>
        </div>
        <div class="demo-properties__settings">
          <div class="prop-label">Latitude:</div>
          <div class="prop-value">${nodeData.lat}</div>
          <div class="prop-label">Longitude:</div>
          <div class="prop-value">${nodeData.lng}</div>
          <div class="prop-label">Date:</div>
          <div class="prop-value">${nodeData.date.toLocaleDateString()}</div>
          <div class="prop-label full-grid-width">Contamination Level:</div>
          <div class="progress-row full-grid-width">
            <div class="progress">
              <div class="progress-bar" role="progressbar" aria-valuenow="${levelPercent}" aria-valuemin="0" aria-valuemax="100" style="width: ${levelPercent}%;"></div>
            </div>
            <span class="progress-percent">${levelPercent}%</span>
          </div>
          <div class="prop-label">Incoming:</div>
          ${incomingItems}
          <div class="prop-label">Outgoing:</div>
          ${outgoingItems}
          <div class="prop-label">Description:</div>
          <div class="event-description full-grid-width">${nodeData.description || ''}</div>
          <div class="prop-label">Badges:</div>
          <div class="prop-value">
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              ${badgesItems || 'None'}
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Updates the graph statistics in the properties panel.
   */
  updateGraphStatistics(): void {
    const nodeCount = this.element.querySelector<HTMLDivElement>('#node-count')!
    const edgeCount = this.element.querySelector<HTMLDivElement>('#edge-count')!
    nodeCount.textContent = `${this.filteredGraph.nodes.size} / ${this.filteredGraph.wrappedGraph!.nodes.size}`
    edgeCount.textContent = `${this.filteredGraph.edges.size} / ${this.filteredGraph.wrappedGraph!.edges.size}`
  }

  /**
   * Clears the properties panel.
   */
  clearNodeProperties(): void {
    const propertiesView = this.element.querySelector('#propertiesView')!
    propertiesView.innerHTML = '<p>Select an event in the chart to show its properties.</p>'
  }
}
