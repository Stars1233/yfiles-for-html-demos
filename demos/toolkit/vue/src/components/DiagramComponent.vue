<template>
  <div class="graph-component-container" ref="GraphComponentElement">
    <demo-toolbar
      class="toolbar"
      @reload-graph="defaultGraph.create()"
      @toggle-editable="toggleEditable"
      @layout="layout()"
      @export-svg="exportSvg"
      @search-query-change="graphSearch.onSearchQueryChange"
    ></demo-toolbar>
    <context-menu @hide-context-menu="contextMenu.hide()" v-bind="contextMenu.data" />
  </div>
</template>

<script lang="ts">
import {
  Graph,
  GraphComponent,
  GraphEditorInputMode,
  GraphViewerInputMode,
  License,
  SvgExport
} from '@yfiles/yfiles'
import DemoToolbar from './DemoToolbar.vue'
import ContextMenu from './ContextMenu.vue'
import { defineComponent, inject, nextTick, onBeforeMount, onMounted, ref } from 'vue'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTooltips } from '@/composables/useTooltips'
import { useGraphSearch } from '@/composables/useGraphSearch'
import { useLayout } from '@/composables/useLayout'
import { useDefaultGraph } from '@/composables/useDefaultGraph'
import licenseData from '../license.json'
import { downloadFile } from '@yfiles/demo-utils/file-support.ts'

License.value = licenseData

export default defineComponent({
  name: 'DiagramComponent',
  components: { DemoToolbar, ContextMenu },
  setup() {
    const graphComponentProvider = inject('GraphComponentProvider') as {
      getGraphComponent: () => GraphComponent
    }

    // now we can populate the GraphComponentProvider with a function that returns a
    // GraphComponent instance which will be created later in the onMount hook
    let graphComponent: GraphComponent
    const getGraphComponent = () => graphComponent
    onBeforeMount(() => {
      graphComponentProvider.getGraphComponent = getGraphComponent
    })

    // create the GraphComponent instance in the graph-component-container div
    const GraphComponentElement = ref<HTMLDivElement>()
    onMounted(() => {
      graphComponent = new GraphComponent(GraphComponentElement.value!)
      graphComponent.inputMode = new GraphViewerInputMode()
    })

    // initialize the features
    const contextMenu = useContextMenu(getGraphComponent)
    const tooltips = useTooltips(getGraphComponent)
    const graphSearch = useGraphSearch(getGraphComponent)
    const layout = useLayout(getGraphComponent)
    const defaultGraph = useDefaultGraph(getGraphComponent)

    /**
     * Enables/disables interactive editing of the graph.
     */
    function toggleEditable(editable: boolean): void {
      const inputMode = editable ? new GraphEditorInputMode() : new GraphViewerInputMode()
      graphComponent.inputMode = inputMode
      contextMenu.register(inputMode)
      tooltips.register(inputMode)
    }

    /**
     * Export the graph component to an SVG.
     */
    async function exportSvg() {
      const exportComponent = new GraphComponent()
      exportComponent.graph = graphComponent.graph
      exportComponent.updateContentBounds()
      const exporter = new SvgExport({
        worldBounds: exportComponent.contentBounds,
        encodeImagesBase64: true,
        inlineSvgImages: true
      })

      // set cssStyleSheets to null so the SvgExport will automatically collect all style sheets
      exporter.cssStyleSheet = null
      const svg = await exporter.exportSvgAsync(exportComponent, async () => {
        // Wait for Vue to finish rendering. If you have node styles that render asynchronously, you need
        // to wait for them to finish, also.
        await nextTick()
      })
      // Dispose of the component and remove its references to the graph
      exportComponent.graph = new Graph()
      exportComponent.cleanUp()

      downloadFile(SvgExport.exportSvgString(svg), 'graph.svg', 'image/svg+xml')
    }

    return {
      GraphComponentElement,
      contextMenu,
      graphSearch,
      layout,
      defaultGraph,
      exportSvg,
      toggleEditable
    }
  }
})
</script>

<style scoped>
.graph-component-container {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  height: 100%;
  background-color: white;
  border-radius: 16px;
}

.toolbar {
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 999px;
  height: 40px;
  width: fit-content;
  padding: 0 12px;
  box-sizing: border-box;
  user-select: none;
  background-color: #f2f5f8;
  z-index: 10;
  box-shadow:
    0 5px 20px rgba(0, 0, 0, 0.1),
    0 3px 10px rgba(0, 0, 0, 0.1),
    0 1px 5px rgba(0, 0, 0, 0.15);
}
</style>
