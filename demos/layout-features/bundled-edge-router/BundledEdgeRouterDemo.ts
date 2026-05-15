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
import { demoApp, graphComponent } from '@yfiles/demo-app/init'
import {
  Arrow,
  ArrowType,
  BezierEdgeStyle,
  BundledEdgeRouter,
  type BundledEdgeRouterStrategy,
  type BundledEdgeRouterStrategyStringValues,
  EdgeBundleDescriptor,
  ExteriorNodeLabelModel,
  GenericLabeling,
  type GraphComponent,
  LabelStyle,
  ShapeNodeStyle
} from '@yfiles/yfiles'
import graphData from './sample.json'

/**
 * Demonstrates how to configure the {@link BundledEdgeRouter} with a given strategy.
 */
async function applyBundledEdgeRouter(
  graphComponent: GraphComponent,
  strategy?: BundledEdgeRouterStrategy | BundledEdgeRouterStrategyStringValues
): Promise<void> {
  // Configure the bundled edge router with the specified strategy
  const bundledEdgeRouter = new BundledEdgeRouter({ strategy })

  // Set the desired bundling strength
  bundledEdgeRouter.edgeBundling.bundlingStrength = 0.85

  // Enable bundling and Bézier fitting so a Bézier curve is fitted to every edge.
  // In this case, we use the BezierEdgeStyle for a better visual result.
  bundledEdgeRouter.edgeBundling.defaultBundleDescriptor = new EdgeBundleDescriptor({
    bundled: true,
    bezierFitting: true
  })

  // Apply a labeling algorithm and set the bundled edge router as core layout
  const layout = new GenericLabeling({ coreLayout: bundledEdgeRouter, scope: 'node-labels' })
  // Apply the layout algorithm
  await graphComponent.applyLayoutAnimated(layout, '0.0s')

  // If no labeling is desired
  // await graphComponent.applyLayoutAnimated(bundledEdgeRouter, '0.0s')
}

demoApp.toolbar.addSelect(
  'Routing Strategy: ',
  [
    { value: 'spanner', label: 'Spanner-based' },
    { value: 'voronoi', label: 'Voronoi-based' }
  ],
  async (value: BundledEdgeRouterStrategyStringValues) => {
    await applyBundledEdgeRouter(graphComponent, value)
  },
  'spanner'
)

const graph = graphComponent.graph
// Define the node and label styles.
graph.nodeDefaults.style = new ShapeNodeStyle({ fill: '#012c69', shape: 'ellipse', stroke: 'none' })
graph.nodeDefaults.labels.style = new LabelStyle({
  backgroundFill: '#dcebf7',
  shape: 'round-rectangle',
  padding: 2
})
graph.nodeDefaults.labels.layoutParameter = ExteriorNodeLabelModel.TOP

// Because Bézier fitting is enabled, applying BezierEdgeStyle yields better visual results
graph.edgeDefaults.style = new BezierEdgeStyle({
  stroke: '0.2px solid #326BBB',
  sourceArrow: new Arrow({ cropAtPort: true, type: ArrowType.NONE }),
  targetArrow: new Arrow({ cropAtPort: true, type: ArrowType.NONE })
})

// Build the graph from JSON data
demoApp.buildGraphFromJson(graphData)

// Run an initial layout using the spanner-based strategy
await applyBundledEdgeRouter(graphComponent)
