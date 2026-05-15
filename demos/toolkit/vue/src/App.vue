<template>
  <div class="demo-content">
    <div class="demo-header">
      <a
        href="https://www.yfiles.com/the-yfiles-sdk/web/yfiles-for-html"
        class="y-logo"
        target="_blank"
      ></a>
      <span class="chevron-right"></span>
      <a href="../../../README.html" style="cursor: pointer" target="_blank"> Demos </a>
      <span class="chevron-right"></span>
      <span>Vue Demo</span>
    </div>
    <div class="main-container">
      <diagram-component></diagram-component>
      <diagram-overview-component class="graph-overview-component"></diagram-overview-component>
      <div class="demo-sidebar-description">
        <demo-sidebar></demo-sidebar>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import DiagramComponent from './components/DiagramComponent.vue'
import DemoSidebar from './components/DemoSidebar.vue'
import DiagramOverviewComponent from './components/DiagramOverviewComponent.vue'
import { defineComponent, provide } from 'vue'

export default defineComponent({
  name: 'App',
  components: { DemoSidebar, DiagramComponent, DiagramOverviewComponent },
  setup() {
    // We need to provide a GraphComponent instance to the child components.
    // However, the GraphComponent instance can only be created in the DiagramComponent later.
    // So this provider is then filled from there.
    const graphComponentProvider = { getGraphComponent: () => null }
    provide('GraphComponentProvider', graphComponentProvider)
  }
})
</script>

<style>
html,
body {
  position: relative;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #e7edf2;
  color: #1c2a35;
  touch-action: none;
  overflow: hidden;
  overscroll-behavior-y: contain;
  font-family: Tahoma, Verdana, sans-serif;
}
</style>
<style scoped>
.demo-content {
  font-family: Tahoma, Verdana, sans-serif;
  font-size: 14px;
  color: #1c2a35;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.demo-header {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 70px;
  font-size: 1.125rem;
  font-weight: 400;
  padding-left: 92px;
  padding-right: 8px;
  color: #2a3e50;
  gap: 12px;
}

.demo-header a {
  text-decoration: none;
  color: inherit;
}

.demo-header .chevron-right {
  mask: url('./assets/header-angle.svg') no-repeat center;
  font-weight: 270;
  background-color: #2a3e50;
  height: 100%;
  width: 30px;
}

.y-logo {
  margin: 4px 4px 4px 16px;
  height: 100%;
  background-color: #2a3e50;

  mask: url('./assets/ylogo-large.svg') no-repeat center;
  width: 12rem;
}

.main-container {
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  gap: 10px;
  margin: 0 10px 10px 10px;
  height: 100%;
}

.demo-sidebar-description {
  height: 100%;
  width: 320px;
  box-sizing: border-box;
  line-height: 140%;
  overflow: hidden;
  background-color: white;
  border-radius: 16px;
}

.graph-overview-component {
  position: absolute;
  left: 25px;
  top: 140px;
  border-radius: 10px;
}

.y-logo {
  margin: 0 5px;
  height: 100%;
  background-color: #1c2a35;

  mask: url('./assets/ylogo-large.svg') no-repeat center;
  width: 12rem;
  margin-left: 15px;
}
</style>
