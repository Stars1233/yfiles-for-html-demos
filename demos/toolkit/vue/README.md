<!--
 //////////////////////////////////////////////////////////////////////////////
 // @license
 // This file is part of yFiles for HTML.
 // Use is subject to license terms.
 //
 // Copyright (c) 2026 by yWorks GmbH, Vor dem Kreuzberg 28,
 // 72070 Tuebingen, Germany. All rights reserved.
 //
 //////////////////////////////////////////////////////////////////////////////
-->
# Vue Demo – yFiles for HTML

<img src="../../../doc/demo-thumbnails/vue.webp" alt="demo-thumbnail" height="320"/>

This demo shows how to integrate yFiles in a basic [create-vue](https://github.com/vuejs/create-vue) project.

## Running the demo

The demo was scaffolded using `create-vue`, thus the following steps are required to start it:

First, install the required npm modules in the demo directory:

```sh
npm install
```

Now, start the demo in its [Vite](https://vitejs.dev/) development server:

```sh
npm run dev
```

## Notes

There are no special issues that you need to look out for when you load yFiles as NPM dependency as
in this demo application.

Consider using the [@yworks/optimizer](https://www.npmjs.com/package/@yworks/optimizer)
when you deploy your app for production.
This tool obfuscates the public API of the yFiles library files and yFiles API
usages in application sources, reducing the file size of the production build.
