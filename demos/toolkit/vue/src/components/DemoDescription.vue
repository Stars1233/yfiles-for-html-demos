<template>
  <div class="demo-description__content">
    <div class="subheading">Demo</div>
    <h1>Vue</h1>
    <p>
      This demo shows how to integrate yFiles in a basic
      <a href="https://github.com/vuejs/create-vue" target="_blank">create-vue</a>
      setup with Vue 3 and TypeScript.
    </p>
    <p>
      The application is separated into different single-file components that use Vue events to
      communicate different interactions.
    </p>
    <h2>Building the demo</h2>
    <p>
      The demo was scaffolded using <code>create-vue</code>, thus the following steps are required
      to start it:
    </p>
    <code>
      > npm install
      <br />
      > npm run dev
    </code>
    <p>
      This will start the
      <a href="https://vitejs.dev/" target="_blank">Vite</a>
      development server.
    </p>

    <h2>Things to Try</h2>

    <ul>
      <li>Toggle editing support using the "Toggle Editing" button.</li>
      <li>
        After the graph has been edited, click
        <span class="material-symbols-outlined" style="vertical-align: middle">refresh</span>
        to reload the initial sample graph.
      </li>
      <li>The Vite development server will automatically update the application upon changes.</li>
    </ul>

    <h2>App Generator</h2>

    <p>
      Use the
      <a
        href="https://www.yworks.com/products/app-generator"
        target="_blank"
        rel="noopener noreferrer"
      >
        App Generator
      </a>
      to create visualization prototypes – quickly and easily.
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({ name: 'DemoDescription' })
</script>
