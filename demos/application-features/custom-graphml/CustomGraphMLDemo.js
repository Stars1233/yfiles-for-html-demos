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
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EdgePathLabelModel,
  EdgeSides,
  ExteriorNodeLabelModel,
  GraphBuilder,
  GraphComponent,
  GraphEditorInputMode,
  GraphItemTypes,
  GraphMLIOHandler,
  GroupNodeLabelModel,
  GroupNodeStyle,
  HierarchicalLayout,
  IGraph,
  INode,
  KeyType,
  LabelStyle,
  LayoutExecutor,
  License,
  Mapper,
  Point,
  Size
} from '@yfiles/yfiles'
import { initDemoStyles } from '@yfiles/demo-resources/demo-styles'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { finishLoading } from '@yfiles/demo-resources/demo-page'
import graphData from './graph-data.json'
import { openGraphML, saveGraphML } from '@yfiles/demo-utils/graphml-support'
// Ensure that the LayoutExecutor class is not removed by build optimizers
// It is needed for the 'applyLayoutAnimated' method in this demo.
LayoutExecutor.ensure()
let graphComponent
/**
 * Symbolic name for the mapper that allows transparent access to the correct implementation even across
 * wrapped graphs.
 */
const DATE_TIME_MAPPER_KEY = 'DateTimeMapperKey'
let dateMapper
/**
 * Bootstraps the demo.
 */
async function run() {
  License.value = await fetchLicense()
  // initialize graph component
  graphComponent = new GraphComponent('#graphComponent')
  graphComponent.inputMode = new GraphEditorInputMode()
  // configures default styles for newly created graph elements
  initTutorialDefaults(graphComponent.graph)
  // sets up the data binding that stores the current date when a node is created
  enableDataBinding()
  // then build the graph from the given data set
  buildGraph(graphComponent.graph, graphData)
  // layout and center the graph
  graphComponent.graph.applyLayout(new HierarchicalLayout({ minimumLayerDistance: 35 }))
  await graphComponent.fitGraphBounds()
  // enable now the undo engine to prevent undoing of the graph creation
  graphComponent.graph.undoEngineEnabled = true
  // enable GraphML IO
  enableGraphML()
  // displays tooltips for the stored data items, so that something is visible to the user
  setupTooltips()
}
/**
 * Creates nodes and edges according to the given data.
 */
function buildGraph(graph, graphData) {
  const graphBuilder = new GraphBuilder(graph)
  graphBuilder.createNodesSource({
    data: graphData.nodeList.filter((item) => !item.isGroup),
    id: (item) => item.id,
    parentId: (item) => item.parentId
  })
  graphBuilder
    .createGroupNodesSource({
      data: graphData.nodeList.filter((item) => item.isGroup),
      id: (item) => item.id
    })
    .nodeCreator.createLabelBinding((item) => item.label)
  graphBuilder.createEdgesSource({
    data: graphData.edgeList,
    sourceId: (item) => item.source,
    targetId: (item) => item.target
  })
  graphBuilder.buildGraph()
}
/**
 * Sets up simple data binding - creates an IMapper, registers it and subscribe to the node creation event
 * on the graph.
 */
function enableDataBinding() {
  const graph = graphComponent.graph
  // Creates a specialized IMapper instance.
  dateMapper = new Mapper()
  // Subscribes to the node creation event to record the node creation time.
  // Note that since this event is triggered after undo/redo, the time will
  // be updated during redo of node creations and undo of node deletions.
  // If this is unwanted behavior, you can customize the node creation itself
  // to associate this data with the element at the time of its initial creation,
  // e.g. by listening to the NodeCreated event of GraphEditorInputMode, see below
  graph.addEventListener('node-created', (evt) => {
    // Stores the current time as node creation time.
    dateMapper.set(evt.item, new Date())
  })
}
/**
 * Enables loading and saving the graph to GraphML.
 */
function enableGraphML() {
  // set a custom GraphMLIOHandler
  const graphMLIOHandler = createGraphMLIOHandler()
  document.querySelector('#open-file-button').addEventListener('click', async () => {
    await openGraphML(graphComponent, graphMLIOHandler)
  })
  document.querySelector('#save-button').addEventListener('click', async () => {
    await saveGraphML(graphComponent, 'customGraphML.graphml', graphMLIOHandler)
  })
}
/**
 * Register input and output handlers that store the data in the mapper as GraphMLAttributes resp. can read them
 * back.
 */
function createGraphMLIOHandler() {
  // create an IOHandler that will be used for all IO operations
  const graphMLIOHandler = new GraphMLIOHandler()
  // The OutputHandler just stores the string value of the attribute
  // We need to provide the symbolic name of the attribute in the graphml file, the data source as an IMapper and the
  // GraphML type of the attribute
  graphMLIOHandler.addOutputMapper(
    INode,
    Date,
    DATE_TIME_MAPPER_KEY,
    'demo',
    dateMapper,
    (context, item) => {
      if (item) {
        context.writer.writeString(JSON.stringify(item))
      }
    },
    KeyType.STRING
  )
  // To read back a DateTime value from a string GraphML attribute, we have to provide an additional callback method.
  graphMLIOHandler.addInputMapper(
    INode,
    Date,
    (element) => GraphMLIOHandler.matchesName(element, DATE_TIME_MAPPER_KEY),
    dateMapper,
    (_, xmlNode) => {
      // The actual value is a text node that can be retrieved from the event
      try {
        const stringValue = xmlNode.textContent
        return JSON.parse(stringValue, (key, val) => new Date(val))
      } catch (exception) {
        if (typeof window.console !== 'undefined') {
          console.log(exception)
        }
      }
      return new Date()
    }
  )
  return graphMLIOHandler
}
/**
 * Setup tooltips that return the value that is stored in the mapper.
 * Dynamic tooltips are implemented by adding a tooltip provider as an event handler for the 'query-item-tool-tip'
 * event of the {@link GraphEditorInputMode} using the {@link QueryItemToolTipEventArgs} parameter.
 * The {@link QueryItemToolTipEventArgs} parameter provides three relevant properties:
 * handled, queryLocation, and toolTip. The {@link QueryItemToolTipEventArgs.handled} property is a flag which indicates
 * whether the tooltip was already set by one of possibly several tooltip providers. The
 * {@link QueryItemToolTipEventArgs.queryLocation} property contains the mouse position for the query in world coordinates.
 * The {@link QueryItemToolTipEventArgs.toolTip} is set by setting the ToolTip property.
 */
function setupTooltips() {
  const graphEditorInputMode = graphComponent.inputMode
  graphEditorInputMode.toolTipItems = GraphItemTypes.NODE
  graphEditorInputMode.addEventListener('query-item-tool-tip', (evt) => {
    if (evt.handled) {
      // Tooltip content has already been assigned -> nothing to do.
      return
    }
    const item = evt.item
    if (item instanceof INode) {
      if (dateMapper.get(item)) {
        // Found a suitable mapper. Set the tooltip content.
        evt.toolTip = dateMapper.get(item).toLocaleString()
        // Indicate that the tooltip content has been set.
        evt.handled = true
      }
    }
  })
  // Add a little offset to the tooltip such that it is not obscured by the mouse pointer.
  graphEditorInputMode.toolTipInputMode.toolTipLocationOffset = new Point(20, 20)
}
/**
 * Initializes the defaults for the styling in this tutorial.
 *
 * @param graph The graph.
 */
function initTutorialDefaults(graph) {
  // set styles that are the same for all tutorials
  initDemoStyles(graph)
  // set the style, label and label parameter for group nodes
  graph.groupNodeDefaults.style = new GroupNodeStyle({
    tabFill: '#042d37',
    tabBackgroundFill: '#9dc6d0',
    tabPosition: 'top-trailing',
    stroke: '2px solid #9dc6d0',
    cornerRadius: 10
  })
  graph.groupNodeDefaults.labels.style = new LabelStyle({
    horizontalTextAlignment: 'left',
    textFill: '#042d37'
  })
  graph.groupNodeDefaults.labels.layoutParameter =
    new GroupNodeLabelModel().createTabBackgroundParameter()
  // set sizes and locations specific for this tutorial
  graph.nodeDefaults.size = new Size(40, 40)
  graph.nodeDefaults.labels.layoutParameter = new ExteriorNodeLabelModel({
    margins: 5
  }).createParameter('bottom')
  graph.edgeDefaults.labels.layoutParameter = new EdgePathLabelModel({
    distance: 5,
    autoRotation: true
  }).createRatioParameter({ sideOfEdge: EdgeSides.BELOW_EDGE })
}
run().then(finishLoading)
