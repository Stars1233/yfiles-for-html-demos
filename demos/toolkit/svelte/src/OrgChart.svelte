<script lang="ts">
  import { onMount } from 'svelte'
  import {
    Command,
    EventRecognizers,
    Graph,
    GraphBuilder,
    GraphComponent,
    GraphViewerInputMode,
    HierarchicalLayoutEdgeDescriptor,
    type LayoutDescriptor,
    LayoutExecutorAsync,
    License,
    PolylineEdgeStyle,
    Rect
  } from '@yfiles/yfiles'
  import licenseData from './license.json'
  import { SvelteComponentNodeStyle } from './SvelteComponentNodeStyle.svelte'
  import SvgNodeComponent from './SvgNodeComponent.svelte'
  import { type Person, SveltePerson } from './Person.svelte'

  interface Props {
    width?: string
    height?: string
    data: { nodes: Person[]; edges: { from: string; to: string }[] }
    search?: string
    onSelectedEmployeeChanged?: (value: Person | null) => void
  }

  let {
    width = '100%',
    height = '100%',
    data,
    search = '',
    onSelectedEmployeeChanged
  }: Props = $props()

  License.value = licenseData

  // Create a new module web worker
  const worker = new Worker(new URL('./layout-worker.ts', import.meta.url), {
    type: 'module'
  })
  // The Web Worker is running yFiles in a different context, therefore, we need to register the
  // yFiles license in the Web Worker as well.
  worker.postMessage({ license: licenseData })

  export function zoomIn() {
    graphComponent.executeCommand(Command.INCREASE_ZOOM)
  }
  export function zoomOut() {
    graphComponent.executeCommand(Command.DECREASE_ZOOM)
  }
  export function fitContent() {
    graphComponent.fitGraphBounds()
  }

  let graphComponentDiv: HTMLDivElement
  let graphComponent: GraphComponent
  let layoutRunning = false

  $effect(() => {
    highlightNodes(search)
  })

  const layoutDescriptor: LayoutDescriptor = {
    name: 'HierarchicalLayout',
    properties: {
      automaticEdgeGrouping: true,
      minimumLayerDistance: 50,
      defaultEdgeDescriptor: new HierarchicalLayoutEdgeDescriptor({
        minimumFirstSegmentLength: 25,
        minimumLastSegmentLength: 25
      })
    }
  }

  onMount(() => {
    graphComponent = new GraphComponent(graphComponentDiv)
    const inputMode = new GraphViewerInputMode()
    // Disable multi-selection
    inputMode.availableCommands.remove(Command.SELECT_ALL)
    inputMode.multiSelectionRecognizer = EventRecognizers.NEVER
    // Expose the currently selected node to users of the component
    inputMode.addEventListener('multi-selection-finished', () => {
      // Get the selected node's tag
      let current = graphComponent.selection.nodes.at(0)?.tag
      onSelectedEmployeeChanged?.(current)
    })

    graphComponent.inputMode = inputMode

    // Set default node and edge styles
    graphComponent.graph.nodeDefaults.style = new SvelteComponentNodeStyle(SvgNodeComponent)
    graphComponent.graph.edgeDefaults.style = new PolylineEdgeStyle({
      stroke: '1.5px solid #AAAAAA'
    })

    // Hide the default selection, highlight, and focus decoration. The node style handles those for us.
    graphComponent.selectionIndicatorManager.enabled = false
    graphComponent.focusIndicatorManager.enabled = false
    graphComponent.highlightIndicatorManager.enabled = false

    // Initialize the graph builder and create the initial graph
    const graphBuilder = new GraphBuilder(graphComponent.graph)
    graphBuilder.createNodesSource({
      data: data.nodes,
      id: 'name',
      layout: () => new Rect(0, 0, 285, 100),
      tag: d => new SveltePerson(d)
    })
    graphBuilder.createEdgesSource(data.edges, 'from', 'to')
    graphBuilder.buildGraph()

    // Ensure that the layout animates from the center, instead of the top left
    graphComponent.fitGraphBounds()

    // Calculate an initial layout
    applyLayout()

    // Clean up the GraphComponent after the Svelte component is destroyed
    return () => {
      graphComponent.graph = new Graph()
      graphComponent.cleanUp()
    }
  })

  async function applyLayout() {
    if (!layoutRunning) {
      layoutRunning = true
      try {
        // create an asynchronous layout executor that calculates a layout on the worker
        await new LayoutExecutorAsync({
          graphComponent,
          messageHandler: LayoutExecutorAsync.createWebWorkerMessageHandler(worker),
          layoutDescriptor,
          animationDuration: '0.5s',
          animateViewport: true,
          easedAnimation: true
        }).start()
      } finally {
        layoutRunning = false
      }
    }
  }

  function highlightNodes(filter: string) {
    if (!graphComponent) {
      return
    }
    const highlights = graphComponent.highlights
    highlights.clear()
    if (filter) {
      graphComponent.graph.nodes
        .filter(n => (n.tag as Person).name.toLowerCase().includes(filter.toLowerCase()))
        .forEach(n => {
          highlights.add(n)
        })
    }
    // invalidate to trigger an update of the node styles where the highlight state is bound to the node's fill
    graphComponent.invalidate()
  }
</script>

<div
  bind:this={graphComponentDiv}
  style:width={width}
  style:height={height}
></div>

<style>
</style>
