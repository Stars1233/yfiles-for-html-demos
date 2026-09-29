<template>
  <div class="overview-container">
    <div class="overview-title">Overview</div>
    <div class="graph-overview-component" ref="GraphOverviewElement"></div>
  </div>
</template>

<script lang="ts">
import {
  GraphOverviewComponent as YFilesGraphOverviewComponent,
  type GraphComponent
} from '@yfiles/yfiles'
import { defineComponent, inject, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

export default defineComponent({
  name: 'GraphOverviewComponent',
  setup() {
    const graphComponentProvider = inject('GraphComponentProvider') as {
      getGraphComponent: () => GraphComponent
    }

    const GraphOverviewElement = ref<HTMLDivElement>()
    let graphOverviewComponent: YFilesGraphOverviewComponent | undefined

    onMounted(async () => {
      // Wait until the parent has created the GraphComponent in its mounted hook.
      await nextTick()
      graphOverviewComponent = new YFilesGraphOverviewComponent(
        GraphOverviewElement.value!,
        graphComponentProvider.getGraphComponent()
      )
    })

    onBeforeUnmount(() => {
      graphOverviewComponent?.cleanUp()
      if (graphOverviewComponent) {
        graphOverviewComponent.graphComponent = null
      }
    })

    return { GraphOverviewElement }
  }
})
</script>

<style scoped>
.overview-container {
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 5px 20px rgba(0, 0, 0, 0.1),
    0 3px 10px rgba(0, 0, 0, 0.1),
    0 1px 5px rgba(0, 0, 0, 0.15);
  border-radius: 16px;
}

.graph-overview-component {
  width: 240px;
  height: 200px;
  background-color: white;
  border-radius: 0 0 16px 16px;
  overflow: hidden;

  :deep(.yfiles-canvascomponent) {
    width: 240px;
    height: 200px;
    background-color: white;
    border-radius: 0 0 16px 16px;
  }
}

.overview-title {
  display: flex;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 500;
  line-height: 2rem;
  background-color: #e7edf2;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}
</style>
