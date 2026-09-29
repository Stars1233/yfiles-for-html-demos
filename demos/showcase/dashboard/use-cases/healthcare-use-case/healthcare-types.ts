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
import type { DashboardConnection, DashboardEntry } from '../../types'

export type Hospital = {
  id: string
  name: string
  lat: number
  lon: number
  city: string
  country: string
}

export type Unit = {
  id: string
  name: string
  hospitalId: string
  deptId: string
  capacity: {
    beds: number
    doctor?: { required: number; onDuty: number }
    nurse?: { required: number; onDuty: number }
    practitioner?: { required: number; onDuty: number }
    tech?: { required: number; onDuty: number }
  }
}

export type Event = {
  patientId: string
  ts: string
  type: string
  hospitalId: string
  unitId?: string
  source?: string
}

export type HealthcareData = { hospitals: Hospital[]; units: Unit[]; events: Event[] }

export type HealthDashboardEntry = DashboardEntry & {
  hospitalId?: string
  deptId?: string
  capacity?: {
    beds: number
    doctor: { required: number; onDuty: number }
    nurse: { required: number; onDuty: number }
    practitioner: { required: number; onDuty: number }
    tech: { required: number; onDuty: number }
  }
  activePatients?: number
  bedOccupancy?: number
  staffLoad?: number
  loadPercentage?: number
}

export type HealthDashboardConnection = DashboardConnection & { time?: string; pathId?: string }
