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
export const tour = {
  tips: [
    {
      title: '<h3>Introduction</h3>',
      content:
        '<p>Welcome!</p>' +
        '<p>This dashboard lets you explore connected data across a graph, map, timeline, and table. Selections stay in sync across all views.</p>' +
        '<p>Click “Next” for a quick tour.</p>'
    },
    {
      title: '<h3>Examples</h3>',
      content:
        '<p>Switch between the <b>Healthcare</b> and <b>Electricity</b> dashboard. The data and a few panels change, but interactions remain the same.</p>',
      highlightId: 'switch-examples',
      dialogConfig: { relativeToElement: 'east' }
    },
    {
      title: '<h3>Description</h3>',
      content:
        '<p>A short description of the dashboard and its use-case, either <b>Healthcare</b> and <b>Electricity</b>.</p>',
      highlightId: 'description',
      dialogConfig: { relativeToElement: 'east' }
    },
    {
      title: '<h3>Topology Graph</h3>',
      content:
        '<p>The topology shows power producers, consumers and their interconnections. A heatmap indicates load intensity. Click a node to select it; related items highlight across all views.</p>',
      highlightId: 'main-layout',
      dialogConfig: { relativeToElement: 'west' }
    },
    {
      title: '<h3>Patient Transfer Flow</h3>',
      content:
        '<p>The Patient Transfer Flow graph shows hospitals and patient streams. A heatmap represents clinic occupancy levels. Click a node to select it; related items highlight across all views.</p>',
      highlightId: 'sankey',
      dialogConfig: { relativeToElement: 'west' }
    },
    {
      title: '<h3>Map</h3>',
      content:
        '<p>The map displays geolocated objects. Click a pin to select it and see details; zoom and pan to explore different regions.</p>',
      highlightId: 'map',
      dialogConfig: { relativeToElement: 'west' }
    },
    {
      title: '<h3>Filters</h3>',
      content:
        '<p>Filter by type or country to focus on a subset of the data. Use <b>Reset Filters</b> to clear all filters.</p>',
      highlightId: 'filter',
      dialogConfig: { relativeToElement: 'west' }
    },
    {
      title: '<h3>Gauge View</h3>',
      content:
        '<p>The gauges show staff availability, bed capacity, and current patient occupancy for each facility.</p>',
      highlightId: 'gauge',
      dialogConfig: { relativeToElement: 'east' }
    },
    {
      title: '<h3>Legend</h3>',
      content:
        '<p>The legend displays the colors assigned to each entity, providing a consistent color reference across all views.</p>',
      highlightId: 'legend',
      dialogConfig: { relativeToElement: 'east' }
    },
    {
      title: '<h3>Timeline</h3>',
      content:
        '<p>The timeline shows how the load changes over time. Use the slider to move through the period and click events to highlight related nodes in the graph.</p>',
      highlightId: 'timeline-slider',
      dialogConfig: { relativeToElement: 'west' }
    },
    {
      title: '<h3>Table</h3>',
      content:
        '<p>The table lists entities with type, name, and country. Click a row to select the entity.</p>',
      highlightId: 'table',
      dialogConfig: { relativeToElement: 'west' }
    },
    {
      title: '<h3>Power Mix</h3>',
      content: '<p>The pie chart shows the current power mix.</p>',
      highlightId: 'pie',
      dialogConfig: { relativeToElement: 'east' }
    },
    {
      title: '<h3>Neighborhood</h3>',
      content:
        '<p>The neighborhood view focuses on immediate connections and group members for quick context.</p>',
      highlightId: 'neighborhood',
      dialogConfig: { relativeToElement: 'east' }
    },
    {
      title: '<h3>Timeline</h3>',
      content:
        '<p>The timeline shows when patients are transferred between hospitals or units. ' +
        'Click on events to highlight patient streams and zoom in or out to adjust the level of ' +
        'detail horizontally and, with a modifier key (CTRL on Windows and Linux, CMD on macOS), ' +
        'vertically. Right-click and drag to select a timeframe. To reset the view, click the ' +
        '"Fit to View" button in the toolbar.</p>',
      highlightId: 'timeline',
      dialogConfig: { relativeToElement: 'west' }
    },
    {
      title: '<h3>Bed Capacity</h3>',
      content: '<p>The pie chart breaks down bed capacity by unit for each hospital.</p>',
      highlightId: 'multiple-pie',
      dialogConfig: { relativeToElement: 'east' }
    },
    {
      title: '<h3>Properties</h3>',
      content: '<p>The properties panel shows attributes of the selected entity.</p>',
      highlightId: 'properties',
      dialogConfig: { relativeToElement: 'west' }
    }
  ]
}
