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
import { Timeline } from './Timeline'
import { getNodeData } from '../data-types'
import { updateLayout } from '../graph/layout'

/**
 * Initializes a timeline component with timeframe rectangle and play button,
 * and register click and hover event listeners on its bar elements.
 * @returns The timeline component
 */
export function initializeTimeline(graphComponent, graphLayer, map) {
  const timelineStyle = {
    timeframe: { fill: '#6dcae6cc', stroke: 'transparent' },
    barHover: { fill: 'transparent', stroke: '#00d8ff' },
    barSelect: { fill: '#00d8ff', stroke: 'transparent' },
    sectionSelect: { fill: 'none', stroke: 'none' },
    legend: { even: { backgroundFill: '#70757d' }, odd: { backgroundFill: '#999' } }
  }

  const timeline = new Timeline(
    'timeline-component',
    (node) => {
      return { start: node.date.getTime(), end: node.date.getTime() }
    },
    timelineStyle,
    true,
    true,
    false,
    true
  )

  // Build timeline with the data stored in graph nodes
  timeline.items = graphComponent.graph.nodes.map(getNodeData).toArray()

  timeline.timeframe = [new Date('2025-03-01'), new Date('2025-05-15')]

  timeline.setBarSelectListener((items) => {
    const selection = graphComponent.selection
    selection.clear()

    const selectedItems = new Set(items.map((item) => item.id))
    graphComponent.graph.nodes.forEach((node) => {
      const nodeData = getNodeData(node)
      if (selectedItems.has(nodeData.id)) {
        selection.add(node)
      }
    })
  })

  timeline.setBarHoverListener((items) => {
    const highlights = graphComponent.highlights
    highlights.clear()

    const selectedItems = new Set(items.map((item) => item.id))
    graphComponent.graph.nodes.forEach((node) => {
      const nodeData = getNodeData(node)
      if (selectedItems.has(nodeData.id)) {
        highlights.add(node)
      }
    })
  })

  timeline.setFilterChangedListener(() => {
    scheduleAsyncFunction(async () => {
      await updateLayout(graphLayer, map)
    })
  })

  return timeline
}

let currentPromise = Promise.resolve()
let pendingFunction

/**
 * Schedules an asynchronous function to be executed after a delay.
 * This function ensures that only the last function is executed,
 * even if multiple functions are scheduled within the delay.
 * @param asyncFn The asynchronous function to be executed.
 */
function scheduleAsyncFunction(asyncFn) {
  // Cancel the previous pending function, if any
  pendingFunction = asyncFn

  // Return a promise that schedules execution
  currentPromise = currentPromise.then(() => {
    return new Promise((resolve, reject) => {
      // Use a timeout to ensure that only the last function is executed
      setTimeout(async () => {
        if (pendingFunction === asyncFn) {
          // Check if this is still the last scheduled
          try {
            await asyncFn()
            resolve()
          } catch (error) {
            reject(error)
          }
        } else {
          resolve() // Skip this if it's not the last request
        }
      }, 0)
    })
  })
}
