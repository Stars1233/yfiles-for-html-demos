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
# Jest Puppeteer Demo – yFiles for HTML

<img src="../../../doc/demo-thumbnails/jest-puppeteer.webp" alt="demo-thumbnail" height="320"/>

This demo shows how to use [Jest](https://jestjs.io/) for integration testing a web application that uses yFiles for HTML.

You can find more information about [testing a yFiles-based application](../../README.html) in general, and about using [Jest and yFiles](https://docs.yworks.com/yfileshtml/dguide/testing/#testing-jest) together in particular, in the documentation.

### Starting the demo and running the integration tests

1.  Go to the demo's directory `demos-ts/testing/jest-puppeteer`.
2.  Run `npm install`.
3.  Run the integration tests: `npm run test:integration`.
4.  Run the integration tests in watch mode: `npm run test:integration:watch`.

The integration tests check yFiles functionality by simulating node, edge and port creation gestures and verifying that the graph instance actually contains the newly created graph items.

The tests run in a [Puppeteer environment](https://github.com/smooth-code/jest-puppeteer) instead of the default [jsdom](https://github.com/jsdom/jsdom) environment, because yFiles for HTML needs a common, standards-compliant browser environment, which jsdom does not provide (in particular, jsdom lacks a complete SVG DOM implementation).

With Puppeteer, the tests can be run in a complete Chrome headless environment.

The application under test is the [Simple Testable App](../application-under-test/index.html). The GraphComponent instance is accessed from its parent element through the `[data-this]` attribute.
