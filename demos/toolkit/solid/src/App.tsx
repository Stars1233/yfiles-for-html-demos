/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) 2026 by yWorks GmbH, Vor dem Kreuzberg 28,
 ** 72070 Tuebingen, Germany. All rights reserved.
 **
 ** yFiles demo files exhibit yFiles for HTML functionalities. Any redistribution
 ** of demo files in source code or binary form, with or without
 ** modification, is not permitted.
 **
 ** Owners of a valid software license for a yFiles for HTML version that this
 ** demo is shipped with are allowed to use the demo source code as basis
 ** for their own yFiles for HTML powered applications. Use of such programs is
 ** governed by the rights and conditions as set out in the yFiles for HTML
 ** license agreement.
 **
 ** THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESS OR IMPLIED
 ** WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 ** MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
 ** NO EVENT SHALL yWorks BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 ** SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 ** TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 ** PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 ** LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 ** NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 ** SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **
 ***************************************************************************/
import type { Component } from 'solid-js'
import './App.css'
import { SolidGraphComponent } from './components/SolidGraphComponent'
import { DemoDescription } from './components/DemoDescription'
import yLogo from './assets/ylogo-large.svg'

export const App: Component = () => {
  return (
    <div class="app">
      <div class="demo-header">
        <a
          href="https://www.yfiles.com/the-yfiles-sdk/web/yfiles-for-html"
          class="y-logo"
          target="_blank"
          title="yFiles Product Page"
        ></a>
        <span class="material-symbols-outlined demo-overview">chevron_right</span>
        <a href="../../../README.html" target="_blank" rel="noopener noreferrer">
          Demos
        </a>
        <span class="material-symbols-outlined demo-overview">chevron_right</span>
        <span>SolidJS Demo</span>
      </div>
      <div class="demo-page__main">
        <div class="graph-panel">
          <SolidGraphComponent />
        </div>
        <DemoDescription></DemoDescription>
      </div>
    </div>
  )
}

export default App
