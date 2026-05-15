<div class='demo-sidebar-content'>
  <h1>Svelte Integration Demo</h1>
  <p>
    This demo shows how to integrate yFiles for HTML with the <a
    href='https://svelte.dev/'
    rel='noopener'
    target='_blank'>Svelte</a
  > framework, using Vite for development and deployment.
  </p>
  <p>The main features shown here are:</p>
  <ul>
    <li>
      A component wrapper around GraphComponent that represents an organization chart and gets its data passed in. All
      handling of the graph and the yFiles GraphComponent is contained within.
    </li>
    <li>
      A custom SVG-based node style with the help of a <a
      href='https://svelte.dev/docs#component-format'
      rel='noopener'
      target='_blank'>Svelte single file component</a
    > that supports hot-reloading during development.
    </li>
    <li>
      A layout algorithm in a Web Worker without blocking the UI is loaded using <a
      href='https://vitejs.dev/guide/features.html#web-workers'
      rel='noopener'
      target='_blank'>Vite's support for Web Workers</a
    >. Vite's development build relies on native browser support for <a href='https://web.dev/module-workers/'
                                                                        target='_blank'>module workers</a> and
      therefore currently only works in some browsers (e.g. Chrome). For
      unsupported browsers, client-sided layout calculation is used as fallback.
    </li>
  </ul>
  <h2>Things to try</h2>
  <p>
    Zoom into the chart to see more details. Level-of-detail rendering ensures that even at low zoom levels important
    information remains readable.
  </p>
  <p>
    Select employees in the chart and change their details in the panel on the right side. Those changes are
    immediately reflected in the visualization.
  </p>
  <p>See the sources for details.</p>
</div>
<style>
  .demo-sidebar-content a,
  .demo-sidebar-content a:visited {
    text-decoration: none;
    color: #1871bd;
  }

  .demo-sidebar-content a:hover {
    text-decoration: none;
    color: #18468c;
  }

  .demo-sidebar-content ul {
    padding-left: 1.3em;
  }

  .demo-sidebar-content li {
    margin: 0.5em 0;
  }
</style>
