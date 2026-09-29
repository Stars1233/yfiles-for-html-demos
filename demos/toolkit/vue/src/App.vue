<template>
  <div class="demo-header">
    <a
      href="https://www.yfiles.com/the-yfiles-sdk/web/yfiles-for-html"
      class="y-logo"
      target="_blank"
      title="yFiles Product Page"
    ></a>
    <span class="material-symbols-outlined">chevron_right</span>
    <a
      href="https://www.yfiles.com/demos"
      class="breadcrumb-wrapper"
      target="_blank"
      rel="noopener noreferrer"
    >
      Demos
    </a>
    <span class="material-symbols-outlined">chevron_right</span>
    <span id="name" class="breadcrumb-wrapper demo-name">Vue Demo</span>
  </div>
  <div class="demo-main">
    <diagram-component></diagram-component>
    <div class="demo-main__description-panel">
      <demo-description></demo-description>
    </div>
  </div>
</template>

<script lang="ts">
import DiagramComponent from './components/DiagramComponent.vue'
import DemoDescription from '@/components/DemoDescription.vue'
import { defineComponent, provide } from 'vue'

export default defineComponent({
  name: 'App',
  components: { DemoDescription, DiagramComponent },
  setup() {
    // We need to provide a GraphComponent instance to the child components.
    // However, the GraphComponent instance can only be created in the DiagramComponent later.
    // So this provider is then filled from there.
    const graphComponentProvider = { getGraphComponent: () => null }
    provide('GraphComponentProvider', graphComponentProvider)
  }
})
</script>
