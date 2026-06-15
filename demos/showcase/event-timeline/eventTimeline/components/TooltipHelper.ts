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
import type { IEdge, IGraph, INode } from '@yfiles/yfiles'
import type { TooltipAccessors } from '../EventTimelineTypes'
import { ItemState } from '../EventTimelineTypes'

/**
 * Helper class for creating tooltips for various graph elements.
 */
export class TooltipHelper {
  datetimeFormatOptions: Intl.DateTimeFormatOptions
  constructor(datetimeFormatOptions: Intl.DateTimeFormatOptions) {
    this.datetimeFormatOptions = datetimeFormatOptions
  }
  /**
   * Creates a title element for a tooltip.
   */
  createPropertyTitle(title: string): HTMLElement {
    const titleElement = document.createElement('h3')
    titleElement.classList.add('title')
    titleElement.textContent = title
    return titleElement
  }

  /**
   * Creates a separator element for a tooltip.
   */
  createPropertySeparator(): HTMLElement {
    const separator = document.createElement('div')
    separator.classList.add('separator')
    return separator
  }

  /**
   * Creates a row for a property in a tooltip.
   */
  createPropertyRow(label: string, value: string): HTMLElement {
    const row = document.createElement('div')
    row.classList.add('tooltip-row')
    const labelElement = document.createElement('span')
    labelElement.classList.add('tooltip-label')
    labelElement.textContent = label
    const valueElement = document.createElement('span')
    valueElement.classList.add('tooltip-value')
    valueElement.textContent = value
    row.appendChild(labelElement)
    row.appendChild(valueElement)
    return row
  }

  /**
   * Creates a tooltip for a node.
   * @param node The node for which to create a tooltip.
   * @param graph The graph containing the node.
   * @param accessors Accessor functions used to read label, group, and time from tags.
   */
  createNodeToolTip(node: INode, graph: IGraph, accessors: TooltipAccessors): HTMLElement {
    const state = node.lookup(ItemState)
    const toolTipContent = document.createElement('div')
    toolTipContent.appendChild(this.createPropertyTitle('Node'))
    toolTipContent.appendChild(this.createPropertyRow('Label: ', accessors.nodeLabelAccessor(node)))
    toolTipContent.appendChild(this.createPropertyRow('Group: ', accessors.nodeGroupAccessor(node)))
    // Get all edges connected to this node (incoming and outgoing)
    const allEdges: IEdge[] = []
    for (const edge of graph.inEdgesAt(node)) {
      allEdges.push(edge)
    }
    for (const edge of graph.outEdgesAt(node)) {
      allEdges.push(edge)
    }

    // If there are edges, find the first and last edges by time
    if (allEdges.length > 0) {
      const edgeTimes = allEdges
        .filter((edge) => {
          return !edge.lookup(ItemState)?.representative
        })
        .map((edge) => ({ edge, time: accessors.timeAccessorFunction(edge).getTime() }))

      // Sort by time to find first and last
      edgeTimes.sort((a, b) => a.time - b.time)

      const firstEdgeTime = new Date(edgeTimes[0].time)
      const lastEdgeTime = new Date(edgeTimes[edgeTimes.length - 1].time)

      toolTipContent.appendChild(this.createPropertySeparator())
      toolTipContent.appendChild(this.createPropertyTitle('First Edge'))
      toolTipContent.appendChild(
        this.createPropertyRow(
          'Date: ',
          firstEdgeTime.toLocaleDateString(undefined, this.datetimeFormatOptions)
        )
      )
      toolTipContent.appendChild(
        this.createPropertyRow(
          'Time: ',
          firstEdgeTime.toLocaleTimeString(undefined, this.datetimeFormatOptions)
        )
      )
      toolTipContent.appendChild(this.createPropertySeparator())
      toolTipContent.appendChild(this.createPropertyTitle('First Edge'))
      toolTipContent.appendChild(
        this.createPropertyRow(
          'Date: ',
          lastEdgeTime.toLocaleDateString(undefined, this.datetimeFormatOptions)
        )
      )
      toolTipContent.appendChild(
        this.createPropertyRow(
          'Time: ',
          lastEdgeTime.toLocaleTimeString(undefined, this.datetimeFormatOptions)
        )
      )
    }
    if (state?.highlightedAdjacent) {
      toolTipContent.appendChild(this.createPropertySeparator())
      const title = document.createElement('div')
      title.innerText = 'Neighbor of highlighted item'
      title.className = 'demo-tooltip__title'
      toolTipContent.appendChild(title)
    }

    return toolTipContent
  }

  /**
   * Creates a tooltip for an edge.
   * @param edge The edge for which to create a tooltip.
   * @param accessors Accessor functions used to read type and time from tags.
   */
  createEdgeToolTip(edge: IEdge, accessors: TooltipAccessors): HTMLElement {
    const toolTipContent = document.createElement('div')

    toolTipContent.appendChild(this.createPropertyTitle('Edge Details'))
    toolTipContent.appendChild(this.createPropertyRow('Type: ', accessors.edgeTypeAccessor(edge)))
    toolTipContent.appendChild(this.createPropertySeparator())

    const time = accessors.timeAccessorFunction(edge)
    toolTipContent.appendChild(
      this.createPropertyRow(
        'Date: ',
        time.toLocaleDateString(undefined, this.datetimeFormatOptions)
      )
    )
    toolTipContent.appendChild(
      this.createPropertyRow(
        'Time: ',
        time.toLocaleTimeString(undefined, this.datetimeFormatOptions)
      )
    )

    return toolTipContent
  }

  /**
   * Creates a tooltip for an aggregated edge.
   * @param edge The representative aggregated edge for which to create a tooltip.
   * @param accessors Accessor functions used to read type and time from tags.
   */
  createAggregatedEdgeToolTip(edge: IEdge, accessors: TooltipAccessors): HTMLElement {
    const group = edge.lookup(ItemState)!.representedGroup!
    const toolTipContent = document.createElement('div')

    toolTipContent.appendChild(this.createPropertyTitle('Aggregated Edges'))
    toolTipContent.appendChild(this.createPropertyRow('#Edges: ', group.edges.length.toString()))

    const nTypes = new Set(group.edges.map((e) => accessors.edgeTypeAccessor(e))).size
    toolTipContent.appendChild(this.createPropertyRow('#Types: ', nTypes.toString()))
    toolTipContent.appendChild(this.createPropertySeparator())

    const times = group.edges.map((e) => accessors.timeAccessorFunction(e).getTime())
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    if (minTime === maxTime) {
      const time = new Date(minTime)
      toolTipContent.appendChild(
        this.createPropertyRow(
          'Date: ',
          time.toLocaleDateString(undefined, this.datetimeFormatOptions)
        )
      )
      toolTipContent.appendChild(
        this.createPropertyRow(
          'Time: ',
          time.toLocaleTimeString(undefined, this.datetimeFormatOptions)
        )
      )
    } else {
      toolTipContent.appendChild(
        this.createPropertyRow('From: ', new Date(minTime).toLocaleString())
      )
      toolTipContent.appendChild(
        this.createPropertyRow(
          'To: ',
          new Date(maxTime).toLocaleString(undefined, this.datetimeFormatOptions)
        )
      )
    }

    return toolTipContent
  }
}
