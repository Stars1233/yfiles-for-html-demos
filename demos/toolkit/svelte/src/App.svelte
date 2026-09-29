<script lang="ts">
  import { EDGE_DATA, NODE_DATA } from './data'
  import PropertiesView from './PropertiesView.svelte'
  import type { Person } from './types'
  import OrgChart from './OrgChart.svelte'
  import DemoDescription from './DemoDescription.svelte'

  const graphData = { nodes: NODE_DATA, edges: EDGE_DATA }
  let orgChartComponent: OrgChart
  let search: string = ''
  let selectedEmployee: Person | null = null
  function onSelectedEmployeeChanged(value: Person | null): void {
    selectedEmployee = value
  }
</script>
<div class='demo-header'>
  <a
    href="https://www.yfiles.com/the-yfiles-sdk/web/yfiles-for-html"
    class="y-logo"
    target="_blank"
    aria-label="yfiles for html"
  ></a>
  <span class="material-symbols-outlined">chevron_right</span>
  <a href='https://www.yfiles.com/demos'
     style='cursor: pointer;' target='_blank'
     class='breadcrumb-wrapper'>Demos</a>
  <span class="material-symbols-outlined">chevron_right</span>
  <span id="name" class="breadcrumb-wrapper demo-name">Svelte Demo</span>
</div>
<div class="demo-main">
  <div class="graph-component-container" style="width: 100%; height: 100%">
      <div class="component-toolbar">
        <button
          title="Zoom in"
          onclick={() => orgChartComponent.zoomIn()}>
          <span class="material-symbols-outlined">zoom_in</span>
        </button>
        <button
          title="Zoom out"
          onclick={() => orgChartComponent.zoomOut()}>
          <span class="material-symbols-outlined">zoom_out</span>
        </button>
        <button
          title="Fit content"
          onclick={() => orgChartComponent.fitContent()}>
          <span class="material-symbols-outlined">zoom_out_map</span>
        </button>
        <span class="separator"></span>
        <label>
          Search:
        <input class="search" bind:value={search}/>
        </label>
      </div>
    <OrgChart
      data={graphData}
      bind:this={orgChartComponent}
      {search}
      onSelectedEmployeeChanged={onSelectedEmployeeChanged}
    />
  </div>
  <div class="demo-main__interaction-panel">
    <PropertiesView person={selectedEmployee} />
  </div>
  <div class='demo-main__description-panel'>
    <DemoDescription/>
  </div>
</div>
