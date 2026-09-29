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
        '<p>This demo visualizes a knowledge graph and highlights potential data quality issues, providing interactive tools to inspect and resolve them.</p>' +
        '<p>Knowledge graphs are represented as triples (subject–predicate–object). Common issues include duplicate nodes, edges connected to incorrect endpoints, and isolated nodes.</p>'
    },
    {
      title: '<h3>Graph Visualization</h3>',
      content:
        '<p>The main graph displays nodes colored by cluster, computed using the Louvain Modularity Clustering algorithm.</p>' +
        '<p>Node size represents centrality, calculated using the PageRank algorithm.</p>' +
        '<p><b>Double-click</b> a <b>node</b> to open the <b>interactive neighborhood view</b> and inspect its directly connected neighbors.</p>',
      highlightId: 'graph-visualization',
      dialogConfig: { relativeToElement: 'south-west' }
    },
    {
      title: '<h3>Main Toolbar</h3>',
      content:
        '<p>Use the toolbar to interact with the visualization:</p>' +
        '<ul style="margin: 8px 0; padding-left: 20px;">' +
        '<li>Use the <b>Group By</b> dropdown to reorganize the graph by Clusters, Teams, or Location.</li>' +
        '<li>Use the <b>Search</b> box to find specific nodes in the graph.</li>' +
        '</ul>',
      highlightId: 'toolbar',
      dialogConfig: { relativeToElement: 'south-east' }
    },
    {
      title: '<h3>Interactive Neighborhood View</h3>',
      content:
        '<p>Click a node in this view to show its neighbors. The main graph will zoom to the selected node.</p>',
      highlightId: 'neighborhood-component',
      dialogConfig: { relativeToElement: 'west' }
    },
    {
      title: '<h3>Interactive Ontology View</h3>',
      content:
        '<p>The <b>Interactive Ontology View</b> displays all triples in the dataset. Use it to filter or fade out graph elements based on selected triples:</p>' +
        '<ul style="margin: 8px 0; padding-left: 20px;">' +
        '<li>Click an edge to highlight items matching its triplet (subject, predicate, object).</li>' +
        '<li>Click an edge to filter the graph to show only items matching its triplet.</li>' +
        '<li>Click a node or edge to show or hide its type.</li>' +
        '<li>Press <span class="icon-text">reset_settings</span> to reset all filters and highlights.</li>' +
        '</ul>',
      highlightId: 'ontology-view',
      dialogConfig: { relativeToElement: 'west' }
    },
    {
      title: '<h3>Problem Detection</h3>',
      content:
        '<p>Investigate the detected data quality issues.</p>' +
        '<p>For each issue, you can zoom to affected nodes, apply automatic fixes, merge duplicates, remove isolated nodes, or fix incorrect endpoints.</p>' +
        '<p>Enable <b>Spotlight all issues</b> to highlight problematic elements with a beacon animation.</p>',
      highlightId: 'data-problem-detection',
      dialogConfig: { relativeToElement: 'north-west' }
    },
    {
      title: "<h3>You're Ready to Explore!</h3>",
      content:
        '<p>You now know the basics of exploring and improving the quality of this knowledge graph.</p>' +
        '<p>Happy exploring!</p>'
    }
  ]
}
