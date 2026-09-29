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
import { LitNodeStyle } from '@yfiles/demo-utils/LitNodeStyle'
import { svg } from 'lit-html'
import { LitSvgText } from '@yfiles/demo-utils/LitSvgText'

/**
 * Creates a detailed electricity network node style with zoom-responsive layouts.
 *
 * Renders three detail levels:
 * - Zoom > 0.7: Full card with icon, name, country, utilization metrics, and progress bar
 * - Zoom > 0.3: Medium card with icon and title
 * - Zoom ≤ 0.3: Compact circular icon
 *
 * Displays type-specific metrics (demand for consumers, output for producers, throughput for distributors).
 * Colors and text scale based on entity type and utilization status.
 *
 * @returns INodeStyle configured for electricity network visualization
 */
export function createElectricityNodeStyle() {
  /**
   * Render function that generates SVG based on zoom level and node data.
   * Maps entity types to Material Design icons and calculates utilization metrics.
   */
  const renderFunction = ({ layout, tag, selected, zoom }) => {
    let icon = 'favorite'
    switch (tag.type) {
      case 'producer-nuclear':
        icon = 'electric_bolt'
        break
      case 'producer-gas':
        icon = 'gas_meter'
        break
      case 'producer-solar':
        icon = 'sunny'
        break
      case 'producer-biomass':
        icon = 'compost'
        break
      case 'consumer-industrial':
        icon = 'factory'
        break
      case 'consumer-residential':
        icon = 'home'
        break
      case 'producer-coal':
        icon = 'mode_heat'
        break
      case 'producer-wind':
        icon = 'wind_power'
        break
      case 'producer-hydro':
        icon = 'water'
        break
      case 'distributor-substation':
        icon = 'cable'
        break
      case 'consumer-commercial':
        icon = 'store'
        break
    }

    const currentTimestampUtilization = tag.currentTimestampData?.utilization ?? 0
    let currentUtilization
    if (tag.type.startsWith('consumer')) {
      currentUtilization = currentTimestampUtilization * tag.peakDemandMW
    } else if (tag.type.startsWith('producer')) {
      currentUtilization = currentTimestampUtilization * tag.capacityMW
    } else {
      currentUtilization = currentTimestampUtilization * tag.throughputCapacityMW
    }

    let country
    switch (tag.country) {
      default:
      case 'FR':
        country = 'France'
        break
      case 'FI':
        country = 'Finland'
        break
      case 'PL':
        country = 'Poland'
        break
      case 'DE':
        country = 'Germany'
        break
      case 'UK':
        country = 'United Kingdom'
        break
      case 'NL':
        country = 'Netherlands'
        break
      case 'ES':
        country = 'Spain'
        break
      case 'PT':
        country = 'Portugal'
        break
      case 'BE':
        country = 'Belgium'
        break
      case 'DK':
        country = 'Denmark'
        break
      case 'CZ':
        country = 'Czech Republic'
        break
      case 'IE':
        country = 'Ireland'
        break
    }

    return zoom > 0.7
      ? svg`
<g>
  <defs>
    <clipPath id="card-clip">
      <rect
        x="1"
        y="1"
        width="${layout.width}"
        height="${layout.height}"
        rx="13"
      />
    </clipPath>
  </defs>

  <!-- Card -->
  <rect
    x="1"
    y="1"
    width="${layout.width}"
    height="${layout.height}"
    rx="13"
    class="node-background"
  />

  <!-- Consumer accent -->
  <rect
    x="1"
    y="1"
    width="4"
    height="${layout.height}"
    clip-path="url(#card-clip)"
    class="${tag.type}"
  />

  <!-- Type icon -->
  <text
    x="31"
    y="38"
    text-anchor="middle"
    font-size="22"
    class="material-symbols-outlined ${tag.type}"
  >
    ${icon}
  </text>

  <!-- Title -->
  <text
    x="56"
    y="27"
    font-size="12"
    font-weight="700"
    class="node-text"
  >
    ${tag.name}
  </text>

  <!-- Location -->
  <text
    x="56"
    y="44"
    style="font-size:12px"
    class="material-symbols-outlined node-text"
  >
    location_on
  </text>

  <text
    x="70"
    y="42"
    fill="#778399"
    font-size="10"
    class="node-text-secondary"
  >
    ${country}
  </text>

  <!-- Divider -->
  <line
    x1="15"
    y1="58"
    x2="${layout.width - 15}"
    y2="58"
    class="node-background"
  />

  <!-- Current demand -->
  <text
    x="17"
    y="75"
    fill="#778399"
    font-size="9"
    font-weight="600"
    letter-spacing="0.3"
    class="node-text-secondary"
  >
    ${tag.type.startsWith('consumer') ? 'CURRENT DEMAND' : tag.type.startsWith('producer') ? 'OUTPUT' : 'THROUGHPUT'}
  </text>

  <text
    x="17"
    y="96"
    font-size="15"
    font-weight="700"
    class="${tag.type}"
  >
    ${Math.floor(currentUtilization)}MW
  </text>

  <!-- Peak demand -->
  <text
    x="122"
    y="75"
    fill="#778399"
    font-size="9"
    font-weight="600"
    letter-spacing="0.3"
    class="node-text-secondary"
  >
    ${tag.type.startsWith('consumer') ? 'PEAK DEMAND' : 'CAPACITY'}
  </text>

  <text
    x="122"
    y="96"
    fill="#172033"
    font-size="15"
    font-weight="700"
    class="node-text"
  >
     ${tag.type.startsWith('consumer') ? tag.peakDemandMW : tag.type.startsWith('distributor') ? tag.throughputCapacityMW : tag.capacityMW}MW
  </text>

  <!-- Utilization -->
  <text
    x="274"
    y="96"
    font-size="16"
    font-weight="800"
    text-anchor="end"
    class="${tag.type}"
  >
    ${(currentTimestampUtilization * 100).toFixed(2)}%
  </text>

  <!-- Progress track -->
  <rect
    x="17"
    y="113"
    width="${layout.width - 30}"
    height="6"
    rx="3"
    class="progress-background"
  />

  <!-- Progress fill: 74.3% of 306px -->
  <rect
    x="17"
    y="113"
    rx="3"
    style="width:${(layout.width - 30) * currentTimestampUtilization}px;height:6px"
    class="${tag.type} progress-bar"
  />
</g>`
      : zoom > 0.3
        ? svg`
<g>
  <!-- Card -->
  <rect
    x="1"
    y="1"
    width="${layout.width}"
    height="${layout.height}"
    rx="13"
    class="node-background"
  />

  <!-- Type icon -->
  <text
    x="31"
    y="${layout.height / 2 + 23}"
    text-anchor="middle"
    fill="white"
    style="font-size:46px"
    class="material-symbols-outlined ${tag.type}"
  >
    ${icon}
  </text>

  <!-- Title -->
  ${LitSvgText({ text: tag.name, x: 70, y: 12, maxWidth: layout.width - 80, fill: 'white', font: 'normal 32px sans-serif', className: 'node-text' })}
</g>`
        : svg`
<g>
  <!-- Card -->
  <rect
    x="0"
    y="0"
    width="${layout.width}"
    height="${layout.height}"
    rx="50%"
    class="${tag.type}"
  />

  <!-- Type icon -->
  <text
    x="${layout.width / 2}"
    y="${layout.height / 2 + 42}"
    text-anchor="middle"
    style="font-size:84px; fill: #2a3e50"
    class="material-symbols-outlined node-text-reversed"
  >
    ${icon}
  </text>
</g>`
  }

  return new ElectricityNodeStyle(renderFunction)
}

/**
 * Custom LitNodeStyle for electricity network nodes.
 * Applies CSS classes to SVG elements for theme-based styling.
 */
class ElectricityNodeStyle extends LitNodeStyle {
  cssClass = 'electricity-node'

  /**
   * Creates a visual with electricity-node CSS class applied.
   */
  createVisual(context, node) {
    const visual = super.createVisual(context, node)
    if (this.cssClass) {
      visual.svgElement.classList.add(...this.cssClass.split(' '))
    }
    return visual
  }

  /**
   * Updates visual while preserving CSS classes.
   */
  updateVisual(context, oldVisual, node) {
    const visual = super.updateVisual(context, oldVisual, node)
    visual.svgElement.classList.remove(...visual.svgElement.classList)
    if (this.cssClass) {
      visual.svgElement.classList.add(...this.cssClass.split(' '))
    }
    return visual
  }
}
