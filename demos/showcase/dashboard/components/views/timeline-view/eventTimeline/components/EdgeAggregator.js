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
import { ItemState } from '../EventTimelineTypes'

/**
 * Responsible for grouping visually overlapping edges into aggregate or hyper-edge
 * representatives. Edges that are horizontally close (within EDGE_AGGREGATION_DELTA) are first
 * grouped, then split by connected components; those with identical timestamps become hyper-edges,
 * while the rest become aggregate-edges. A synthetic representative IEdge is created for each
 * group and stored in {@link representativeAggregateEdges} or {@link representativeHyperEdges}.
 */
export class EdgeAggregator {
  // Representative edges
  representativeAggregateEdges = []
  representativeHyperEdges = []

  graph
  getEdgeDate
  doEdgesShareNodeTermini
  config

  /**
   * Instantiates a new EdgeAggregator object
   * @param graph The IGraph whose edges are to be aggregated.
   * @param getEdgeDate An accessor function with which to get an edge's timestamp as a Date object.
   * @param doEdgesShareNodeTermini A function with which to determine whether two edges share a
   * source or target node.
   * @param config The configuration that governs the aesthetics and behavior of the timeline.
   */
  constructor(graph, getEdgeDate, doEdgesShareNodeTermini, config) {
    this.graph = graph
    this.getEdgeDate = getEdgeDate
    this.doEdgesShareNodeTermini = doEdgesShareNodeTermini
    this.config = config
  }

  /**
   * Method with which to determine which edges are to be aggregated. This involves first
   * aggregating edges based on their relative horizontal positions, finding connecting components
   * within these aggregated components, and finally ignoring those edges that have exactly the
   * same timestamp.
   * @param sortedEdges A sorted IEnumerable of IEdges describing the order of edges in the
   * drawing.
   */
  aggregateEdges(sortedEdges) {
    // Remove previously created representative edges (avoid duplicates on re-run)
    this.removeRepresentativeEdges(this.representativeAggregateEdges)
    this.representativeAggregateEdges = []

    this.removeRepresentativeEdges(this.representativeHyperEdges)
    this.representativeHyperEdges = []

    const horizontallyAggregatedEdgeGroups = this.getHorizontalAggregatedEdgeGroups(sortedEdges)

    horizontallyAggregatedEdgeGroups.forEach((edgeGroup) => {
      // --- Hyperedges: DO NOT split by connected components ---
      const firstTime = this.getEdgeDate(edgeGroup[0]).getTime()
      const groupIsHyperEdge = edgeGroup.every(
        (edge) => this.getEdgeDate(edge).getTime() === firstTime
      )

      if (groupIsHyperEdge) {
        const edges = [...edgeGroup].sort(
          (a, b) => a.sourcePort.location.x - b.sourcePort.location.x
        )
        const hyperGroup = { edges, edgeRange: [edges[0], edges[edges.length - 1]] }

        const representative = this.createRepresentativeEdge(hyperGroup)
        this.representativeHyperEdges.push(representative)
        return
      }
      // for aggregations, split by connected components

      let connectedComponents = []
      edgeGroup.forEach((edgeA) => {
        const alreadyInGroup = connectedComponents.some((edgeSet) => edgeSet.has(edgeA))
        if (!alreadyInGroup) {
          const newEdgeSet = new Set([edgeA])
          edgeGroup.forEach((edgeB) => {
            if (this.doEdgesShareNodeTermini(edgeA, edgeB)) {
              newEdgeSet.add(edgeB)
            }
          })
          if (newEdgeSet.size > 1) {
            connectedComponents.push(newEdgeSet)
          }
        }
      })

      connectedComponents = this.mergeAggregatedEdgeGroups(connectedComponents)

      const hyperEdgeIndices = []
      connectedComponents.forEach((edgeSet, index) => {
        const edgeArray = Array.from(edgeSet)
        const firstDate = this.getEdgeDate(edgeArray[0]).getTime()
        const datesAreSame = edgeArray.every(
          (edge) => this.getEdgeDate(edge).getTime() === firstDate
        )
        if (datesAreSame) {
          hyperEdgeIndices.push(index)
        }
      })

      hyperEdgeIndices.reverse().forEach((index) => {
        const edgeArray = Array.from(connectedComponents[index])

        const edgeA = edgeArray[0]
        const edgeB = edgeArray[edgeArray.length - 1]
        const hyperGroup = { edges: edgeArray, edgeRange: [edgeA, edgeB] }

        const representative = this.createRepresentativeEdge(hyperGroup)
        this.representativeHyperEdges.push(representative)

        connectedComponents.splice(index, 1)
      })

      connectedComponents.forEach((edgeGroup) => {
        const edges = Array.from(edgeGroup).sort(
          (a, b) => a.sourcePort.location.x - b.sourcePort.location.x
        )
        const newGroup = { edges: edges, edgeRange: [edges[0], edges[edges.length - 1]] }

        const representative = this.createRepresentativeEdge(newGroup)
        this.representativeAggregateEdges.push(representative)
      })
    })
  }

  /**
   * Given a group of edges to be aggregated, create a new RepresentativeEdge from them.
   * @param group The AggregatedEdgeGroup to be represented by a representative edge.
   * @private
   * @returns The representative edge.
   */
  createRepresentativeEdge(group) {
    const rep = this.graph.createEdge(group.edges[0].sourceNode, group.edges[0].targetNode)

    const state = rep.lookup(ItemState)
    if (state) {
      state.representative = true
      state.representedGroup = group
      state.aggregated = false
      state.hyper = false
      state.visible = false
    }

    return rep
  }

  /**
   * Helper method to remove representative edges from the graph.
   * @param edges The edges to be removed.
   */
  removeRepresentativeEdges(edges) {
    edges.forEach((e) => {
      if (this.graph.contains(e)) {
        this.graph.remove(e)
      }
    })
  }

  /**
   * Find all edges that (based on their horizontal proximity) are to be aggregated.
   * @param sortedEdges A sorted IEnumerable of IEdges.
   * @private
   * @returns An Array of arrays of IEdges, each of which represents a particular set of
   * horizontally aggregated edges.
   */
  getHorizontalAggregatedEdgeGroups(sortedEdges) {
    const groups = []
    let previousX
    let currentGroup = []

    sortedEdges.forEach((edge) => {
      const currentX = edge.sourcePort.location.x
      if (
        previousX !== undefined &&
        Math.abs(currentX - previousX) <= this.config.edgeAggregationDelta
      ) {
        currentGroup.push(edge)
      } else {
        if (currentGroup.length > 1) groups.push(currentGroup)
        currentGroup = [edge]
      }
      previousX = currentX
    })

    if (currentGroup.length > 1) groups.push(currentGroup)
    return groups
  }

  /**
   * Given an array of edge groups, recursively merge those that form connected components.
   * @param edgeGroups An array of sets of IEdges which represent the various identified
   * aggregated edge groups.
   * @private
   * @returns An array of sets of IEdges representing the merged set of aggregated edge groups.
   */
  mergeAggregatedEdgeGroups(edgeGroups) {
    for (let i = 0; i < edgeGroups.length; i++) {
      for (let j = i + 1; j < edgeGroups.length; j++) {
        const setA = edgeGroups[i]
        const setB = edgeGroups[j]
        const intersection = [...setA].some((edge) => setB.has(edge))
        if (intersection) {
          const mergedSet = new Set([...setA, ...setB])
          edgeGroups.splice(j, 1)
          edgeGroups.splice(i, 1)
          edgeGroups.push(mergedSet)
          return this.mergeAggregatedEdgeGroups(edgeGroups)
        }
      }
    }
    return edgeGroups
  }

  updateEdgeMapping(sortedEdges) {
    const aggregatedEdges = new Set(
      this.representativeAggregateEdges.flatMap(
        (edge) => edge.lookup(ItemState).representedGroup.edges
      )
    )
    const hyperEdges = new Set(
      this.representativeHyperEdges.flatMap((edge) => edge.lookup(ItemState).representedGroup.edges)
    )

    sortedEdges.forEach((currEdge) => {
      const state = currEdge.lookup(ItemState)
      if (state) {
        state.aggregated = aggregatedEdges.has(currEdge)
        state.hyper = hyperEdges.has(currEdge)
        state.visible = true
      }
    })
  }
}
