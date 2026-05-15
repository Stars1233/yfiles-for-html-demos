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
import { D3BarChart } from './ui/D3BarChart'

const template = document.createElement('template')
template.innerHTML = `
<style>
.power-content {
  display: block;
  border: 2px solid #c9c9c9;
  overflow: visible;
  background: rgba(255, 255, 255, 0.85);
}

.power-content:focus {
  outline: 0;
}

.power-contentInfo {
  position: relative;
  padding-top: 4px;
  width: 100%;
  height: 100%;
  display: block;
  text-align: center;
}

.popup-chart {
  position: relative;
  width: 100%;
  height: 100%;
  padding-top: 0.3em;
  padding-left: 1em;
  padding-right: 1em;
}

.node-pointer {
  box-sizing: border-box;
  display: block;
  font-size: 15px;
  width: 100%;
  padding-right: 3px;
  line-height: 1;
  color: #c9c9c9;
  position: absolute;
  text-align: center;
}

#close-button {
  position: absolute;
  right: 0;
  top: 0;
  cursor: pointer;
  padding: 5px;
  z-index: 1;
  color: #a9a9a9;
  transition: color 0.1s ease-in-out;
}

.power-content #close-button:hover {
  color: black;
}

#power-button {
  position: absolute;
  left: 0;
  top: 0;
  cursor: pointer;
  padding: 5px;
  z-index: 1;
}

.power-button-path {
  fill: none;
  stroke: #009c00;
  opacity: 0.5;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke 0.1s ease-in-out;
}

svg:hover .power-button-path {
  opacity: 1;
}

.power-button-path.switched-off {
  stroke: #ff0000 !important;
}

.chart {
  width: 250px !important;
  height: 85px !important;
}

.no-chart {
  width: 250px !important;
  height: 0 !important;
}

.d3-tip {
  line-height: 1;
  font-weight: bold;
  padding: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border-radius: 2px;
  z-index: 10;
}

/* Creates a small triangle extender for the tooltip */
.d3-tip:after {
  box-sizing: border-box;
  display: inline;
  font-size: 10px;
  width: 100%;
  line-height: 1;
  color: rgba(0, 0, 0, 0.8);
  content: '\\25BC';
  position: absolute;
  text-align: center;
}

/* Style northward tooltips differently */
.d3-tip.n:after {
  margin: -1px 0 0 0;
  top: 100%;
  left: 0;
}

.d3-tooltip {
  visibility: hidden;
  position: absolute;
  background: white;
  border: 1px solid black;
  padding: 8px;
  border-radius: 4px;
  width: 85px;
}

.axis text {
  font: 10px sans-serif;
}

.axis path,
.axis line {
  fill: none;
  stroke: #000;
  shape-rendering: crispEdges;
}
</style>

<div id="node-popup-content" class="power-content" tabindex="0">
  <div class="power-contentInfo">
    <div id="power-button" title="Power On/Off">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        x="0px"
        y="0px"
        width="25px"
        height="25px"
        viewBox="0 0 25 25"
        xml:space="preserve"
      >
        <path
          d="m 6.0040426,5.028485 a 10,10 0 1 0 12.0000004,0 m -6,-3 0,10"
          class="power-button-path"
        ></path>
      </svg>
    </div>
    <div
      data-id="name"
      style="font-size: 14px; font-weight: bold; margin-bottom: 4px"
    ></div>
    <div data-id="ip" style="margin-bottom: 4px"></div>
    <div id="close-button" title="Close this label">❌</div>
  </div>
  <div class="popup-chart"></div>
  <div class="node-pointer">▼</div>
</div>
`

/**
 * A popup component that shows the details of a device.
 */
export class DeviceDetailsComponent extends HTMLElement {
  _graphComponent = null
  _device = null

  // the bar chart which is displayed in the node popup
  barChart = null

  /**
   * Gets the {@link GraphComponent} that is associated with this popup.
   */
  get graphComponent() {
    return this._graphComponent
  }

  /**
   * Sets the {@link GraphComponent} that is associated with this popup.
   */
  set graphComponent(value) {
    this._graphComponent = value
  }

  /**
   * Gets the device for which the details are shown in the popup.
   */
  get device() {
    return this._device
  }

  /**
   * Sets the device for which the details are shown in the popup.
   */
  set device(value) {
    this._device = value
  }

  /**
   * Lifecycle callback that is invoked when the element is inserted into the DOM.
   */
  connectedCallback() {
    this.appendChild(template.content.cloneNode(true))
    this.barChart = this.createD3BarChart()
    this.barChart?.barChart(this.device)
    this.updateDeviceInfoElement()
    this.updatePowerButtonState()
    this.registerClickListeners()
  }

  /**
   * Lifecycle callback that is invoked when the element is removed from the DOM.
   */
  disconnectedCallback() {
    this.innerHTML = ''
  }

  /**
   * Updates the bar chart in the popup.
   */
  updateBarChart() {
    this.barChart?.animate()
  }

  updatePowerButtonState() {
    const content = this.querySelector('#node-popup-content')
    const powerButtonPath = content.querySelector('.power-button-path')
    if (this.device?.enabled) {
      powerButtonPath.classList.remove('switched-off')
    } else {
      powerButtonPath.classList.add('switched-off')
    }
  }

  updateDeviceInfoElement() {
    const content = this.querySelector('#node-popup-content')
    // Find and update elements according to their data-id attribute
    content.querySelectorAll('div[data-id]').forEach((element) => {
      if (this.device) {
        const key = element.getAttribute('data-id')
        element.textContent = String(this.device[key] ?? '')
      }
    })
  }

  /**
   * Tries to load d3 for rendering the bar charts in the popup.
   * If this fails for any reason, we disable the bar chart display.
   */
  createD3BarChart() {
    try {
      const content = this.querySelector('#node-popup-content')
      return new D3BarChart(content.querySelector('.popup-chart'))
    } catch {
      // if for some reason d3 has not loaded, this will be caught here,
      // and we disable the d3 charts in the popup
      const chartElement = document.getElementsByClassName('chart')[0]
      chartElement.setAttribute('class', 'no-chart')
      return null
    }
  }

  /**
   * Wire up the functions of the contextual toolbar.
   */
  registerClickListeners() {
    const content = this.querySelector('#node-popup-content')

    // close popup on click of the close button
    content.querySelector('#close-button').addEventListener('click', () => this.close())

    // on click of the power button, toggle a device enabled/disabled
    content.querySelector('#power-button').addEventListener('click', () => {
      if (this.device && this.graphComponent) {
        this.device.enabled = !this.device.enabled
        this.updatePowerButtonState()
        this.graphComponent.invalidate()
      }
    })
  }

  /**
   * Closes the popup.
   */
  close() {
    if (this.graphComponent) {
      const inputMode = this.graphComponent.inputMode
      inputMode.popoverManager.closeAll()
    }
  }
}

customElements.define('device-details-component', DeviceDetailsComponent)
