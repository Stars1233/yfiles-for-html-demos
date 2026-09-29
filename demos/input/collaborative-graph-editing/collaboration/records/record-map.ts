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
import * as Y from 'yjs'

/**
 * A record map backed by one nested Y.Map per record.
 *
 * The nested map makes top-level record fields independent Yjs map entries.
 * For example, a layout update and a label update made concurrently can be
 * merged instead of replacing each other's complete record. Nested objects,
 * such as `layout`, are still merged as one field.
 */
export type FieldLevelRecordMap<T extends object> = {
  readonly size: number
  get(key: string): T | undefined
  has(key: string): boolean
  keys(): IterableIterator<string>
  [Symbol.iterator](): IterableIterator<[string, T]>
  /** Observes changed record IDs; registering does not invoke the observer. */
  observe(observer: (keys: readonly string[]) => void): void
  /** Removes a previously registered observer. */
  unobserve(observer: (keys: readonly string[]) => void): void
  /** Replaces the complete set of top-level fields for one record. */
  set(key: string, record: T): void
  /** Writes only fields that differ between the complete snapshots supplied. */
  setPatch(key: string, record: T, previous: T | undefined): void
  /** Removes one record and reports whether it existed. */
  delete(key: string): boolean
  /** Removes all records. */
  clear(): void
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readRecord<T extends object>(value: unknown): T | undefined {
  if (value === undefined) return undefined
  if (!(value instanceof Y.Map)) {
    throw new Error('Field-level record maps can only contain nested Y.Maps')
  }
  return Object.fromEntries(value.entries()) as T
}

function equalValues(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length && left.every((value, index) => equalValues(value, right[index]))
    )
  }
  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(right, key) && equalValues(left[key], right[key])
      )
    )
  }
  return false
}

/**
 * Creates a shared record map with top-level field-level merge semantics.
 *
 * `root` is the Y.Map that owns the nested record maps. The wrapper owns the
 * nested storage representation; callers continue to use the record type at
 * the root declaration. Callers should use this wrapper for reads and writes;
 * values stored directly in `root` must be nested `Y.Map` instances, not plain
 * records. `setPatch` expects `previous` to be the complete prior snapshot;
 * merging is only performed between top-level fields, not inside nested values.
 */
export function createFieldLevelRecordMap<T extends object>(
  doc: Y.Doc,
  root: Y.Map<T>
): FieldLevelRecordMap<T> {
  // Nested maps are an internal storage detail owned by this helper.
  const sharedRoot = root as unknown as Y.Map<unknown>
  const observers = new Map<
    (keys: readonly string[]) => void,
    (events: Array<Y.YEvent<Y.AbstractType<unknown>>>) => void
  >()

  const transact = (action: () => void): void => doc.transact(action)

  const ensureRecordMap = (key: string, record: T): Y.Map<unknown> => {
    const current = sharedRoot.get(key)
    if (current instanceof Y.Map) return current
    if (current !== undefined) {
      throw new Error(`Record "${key}" is not stored as a nested Y.Map`)
    }

    const nested = new Y.Map<unknown>()
    sharedRoot.set(key, nested)
    for (const [field, value] of Object.entries(record)) nested.set(field, value)
    return nested
  }

  const set = (key: string, record: T): void => {
    transact(() => {
      const nested = ensureRecordMap(key, record)
      const fields = new Set(Object.keys(record))
      for (const field of nested.keys()) {
        if (!fields.has(field)) nested.delete(field)
      }
      for (const [field, value] of Object.entries(record)) nested.set(field, value)
    })
  }

  const setPatch = (key: string, record: T, previous: T | undefined): void => {
    transact(() => {
      const nested = ensureRecordMap(key, record)
      const recordFields = new Set(Object.keys(record))
      if (!previous) {
        for (const field of nested.keys()) {
          if (!recordFields.has(field)) nested.delete(field)
        }
      }
      const previousFields = previous ? Object.keys(previous) : []
      const fields = new Set([...previousFields, ...Object.keys(record)])
      for (const field of fields) {
        const nextValue = (record as Record<string, unknown>)[field]
        const previousValue = previous ? (previous as Record<string, unknown>)[field] : undefined
        if (Object.prototype.hasOwnProperty.call(record, field)) {
          if (!previous || !equalValues(nextValue, previousValue)) nested.set(field, nextValue)
        } else if (Object.prototype.hasOwnProperty.call(previous ?? {}, field)) {
          nested.delete(field)
        }
      }
    })
  }

  const map: FieldLevelRecordMap<T> = {
    get: (key) => readRecord<T>(sharedRoot.get(key)),
    has: (key) => sharedRoot.has(key),
    keys: () => sharedRoot.keys(),
    [Symbol.iterator]: function* (): IterableIterator<[string, T]> {
      for (const [key, value] of sharedRoot) {
        const record = readRecord<T>(value)
        if (record) yield [key, record]
      }
    },
    get size() {
      return sharedRoot.size
    },
    observe: (observer) => {
      const previousListener = observers.get(observer)
      if (previousListener) sharedRoot.unobserveDeep(previousListener)
      const listener = (events: Array<Y.YEvent<Y.AbstractType<unknown>>>): void => {
        const keys = new Set<string>()
        for (const event of events) {
          const [recordId] = event.path
          if (typeof recordId === 'string') {
            keys.add(recordId)
          } else {
            for (const key of event.keys.keys()) {
              if (typeof key === 'string') keys.add(key)
            }
          }
        }
        observer([...keys])
      }
      observers.set(observer, listener)
      sharedRoot.observeDeep(listener)
    },
    unobserve: (observer) => {
      const listener = observers.get(observer)
      if (!listener) return
      sharedRoot.unobserveDeep(listener)
      observers.delete(observer)
    },
    set,
    setPatch,
    delete: (key) => {
      let deleted = false
      transact(() => {
        deleted = sharedRoot.has(key)
        sharedRoot.delete(key)
      })
      return deleted
    },
    clear: () => transact(() => sharedRoot.clear())
  }

  return map
}
