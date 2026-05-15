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
  <span class="material-symbols-outlined demo-overview">chevron_right</span>
  <a href='../../../README.html'
     style='cursor: pointer;' target='_blank'
     class='demo-title'>Demos</a>
  <span class="material-symbols-outlined demo-overview">chevron_right</span>
  <span class='demo-title'>Svelte Integration Demo</span>
</div>
<div class="main">
  <div class="graph-component-container" style="width: 100%; height: 100%">
    <div class="toolbar">
      <div class="demo-toolbar">
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
          class="demo-icon-yIconZoomFit"
          onclick={() => orgChartComponent.fitContent()}>
          <span class="material-symbols-outlined">zoom_out_map</span>
        </button>
        <span class="demo-separator"></span>
        <input class="search" bind:value={search} placeholder="Search names" />
      </div>
    </div>
    <OrgChart
      data={graphData}
      bind:this={orgChartComponent}
      {search}
      onSelectedEmployeeChanged={onSelectedEmployeeChanged}
    />
  </div>
  <aside class="demo-sidebar interaction">
    <PropertiesView person={selectedEmployee} />
  </aside>
  <aside class='demo-sidebar'>
    <DemoDescription/>
  </aside>
</div>
<style>
  .toolbar {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    border-radius: 50px;
    height: 40px;
    padding: 0 5px;
    box-sizing: border-box;
    user-select: none;
    background-color: #e7edf2;
    box-shadow:
      0 5px 20px rgba(0, 0, 0, 0.1),
      0 3px 10px rgba(0, 0, 0, 0.1),
      0 1px 5px rgba(0, 0, 0, 0.15);
  }
  .demo-toolbar {
    display: flex;
    height: 100%;
    align-items: center;
    gap: 4px;
  }
  .demo-toolbar button{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    outline: none;
    border: none;
    background-color: transparent;
    height: 24px;
    width: 24px;
    box-sizing: border-box;
    padding: 0;
    cursor: pointer;
    border-radius: 50%;
  }
  .demo-toolbar .material-symbols-outlined {
    font-size: 18px;
    color: #444;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
  }
  .demo-toolbar button:hover{
    background-color: #dedede;
  }

  .demo-separator {
    height: 20px;
    width: 1px;
    background: #999;
    display: inline-block;
    vertical-align: middle;
    margin: 0 2px;
  }

  .search {
    margin-left: auto;
    line-height: 20px;
    padding: 4px 8px;
    font-size: 15px;
    letter-spacing: normal;
    width: 250px;
    border-radius: 20px;
    border: 1px solid #ccc;
  }
  .search:focus {
    outline: none;
  }

</style>
