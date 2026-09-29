<template>
  <div class="component-toolbar">
    <div class="input">
      <input
        type="checkbox"
        id="toggleEditable"
        class="demo-toggle-button labeled"
        @change="$emit('toggle-editable', ($event.target as HTMLInputElement).checked)"
      />
      <label for="toggleEditable">Editing</label>
    </div>
    <span class="separator"></span>
    <button class="labeled" @click="$emit('layout')">
      <span class="material-symbols-outlined">play_arrow</span>Layout
    </button>
    <button class="labeled" @click="$emit('reload-graph')">
      <span class="material-symbols-outlined">refresh</span> Reload
    </button>
    <button class="labeled" @click="$emit('export-svg')">
      <span class="material-symbols-outlined">download</span>Export SVG
    </button>
    <span class="separator"></span>

    <div class="input">
      <label for="search-field">Search:</label>
      <input
        type="text"
        id="search-field"
        v-model.trim="searchString"
        class="search"
        @input="$emit('search-query-change', ($event.target as HTMLInputElement).value)"
      />
    </div>
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
