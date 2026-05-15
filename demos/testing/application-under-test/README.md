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
# application-under-test Demo - yFiles for HTML

This demo is a simple app used as the test candidate in the following testing demos:

- [Cypress Demo](../../../demos-ts/testing/cypress/README.html)
- [Jest Puppeteer Demo](../../../demos-js/testing/jest-puppeteer/README.html)
- [Playwright Demo](../../../demos-ts/testing/playwright/README.html)
- [Jest Puppeteer Demo](../../../demos-js/testing/jest-puppeteer/README.html)
- [Selenium WebDriver Demo](../../../demos-ts/testing/selenium-webdriver/README.html)
- [Vitest Demo](../../../demos-ts/testing/vitest/README.html)
- [WebdriverIO Demo](../../../demos-ts/testing/wdio/README.html)

Please refer to the README files in these demos for further guidance.

A simple way to make a yFiles App testable is making the [GraphComponent](https://docs.yworks.com/yfileshtml/api/GraphComponent) available to the testing framework. In this app, this is achieved by setting the instantiated [GraphComponent](https://docs.yworks.com/yfileshtml/api/GraphComponent) as a property of the `Window` object.
