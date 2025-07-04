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
// @ts-ignore - We have no proper types for preact, here
import { html, useEffect, useRef } from '../../preact-loader'
import {
  EdgesSource,
  Graph,
  GraphBuilder,
  GraphComponent,
  GraphViewerInputMode,
  HierarchicalLayout,
  LayoutExecutor,
  NodesSource,
  PolylineEdgeStyle
} from '@yfiles/yfiles'
import { PreactComponentNodeStyle } from './PreactComponentNodeStyle'
import NodeTemplate from './NodeTemplate'
import { finishLoading } from '@yfiles/demo-resources/demo-page'
LayoutExecutor.ensure()
export default (props) => {
  const gcRef = useRef(null)
  const graphComponentRef = useRef(null)
  const graphBuilderRef = useRef(null)
  const nodesSourceRef = useRef(null)
  const edgesSourceRef = useRef(null)
  /**
   * Note that we pass an empty dependency array here, which causes
   * the effect to only be triggered when the component is first mounted
   * (like componentDidMount() for class components)
   */
  useEffect(() => {
    const graphComponent = new GraphComponent(gcRef.current)
    graphComponent.inputMode = new GraphViewerInputMode()
    initializeStyles(graphComponent)
    graphComponentRef.current = graphComponent
    const graphBuilder = createGraphBuilder()
    graphBuilderRef.current = graphBuilder
    graphBuilder.buildGraph()
    doLayout()
    finishLoading()
    // return a cleanup function (like componentWillUnmount())
    return () => {
      graphComponent.cleanUp()
      graphComponent.graph = new Graph()
    }
  }, [])
  /**
   * This effect is triggered whenever the itemData or connectionData changes.
   * In order to update the graph view, we set the new data and apply a GraphBuilder update.
   */
  useEffect(() => {
    graphBuilderRef.current?.setData(nodesSourceRef.current, props.itemData)
    graphBuilderRef.current?.setData(edgesSourceRef.current, props.connectionData)
    graphBuilderRef.current?.updateGraph()
    doLayout()
  }, [props.itemData, props.connectionData])
  /**
   * We use a string template to create the node visualizations. Depending on the
   * "state" property of the data items, a different CSS class is set on the outer
   * SVG element. Therefore, the visualizations can be adapted depending on the
   * item state in pure CSS (see the style.css next to this component).
   */
  const initializeStyles = (graphComponent) => {
    graphComponent.graph.nodeDefaults.style = new PreactComponentNodeStyle(NodeTemplate)
    graphComponent.graph.edgeDefaults.style = new PolylineEdgeStyle({
      stroke: `1.2px solid #304f52`,
      targetArrow: `#304f52 small triangle`
    })
  }
  const doLayout = () => {
    props.setLayoutRunning(true)
    graphComponentRef.current?.applyLayoutAnimated(new HierarchicalLayout(), '1s').then(() => {
      props.setLayoutRunning(false)
    })
  }
  /**
   * The GraphBuilder configuration is straight-forward for the simple data model
   * used in the demo: we use the data item's "id" property for the GraphBuilder id, and
   * assign the data item itself as the item tag (so it can be accessed easily in the visualization style).
   * The connections are created using the "from" and "to" item id references.
   */
  const createGraphBuilder = () => {
    const graphBuilder = new GraphBuilder(graphComponentRef.current?.graph)
    const nodesSource = graphBuilder.createNodesSource({
      data: props.itemData,
      id: 'id',
      tag: (item) => item
    })
    const edgesSource = graphBuilder.createEdgesSource({
      data: props.connectionData,
      sourceId: 'from',
      targetId: 'to'
    })
    nodesSourceRef.current = nodesSource
    edgesSourceRef.current = edgesSource
    // We need to update the node tags with each item update.
    nodesSource.nodeCreator.addEventListener('node-updated', (evt) => {
      nodesSource.nodeCreator.updateTag(evt.graph, evt.item, evt.dataItem)
    })
    return graphBuilder
  }
  return html` <div class="graph-component" ref=${gcRef} /> `
}
