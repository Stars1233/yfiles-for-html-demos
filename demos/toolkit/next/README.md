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
# Next.js Demo – yFiles for HTML

<img src="../../../doc/demo-thumbnails/next.webp" alt="demo-thumbnail" height="320"/>

This demo shows how to integrate yFiles in a [Next.js](https://nextjs.org/) application.

## Running the demo

First, install the required npm modules in the demo directory:

```sh
npm install
```

Now, start the demo:

```sh
npm run dev
```

This will start the development server.
This server will automatically update the application upon code changes.

## Notes

There are no special issues that you need to look out for when you load yFiles as NPM dependency as
in this demo application. However, we recommend including the
[@yworks/optimizer](https://www.npmjs.com/package/@yworks/optimizer) when you deploy your app
for production.

The optimizer will obfuscate the public API of the yFiles library files, as well as yFiles API
usages in application sources.

We highly recommend obfuscating the yFiles for HTML library before deploying your application to a
public web server to reduce the download size of the library for the end user. Note that, at the
time of writing, you are not required to use obfuscation.
