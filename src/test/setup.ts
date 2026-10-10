import { vi, beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

configure({ asyncUtilTimeout: 4000 })

afterEach(() => {
  cleanup()
})

// Mock URL.createObjectURL and URL.revokeObjectURL for jsdom
const mockCreateObjectURL = vi.fn(() => `blob:mock-${Math.random().toString(36).slice(2)}`)
const mockRevokeObjectURL = vi.fn()

import { Blob as NodeBlob, File as NodeFile } from 'node:buffer'

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = mockCreateObjectURL
  window.URL.revokeObjectURL = mockRevokeObjectURL
  // @ts-expect-error NodeBlob compatibility with DOM Blob
  window.Blob = NodeBlob
  // @ts-expect-error NodeFile compatibility with DOM File
  window.File = NodeFile

  window.matchMedia =
    window.matchMedia ||
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

  if (typeof Range !== 'undefined') {
    Range.prototype.getClientRects = Range.prototype.getClientRects || (() => [] as unknown as DOMRectList)
    Range.prototype.getBoundingClientRect = Range.prototype.getBoundingClientRect || (() => ({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect))
  }
}
// @ts-expect-error NodeBlob compatibility
globalThis.Blob = NodeBlob

// Suppress known console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress React test act() warnings
    if (typeof args[0] === 'string' && args[0].includes('act(')) return
    originalError(...args)
  }
})

afterAll(() => {
  console.error = originalError
})
