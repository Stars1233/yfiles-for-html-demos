/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) by yWorks GmbH, Vor dem Kreuzberg 28,
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
  INode,
  IRenderContext,
  NodeStyleBase,
  SvgVisual,
  type TaggedSvgVisual
} from '@yfiles/yfiles'
import type { NumberValue } from 'd3'
import * as d3 from 'd3'

const margin = {
  top: 3,
  right: 3,
  bottom: 1,
  left: 3
}

const xHelper = d3.scaleBand<number>().padding(0.1)

const yHelper = d3.scaleLinear().nice()

const color = d3
  .scaleLinear<string, number>()
  .range(['#1dccc2', '#2f5b88'])
  .interpolate(d3.interpolateHcl)

type D3ChartNodeStyleVisual = TaggedSvgVisual<SVGGElement, RenderDataCache>

/**
 * A node style that triggers the sparkline rendering and includes the result in
 * the node visualization.
 */
export class D3ChartNodeStyle extends NodeStyleBase<D3ChartNodeStyleVisual> {
  /**
   * Creates the visual for a node.
   * @see Overrides {@link NodeStyleBase.createVisual}
   */
  createVisual(renderContext: IRenderContext, node: INode): D3ChartNodeStyleVisual {
    // create a g element and use it as a container for the sparkline visualization
    const g = window.document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // render the node
    const {
      layout: { x, y, width, height },
      tag: data
    } = node

    xHelper.domain(d3.range(0, data.length)).range([0, width])
    yHelper
      .domain([0, d3.max(data)] as Iterable<number>)
      .range([height - margin.bottom, margin.top])
    color.domain([0, d3.max(data)] as Iterable<number>)

    const group = d3.select(g)
    group
      .attr('transform', `translate(${x} ${y})`)
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'aliceblue')
      .attr('stroke', 'black')
      .attr('stroke-width', 1)

    group
      .append('g')
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d, i) => xHelper(i)!)
      .attr('y', (d) => yHelper(d as NumberValue))
      .attr('height', (d) => yHelper(0) - yHelper(d as NumberValue))
      .attr('width', xHelper.bandwidth())
      .attr('data-value', (d) => d as number)
      .attr('fill', (d) => color(d as NumberValue))
      .attr('stroke', 'none')

    return SvgVisual.from(g, new RenderDataCache(width, height, data))
  }

  /**
   * Re-renders the node using the old visual for performance reasons.
   * @see Overrides {@link NodeStyleBase.updateVisual}
   */
  updateVisual(
    renderContext: IRenderContext,
    oldVisual: D3ChartNodeStyleVisual,
    node: INode
  ): D3ChartNodeStyleVisual {
    const g = oldVisual.svgElement

    const {
      layout: { x, y, width, height },
      tag: data
    } = node

    xHelper.domain(d3.range(0, data.length)).range([0, width])
    yHelper
      .domain([0, d3.max(data)] as Iterable<number>)
      .range([height - margin.bottom, margin.top])
    color.domain([0, d3.max(data)] as Iterable<number>)

    const group = d3.select(g)
    group
      .attr('transform', `translate(${x} ${y})`)
      .select('rect')
      .attr('width', width)
      .attr('height', height)

    const oldCache = oldVisual.tag
    const newCache = new RenderDataCache(width, height, data)

    if (!newCache.equals(oldCache)) {
      oldVisual.tag = newCache

      const dataSelection = group.select('g').selectAll('rect').data(data)

      dataSelection
        .enter()
        .append('rect')
        .attr('x', (d, i) => xHelper(i)!)
        .attr('y', (d) => yHelper(d as NumberValue))
        .attr('height', (d) => yHelper(0) - yHelper(d as NumberValue))
        .attr('width', xHelper.bandwidth())
        .attr('data-value', (d) => d as number)
        .attr('fill', (d) => color(d as NumberValue))
        .attr('stroke', 'none')

      dataSelection.exit().remove()

      dataSelection
        .transition()
        .attr('x', (d, i) => xHelper(i)!)
        .attr('width', xHelper.bandwidth())
        .attr('y', (d) => yHelper(d as NumberValue))
        .attr('fill', (d) => color(d as NumberValue))
        .attr('height', (d) => yHelper(0) - yHelper(d as NumberValue))
    }
    return oldVisual
  }
}

class RenderDataCache {
  constructor(
    public width: number,
    public height: number,
    public data: number[]
  ) {}
  equals(other: RenderDataCache) {
    return (
      other &&
      this.width === other.width &&
      this.height === other.height &&
      this.data === other.data
    )
  }
}
