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
import './legend-view/LegendViewComponent'
import './sankey-view/SankeyViewComponent'
import './properties-view/PropertiesViewComponent'
import './map-view/MapViewComponent'
import './neighborhood-view/NeighborhoodViewComponent'
import './filter-view/FilterViewComponent'
import './table-view/TableViewComponent'
import './pie-chart-view/MultiplePieChartViewComponent'
import './gauge-view/GaugeViewComponent'
import './timeline-view'
import './graph-view/GraphViewComponent'
import './timeline-slider-view/TimelineSliderViewComponent'
import './pie-chart-view/PieChartViewComponent'

/**
 * Registry of all available views in the dashboard.
 * Maps view IDs to factory functions that return the corresponding view components from the DOM.
 */
export const VIEW_REGISTRY = {
  legend: () => document.querySelector('#legend'),
  sankey: () => document.querySelector('#sankey-graph'),
  properties: () => document.querySelector('#properties'),
  map: () => document.querySelector('#map'),
  neighborhood: () => document.querySelector('#neighborhood'),
  filter: () => document.querySelector('#filter'),
  table: () => document.querySelector('#table'),
  pie: () => document.querySelector('#pie'),
  multiplePie: () => document.querySelector('#multiple-pie'),
  gauge: () => document.querySelector('#gauge-view'),
  topology: () => document.querySelector('#topology-graph'),
  timeline: () => document.querySelector('#timeline'),
  timelineSlider: () => document.querySelector('#timeline-slider')
}

export const GRAPH_VIEW_IDS = [
  '#legend',
  '#sankey-graph',
  '#neighborhood',
  '#map',
  '#topology-graph',
  '#timeline-slider'
]

export const GRAPH_VIEW_SELECTOR = GRAPH_VIEW_IDS.join(', ')
