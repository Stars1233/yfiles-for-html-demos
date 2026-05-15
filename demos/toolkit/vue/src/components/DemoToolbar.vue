<template>
  <div class="demo-toolbar">
    <button class="demo-icon-yIconReload" @click="$emit('reload-graph')"></button>
    <span class="demo-separator"></span>
    <input
      type="checkbox"
      id="toggleEditable"
      class="demo-toggle-button labeled"
      @change="$emit('toggle-editable', ($event.target as HTMLInputElement).checked)"
    />
    <label for="toggleEditable">Toggle Editing</label>
    <span class="demo-separator"></span>
    <button class="demo-icon-yIconLayout labeled" @click="$emit('layout')">Layout</button>
    <span class="demo-separator"></span>
    <button class="demo-icon-yIconExportImage labeled" @click="$emit('export-svg')">
      Export SVG
    </button>
    <span class="demo-separator"></span>
    <input
      v-model.trim="searchString"
      class="search"
      placeholder="Search Nodes"
      @input="$emit('search-query-change', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DemoToolbar',
  emits: ['reload-graph', 'toggle-editable', 'layout', 'search-query-change', 'export-svg'],
  setup() {
    const searchString = ''

    return { searchString }
  }
})
</script>

<style scoped>
.demo-toolbar {
  display: flex;
  align-items: center;
  height: 100%;
}

.demo-toolbar button {
  line-height: normal;
  height: 24px;
}

.demo-toolbar button.labeled {
  background-position-x: left;
  width: inherit;
  padding: 0 5px;
}

.demo-toolbar button.labeled[class*='demo-icon'] {
  padding-left: 24px;
  background-position-x: 2px;
}

.demo-toolbar button,
.demo-toolbar > label {
  display: inline-block;
  outline: none;
  border: none;
  border-radius: 999px;
  padding: 0;
  background-repeat: no-repeat;
  background-position: 50% 50%;
  background-color: transparent;
  height: 24px;
  width: 24px;
  line-height: 24px;
  box-sizing: border-box;
  cursor: pointer;
  text-wrap: nowrap;
  color: #1c2a35;
  font-size: 14px;
}

.demo-toolbar button:hover,
.demo-toolbar > label:hover {
  background-color: #aec3d5;
}

.demo-toggle-button {
  display: none !important;
}

.demo-toggle-button:checked + label {
  background-color: #aec3d5;
}

.demo-toggle-button:checked:hover + label {
  background-color: #38536b;
  color: white;
}

.demo-toggle-button:disabled + label {
  opacity: 0.5;
  cursor: default;
  background-color: transparent;
}

.demo-toggle-button.labeled + label {
  background-position-x: left;
  width: inherit;
  padding: 0 5px;
  line-height: 24px;
}

.demo-toolbar button:active,
.demo-toolbar > label:active,
.demo-toolbar .demo-toggle-button:checked:active + label {
  background-color: #38536b;
  color: white;
}

.demo-toolbar button:disabled,
.demo-toolbar > .demo-toggle-button:disabled + label {
  opacity: 0.5;
  cursor: default;
  background-color: transparent;
}

.demo-separator {
  height: 20px;
  width: 1px;
  background: #38536b;
  display: inline-block;
  vertical-align: middle;
  margin: 0 10px;
}

.demo-icon-yIconReload {
  background-image: url('../assets/reload-16.svg');
}

.demo-icon-yIconLayout {
  background-image: url('../assets/play2-16.svg');
}

.demo-icon-yIconExportImage {
  background-image: url('../assets/export-image-16.svg');
}

.search {
  margin-left: auto;
  line-height: 20px;
  padding: 4px 8px;
  font-size: 14px;
  letter-spacing: normal;
  width: 300px;
  border-radius: 20px;
  border: 1px solid #ccc;
}

.search:focus {
  outline: none;
}
</style>
