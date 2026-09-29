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
import type { HealthDashboardEntry } from './healthcare-types'

export interface Theme {
  opaque: string
  transparent: string
}

export const HOSPITAL_THEME: Theme = { opaque: '#e8536a', transparent: '#e8536a10' }

export const TRANSPORT_THEMES: Record<string, Theme> = {
  'walk-in': { opaque: '#1fa9c4', transparent: '#1fa9c460' },
  'ems-ground': { opaque: '#3fae80', transparent: '#3fae8060' },
  'ems-air': { opaque: '#f0ac5c', transparent: '#f0ac5c60' },
  home: { opaque: '#6883ba', transparent: '#6883ba60' }
}

export const UNIT_COLORS: Partial<Record<string, string>> = {
  'ER Triage': '#e8536a',
  'ER Acute': '#f4919f',
  'CT 1': '#328b9b',
  'CT 2': '#1fa9c4',
  'X-ray 1': '#4dd6ef',
  'X-ray 2': '#66e7ff',
  ICU: '#f1c1c8',
  'Cath Lab': '#3fae80',
  'Med-Surg': '#5fdba8',
  'Cardiology Clinic': '#8eeac4',
  'Oncology Clinic': '#8fe0be',
  'Neurology Clinic': '#f0ac5c',
  'General Clinic': '#f9d9a0',
  Rehabilitation: '#c7388c',
  Home: '#6883ba',
  'Walk-in': '#1fa9c4',
  'EMS (Ground)': '#3fae80',
  'EMS (Air)': '#f0ac5c'
}

export const HEALTHCARE_ICONS: Record<string, string> = { hospital: 'health_cross', unit: 'ward' }

export function getTransportTheme(key: string): Theme | undefined {
  return TRANSPORT_THEMES[key.toLowerCase()]
}

export function getNodeId(dataItem: HealthDashboardEntry): string {
  return (
    (dataItem.type === 'source' || dataItem.type === 'destination'
      ? dataItem.id
      : dataItem.parentId
    )
      ?.toString()
      .toLowerCase() ?? ''
  )
}
