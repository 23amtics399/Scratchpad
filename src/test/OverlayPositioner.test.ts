import { describe, it, expect } from 'vitest'
import {
  calculateOverlayPosition,
  rectsIntersect,
  type RectLike,
} from '@/utils/overlayPositioner.js'

describe('OverlayPositioner — Collision-Aware Positioning Engine', () => {
  const viewport: RectLike = {
    top: 0,
    left: 0,
    width: 1280,
    height: 800,
    bottom: 800,
    right: 1280,
  }

  const safeInsets = { top: 40, bottom: 20, left: 16, right: 16 }

  it('1. Chooses "above" placement when there is sufficient clearance above anchor', () => {
    // Anchor in middle of viewport: top: 300, bottom: 400
    const anchor: RectLike = {
      top: 300,
      left: 100,
      width: 400,
      height: 100,
      bottom: 400,
      right: 500,
    }

    const overlay = { width: 200, height: 60 }

    const result = calculateOverlayPosition({
      anchorRect: anchor,
      overlayRect: overlay,
      viewportRect: viewport,
      safeInsets,
      gap: 8,
    })

    expect(result.placement).toBe('above')
    expect(result.top).toBe(300 - 60 - 8) // 232
    expect(result.top).toBeGreaterThanOrEqual(viewport.top + safeInsets.top)
    expect(result.collided).toBe(false)

    // Verify no intersection with anchor
    const overlayPlaced: RectLike = {
      top: result.top,
      left: result.left,
      width: overlay.width,
      height: overlay.height,
      bottom: result.top + overlay.height,
      right: result.left + overlay.width,
    }
    expect(rectsIntersect(overlayPlaced, anchor)).toBe(false)
  })

  it('2. Falls back to "below" when space above is insufficient (e.g. table near top of editor)', () => {
    // Table at top of document: top: 48 (only 8px below safeInsets.top of 40)
    const anchor: RectLike = {
      top: 48,
      left: 100,
      width: 600,
      height: 200,
      bottom: 248,
      right: 700,
    }

    // Full toolbar height: 80px
    const overlay = { width: 500, height: 80 }

    const result = calculateOverlayPosition({
      anchorRect: anchor,
      overlayRect: overlay,
      viewportRect: viewport,
      safeInsets,
      gap: 8,
    })

    // Must NOT be placed above because available clearance is only 8px (< 80px)
    expect(result.placement).toBe('below')
    expect(result.top).toBe(248 + 8) // Placed below table bottom
    expect(result.collided).toBe(false)

    // Verify it does NOT cover the first row of table cells (top of table)
    const overlayPlaced: RectLike = {
      top: result.top,
      left: result.left,
      width: overlay.width,
      height: overlay.height,
      bottom: result.top + overlay.height,
      right: result.left + overlay.width,
    }
    expect(rectsIntersect(overlayPlaced, anchor)).toBe(false)
    expect(overlayPlaced.top).toBeGreaterThanOrEqual(anchor.bottom)
  })

  it('3. Compact pill also obeys collision rules and moves below when space above is too small', () => {
    // Table at top: top: 44px (only 4px below safeInsets.top)
    const anchor: RectLike = {
      top: 44,
      left: 80,
      width: 500,
      height: 150,
      bottom: 194,
      right: 580,
    }

    const compactPill = { width: 140, height: 32 }

    const result = calculateOverlayPosition({
      anchorRect: anchor,
      overlayRect: compactPill,
      viewportRect: viewport,
      safeInsets,
      gap: 6,
    })

    expect(result.placement).toBe('below')
    expect(result.top).toBe(194 + 6)
    expect(result.collided).toBe(false)

    const overlayPlaced: RectLike = {
      top: result.top,
      left: result.left,
      width: compactPill.width,
      height: compactPill.height,
      bottom: result.top + compactPill.height,
      right: result.left + compactPill.width,
    }
    expect(rectsIntersect(overlayPlaced, anchor)).toBe(false)
  })

  it('4. Never covers caret / active selection (avoidRect)', () => {
    const anchor: RectLike = {
      top: 200,
      left: 100,
      width: 400,
      height: 300,
      bottom: 500,
      right: 500,
    }

    const overlay = { width: 250, height: 60 }

    // Suppose caret is near top of anchor (e.g. top: 180-210)
    const caretRect: RectLike = {
      top: 130,
      left: 120,
      width: 20,
      height: 20,
      bottom: 150,
      right: 140,
    }

    const result = calculateOverlayPosition({
      anchorRect: anchor,
      overlayRect: overlay,
      viewportRect: viewport,
      safeInsets,
      gap: 8,
      avoidRect: caretRect,
    })

    const overlayPlaced: RectLike = {
      top: result.top,
      left: result.left,
      width: overlay.width,
      height: overlay.height,
      bottom: result.top + overlay.height,
      right: result.left + overlay.width,
    }

    expect(rectsIntersect(overlayPlaced, caretRect)).toBe(false)
  })

  it('5. Clamps horizontal placement safely within viewport insets', () => {
    const anchor: RectLike = {
      top: 200,
      left: 1200, // Near right edge of 1280px viewport
      width: 100,
      height: 100,
      bottom: 300,
      right: 1300,
    }

    const overlay = { width: 300, height: 50 }

    const result = calculateOverlayPosition({
      anchorRect: anchor,
      overlayRect: overlay,
      viewportRect: viewport,
      safeInsets,
      gap: 8,
    })

    // Must be clamped so left + width <= viewport.right - safeInsets.right (1280 - 16 = 1264)
    expect(result.left + overlay.width).toBeLessThanOrEqual(viewport.right - safeInsets.right)
  })

  it('6. Calculates constrained maxHeight when space is limited', () => {
    // Tiny viewport height: 300
    const smallViewport: RectLike = {
      top: 0,
      left: 0,
      width: 800,
      height: 300,
      bottom: 300,
      right: 800,
    }

    const anchor: RectLike = {
      top: 50,
      left: 50,
      width: 400,
      height: 200,
      bottom: 250,
      right: 450,
    }

    const tallOverlay = { width: 300, height: 250 }

    const result = calculateOverlayPosition({
      anchorRect: anchor,
      overlayRect: tallOverlay,
      viewportRect: smallViewport,
      preferredPlacements: ['above', 'below'],
      safeInsets: { top: 10, bottom: 10, left: 10, right: 10 },
      gap: 6,
    })

    expect(result.collided).toBe(true)
    expect(result.maxHeight).toBeDefined()
    expect(result.maxHeight).toBeGreaterThan(0)
  })
})
