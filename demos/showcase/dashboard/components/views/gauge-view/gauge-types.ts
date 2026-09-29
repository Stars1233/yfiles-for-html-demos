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
/**
 * Load level indicator for status badges.
 * Used to categorize system health or utilization states.
 */
export type LoadLevel = 'normal' | 'medium' | 'high'

/**
 * Text line to display in gauge ring center.
 *
 * @property text - Display text
 * @property className - Optional CSS class for styling
 */
export interface GaugeCenterLine {
  text: string
  className?: string
}

/**
 * Configuration for a single gauge ring (outer or inner).
 *
 * @property percentage - Fill percentage (0–100)
 * @property sectionLabel - Optional label shown above the ring section
 * @property centerLines - Optional text lines rendered in ring center
 * @property arcTitle - Optional title shown below the inner arc
 */
export interface GaugeRingConfig {
  percentage: number
  sectionLabel?: string
  centerLines?: GaugeCenterLine[]
  arcTitle?: string
}

/**
 * Status badge configuration displayed in the gauge card.
 *
 * @property label - Display text (e.g., "Normal", "High Load")
 * @property level - Status level for color coding
 */
export interface StatusBadge {
  label: string
  level: LoadLevel
}

/**
 * Key performance indicator (KPI) statistic to display.
 *
 * @property label - Metric name (e.g., "Capacity", "Units")
 * @property value - Metric value
 */
export interface StatItem {
  label: string
  value: string
}

/**
 * Complete gauge card configuration.
 * Displays dual concentric rings with optional status badge and KPI statistics.
 *
 * @property title - Card title
 * @property outerRing - Configuration for outer (larger) ring
 * @property innerRing - Configuration for inner (smaller) ring
 * @property statusBadge - Optional status indicator badge
 * @property statItems - Optional KPI statistics list
 */
export interface GaugeConfig {
  title: string
  outerRing: GaugeRingConfig
  innerRing: GaugeRingConfig
  statusBadge?: StatusBadge
  statItems?: StatItem[]
}
