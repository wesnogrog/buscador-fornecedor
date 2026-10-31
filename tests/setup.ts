import { expect, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

afterEach(() => {
  cleanup()
})

// Mock Supabase client
vi.mock('@/utils/supabase', () => {
  const mockChain = {
    select: vi.fn(function() { return this }),
    eq: vi.fn(function() { return this }),
    contains: vi.fn(function() { return this }),
    not: vi.fn(function() { return this }),
    order: vi.fn(function() { return this }),
    data: null,
    error: null,
  }

  return {
    supabase: {
      from: vi.fn(() => mockChain),
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    },
  }
})

// Suppress console errors in tests (optional, for cleaner output)
const originalError = console.error
beforeAll(() => {
  console.error = vi.fn((...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  })
})
