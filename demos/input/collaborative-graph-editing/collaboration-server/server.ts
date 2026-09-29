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
import * as http from 'node:http'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import { docs, getYDoc, setupWSConnection } from '@y/websocket-server/utils'
import type { YFilesEdgeRecord, YFilesLabelRecord, YFilesNodeRecord } from './yfiles-record-types'

const ROOM_NAME = process.env.ROOM_NAME || 'collaborative-geim'
const HOST = process.env.HOST || 'localhost'
const PORT = parseInteger(process.env.PORT, 3001)
const MAX_GRAPH_ITEMS = parseInteger(process.env.MAX_GRAPH_ITEMS, 200)
const CLEAR_INTERVAL_MS = parseInteger(process.env.CLEAR_INTERVAL_MS, 10 * 60 * 1000)
const ENABLE_GUARD = process.env.ENABLE_GUARD !== 'false'
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'

// The first graph published by a client is the startup seed. Keep it in plain
// objects so later edits cannot mutate the snapshot through Yjs references.
type NodeRecord = YFilesNodeRecord
type EdgeRecord = YFilesEdgeRecord
type RecordData = NodeRecord | EdgeRecord
type RecordSnapshot<T extends object> = Array<[string, T]>
type RoomSeed = { nodes: RecordSnapshot<NodeRecord>; edges: RecordSnapshot<EdgeRecord> }

type ResetStatus = { room: string; remainingMs: number; intervalMs: number }

let roomSeed: RoomSeed | null = null
const guardedDocs = new WeakSet<Y.Doc>()

// There is one replacement for every possible input length from 1 to 15.
// Input longer than 15 characters uses the final entry.
const PRESET_WORDS = [
  'I',
  'at',
  'sun',
  'tree',
  'world',
  'garden',
  'network',
  'computer',
  'discovery',
  'friendship',
  'imagination',
  'conversation',
  'collaboration',
  'characteristic',
  'experimentation'
]

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeWord(word: string): string {
  if (word.length === 0) return word
  return PRESET_WORDS[Math.min(word.length, PRESET_WORDS.length) - 1]
}

function normalizeLabelText(text: string): string {
  return text.replace(/\S+/g, normalizeWord)
}

function isRecordMap(value: unknown): value is Y.Map<unknown> {
  return (
    value !== null && typeof value === 'object' && 'get' in value && typeof value.get === 'function'
  )
}

function isLabelRecord(value: unknown): value is YFilesLabelRecord {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'text' in value &&
    typeof value.text === 'string'
  )
}

function normalizeLabels(record: Y.Map<unknown>): void {
  const labels: unknown = record.get('labels')
  if (!Array.isArray(labels)) {
    record.set('labels', [])
    return
  }

  const results = labels.map((label: unknown): readonly [YFilesLabelRecord, boolean] => {
    if (!isLabelRecord(label)) {
      return [{ text: '' }, true]
    }

    const text = label.text
    const normalizedText = normalizeLabelText(text)
    const labelChanged = text !== normalizedText
    return [{ ...label, text: normalizedText }, labelChanged]
  })
  const normalized = results.map(([label]) => label)
  const changed = results.some(([, labelChanged]) => labelChanged)

  if (changed) record.set('labels', normalized)
}

function sanitizeRecordMap(root: Y.Map<unknown>): void {
  for (const key of Array.from(root.keys())) {
    const record = root.get(key)
    if (!isRecordMap(record)) {
      root.delete(key)
      continue
    }
    normalizeLabels(record)
  }
}

function snapshotRecordMap<T extends RecordData>(root: Y.Map<unknown>): RecordSnapshot<T> {
  return Array.from(root.keys()).flatMap((key) => {
    const record = root.get(key)
    return isRecordMap(record) ? [[key, Object.fromEntries(record.entries()) as T]] : []
  })
}

function restoreRecordMap<T extends RecordData>(
  root: Y.Map<unknown>,
  records: RecordSnapshot<T>
): void {
  for (const [key, record] of records) {
    const restored = new Y.Map<unknown>()
    for (const [field, value] of Object.entries(record)) {
      restored.set(field, value)
    }
    root.set(key, restored)
  }
}

function removeOverflow(root: Y.Map<unknown>, amount: number): number {
  const keys = Array.from(root.keys()).sort()
  for (let index = keys.length - 1; index >= 0 && amount > 0; index -= 1) {
    root.delete(keys[index])
    amount -= 1
  }
  return amount
}

function enforceGraphItemLimit(nodes: Y.Map<unknown>, edges: Y.Map<unknown>): void {
  let overflow = nodes.size + edges.size - MAX_GRAPH_ITEMS
  if (overflow <= 0) return

  // Edges are removed first so that remaining nodes do not refer to missing
  // endpoints. If nodes must be removed, remove their incident edges too.
  overflow = removeOverflow(edges, overflow)
  if (overflow <= 0) return

  const removedNodeIds = new Set()
  const nodeKeys = Array.from(nodes.keys()).sort()
  for (let index = nodeKeys.length - 1; index >= 0 && overflow > 0; index -= 1) {
    const nodeId = nodeKeys[index]
    nodes.delete(nodeId)
    removedNodeIds.add(nodeId)
    overflow -= 1
  }

  for (const edgeId of Array.from(edges.keys())) {
    const edge = edges.get(edgeId)
    const sourceId = isRecordMap(edge) ? edge.get('sourceId') : undefined
    const targetId = isRecordMap(edge) ? edge.get('targetId') : undefined
    if (removedNodeIds.has(sourceId) || removedNodeIds.has(targetId)) edges.delete(edgeId)
  }
}

function installRoomGuard(doc: Y.Doc): void {
  if (guardedDocs.has(doc)) return
  guardedDocs.add(doc)

  let correcting = false
  const guard = (): void => {
    if (correcting) return
    correcting = true
    try {
      doc.transact(() => {
        const nodes = getUnknownMap(doc, 'nodes')
        const edges = getUnknownMap(doc, 'edges')

        sanitizeRecordMap(nodes)
        sanitizeRecordMap(edges)
        enforceGraphItemLimit(nodes, edges)
      })

      if (roomSeed === null) {
        const nodes = getUnknownMap(doc, 'nodes')
        const edges = getUnknownMap(doc, 'edges')

        if (nodes.size > 0 && edges.size > 0) {
          roomSeed = {
            nodes: snapshotRecordMap<NodeRecord>(nodes),
            edges: snapshotRecordMap<EdgeRecord>(edges)
          }
        }
      }
    } finally {
      correcting = false
    }
  }

  doc.on('update', guard)
  guard()
}

let nextResetAt = Date.now() + CLEAR_INTERVAL_MS

function clearRoom(): void {
  const doc = getExistingRoomDoc()
  if (!doc) return
  if (roomSeed === null) {
    console.log(`skipped room reset '${ROOM_NAME}': startup seed is not ready`)
    return
  }
  const seed = roomSeed

  doc.transact(() => {
    const nodes: Y.Map<unknown> = doc.getMap<unknown>('nodes')
    const edges: Y.Map<unknown> = doc.getMap<unknown>('edges')
    nodes.clear()
    edges.clear()
    restoreRecordMap<NodeRecord>(nodes, seed.nodes)
    restoreRecordMap<EdgeRecord>(edges, seed.edges)
  })
  console.log(`reset room '${ROOM_NAME}' to its startup seed`)
}

function getUnknownMap(doc: Y.Doc, name: string): Y.Map<unknown> {
  return doc.getMap(name) as unknown as Y.Map<unknown>
}

function getExistingRoomDoc(): Y.Doc | undefined {
  const value: unknown = docs.get(ROOM_NAME)
  return value instanceof Y.Doc ? value : undefined
}

function getRoomDoc(): Y.Doc {
  const value: unknown = getYDoc(ROOM_NAME)
  if (!(value instanceof Y.Doc)) {
    throw new TypeError(`Unable to create Y.Doc for room '${ROOM_NAME}'`)
  }
  return value
}

function getResetStatus(): ResetStatus {
  const remainingMs = Math.max(0, nextResetAt - Date.now())
  return { room: ROOM_NAME, remainingMs, intervalMs: CLEAR_INTERVAL_MS }
}

function start(): void {
  const server = http.createServer((request, response) => {
    let url: URL

    try {
      url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
    } catch {
      response.writeHead(400)
      response.end('Bad Request')
      return
    }

    if (url.pathname === '/status') {
      const origin = request.headers.origin

      if (origin && (CORS_ORIGIN === '*' || origin === CORS_ORIGIN)) {
        response.setHeader('Access-Control-Allow-Origin', origin)
      }

      response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type')
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('Vary', 'Origin')

      if (request.method !== 'GET') {
        response.writeHead(405, { 'Content-Type': 'text/plain', Allow: 'GET, OPTIONS' })
        response.end('Method Not Allowed')
        return
      }

      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify(getResetStatus()))
      return
    }

    response.writeHead(200, { 'Content-Type': 'text/plain' })
    response.end('collaborative-geim websocket server')
  })

  const websocketServer = new WebSocketServer({ noServer: true })
  websocketServer.on('connection', (connection, request) => {
    // Create and guard the document before y-websocket can process the first
    // client message. The standard Yjs sync and awareness protocol remains
    // unchanged.
    const doc: Y.Doc = getRoomDoc()
    if (ENABLE_GUARD) {
      installRoomGuard(doc)
    }
    setupWSConnection(connection, request, { docName: ROOM_NAME })
  })

  server.on('upgrade', (request, socket, head: Buffer) => {
    let url: URL

    try {
      url = new URL(request.url || '/', `ws://${request.headers.host || 'localhost'}`)
    } catch {
      socket.destroy()
      return
    }

    let room: string

    try {
      room = decodeURIComponent(url.pathname.replace(/^\//, ''))
    } catch {
      socket.destroy()
      return
    }

    if (room !== ROOM_NAME) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
      socket.destroy()
      return
    }

    websocketServer.handleUpgrade(request, socket, head, (connection) => {
      websocketServer.emit('connection', connection, request)
    })
  })

  const clearTimer = setInterval(() => {
    clearRoom()

    // Start a new countdown after the reset.
    nextResetAt = Date.now() + CLEAR_INTERVAL_MS
  }, CLEAR_INTERVAL_MS)

  server.listen(PORT, HOST, () => {
    console.log(`running at '${HOST}' on port ${PORT}`)
    console.log(`room: '${ROOM_NAME}'`)
    console.log(`guard enabled: ${ENABLE_GUARD}`)
    console.log(`max graph items: ${MAX_GRAPH_ITEMS}`)
    console.log(`clear interval: ${CLEAR_INTERVAL_MS} ms`)
  })

  const shutdown = (): void => {
    clearInterval(clearTimer)

    websocketServer.close()

    server.close(() => process.exit(0))
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

if (
  process.argv[1] &&
  new URL(`file://${process.argv[1]}`).pathname === new URL(import.meta.url).pathname
)
  start()

export {
  MAX_GRAPH_ITEMS,
  PRESET_WORDS,
  enforceGraphItemLimit,
  normalizeWord,
  normalizeLabelText,
  installRoomGuard
}
