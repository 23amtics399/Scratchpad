export interface RectLike {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}

export interface Insets {
  top?: number
  bottom?: number
  left?: number
  right?: number
}

export type PlacementPreference = 'above' | 'below' | 'right' | 'left'

export interface CalculateOverlayPositionOptions {
  anchorRect: RectLike
  overlayRect: { width: number; height: number }
  viewportRect: RectLike
  preferredPlacements?: PlacementPreference[]
  gap?: number
  safeInsets?: Insets
  avoidRect?: RectLike | null
}

export interface OverlayPositionResult {
  top: number
  left: number
  placement: PlacementPreference
  maxHeight?: number
  maxWidth?: number
  collided: boolean
}

/**
 * Normalizes a DOMRect or bounding box to RectLike
 */
export function toRectLike(rect: DOMRect | ClientRect | { top: number; left: number; width: number; height: number }): RectLike {
  const bottom = 'bottom' in rect ? rect.bottom : rect.top + rect.height
  const right = 'right' in rect ? rect.right : rect.left + rect.width
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom,
    right,
  }
}

/**
 * Checks if two rectangles intersect (with an optional margin)
 */
export function rectsIntersect(r1: RectLike, r2: RectLike, margin = 0): boolean {
  return !(
    r1.right + margin <= r2.left ||
    r1.left - margin >= r2.right ||
    r1.bottom + margin <= r2.top ||
    r1.top - margin >= r2.bottom
  )
}

/**
 * Collision-aware, reusable positioning engine for all floating contextual overlays.
 * Calculates optimal placement ensuring the overlay NEVER obscures anchor content,
 * caret/selection, or boundary safe areas (editor toolbar, menu bar, status bar, viewport edges).
 */
export function calculateOverlayPosition({
  anchorRect,
  overlayRect,
  viewportRect,
  preferredPlacements = ['above', 'below', 'right', 'left'],
  gap = 8,
  safeInsets = {},
  avoidRect = null,
}: CalculateOverlayPositionOptions): OverlayPositionResult {
  const insets = {
    top: safeInsets.top ?? 8,
    bottom: safeInsets.bottom ?? 8,
    left: safeInsets.left ?? 8,
    right: safeInsets.right ?? 8,
  }

  // Safe boundary bounds
  const minBoundaryTop = viewportRect.top + insets.top
  const maxBoundaryBottom = viewportRect.bottom - insets.bottom
  const minBoundaryLeft = viewportRect.left + insets.left
  const maxBoundaryRight = viewportRect.right - insets.right

  const availableAbove = anchorRect.top - minBoundaryTop - gap
  const availableBelow = maxBoundaryBottom - anchorRect.bottom - gap
  const availableRight = maxBoundaryRight - anchorRect.right - gap
  const availableLeft = anchorRect.left - minBoundaryLeft - gap

  // Helper to test if a candidate placement fits without clipping boundary or anchor
  const tryPlacement = (placement: PlacementPreference): { top: number; left: number; fits: boolean; candidateRect: RectLike } => {
    let top = 0
    let left = 0
    let fits = false

    if (placement === 'above') {
      top = anchorRect.top - overlayRect.height - gap
      left = anchorRect.left

      // Clamping horizontally
      if (left + overlayRect.width > maxBoundaryRight) {
        left = maxBoundaryRight - overlayRect.width
      }
      if (left < minBoundaryLeft) {
        left = minBoundaryLeft
      }

      fits = top >= minBoundaryTop && availableAbove >= overlayRect.height
    } else if (placement === 'below') {
      top = anchorRect.bottom + gap
      left = anchorRect.left

      // Clamping horizontally
      if (left + overlayRect.width > maxBoundaryRight) {
        left = maxBoundaryRight - overlayRect.width
      }
      if (left < minBoundaryLeft) {
        left = minBoundaryLeft
      }

      fits = top + overlayRect.height <= maxBoundaryBottom && availableBelow >= overlayRect.height
    } else if (placement === 'right') {
      left = anchorRect.right + gap
      top = anchorRect.top

      // Clamping vertically
      if (top + overlayRect.height > maxBoundaryBottom) {
        top = maxBoundaryBottom - overlayRect.height
      }
      if (top < minBoundaryTop) {
        top = minBoundaryTop
      }

      fits = left + overlayRect.width <= maxBoundaryRight && availableRight >= overlayRect.width
    } else if (placement === 'left') {
      left = anchorRect.left - overlayRect.width - gap
      top = anchorRect.top

      // Clamping vertically
      if (top + overlayRect.height > maxBoundaryBottom) {
        top = maxBoundaryBottom - overlayRect.height
      }
      if (top < minBoundaryTop) {
        top = minBoundaryTop
      }

      fits = left >= minBoundaryLeft && availableLeft >= overlayRect.width
    }

    const candidateRect: RectLike = {
      top,
      left,
      width: overlayRect.width,
      height: overlayRect.height,
      bottom: top + overlayRect.height,
      right: left + overlayRect.width,
    }

    // Check collision with avoidRect (e.g. caret or active selection)
    if (avoidRect && fits) {
      if (rectsIntersect(candidateRect, avoidRect, 2)) {
        fits = false
      }
    }

    // Check collision with anchor rect itself
    if (fits && rectsIntersect(candidateRect, anchorRect)) {
      fits = false
    }

    return { top, left, fits, candidateRect }
  }

  // Check preferred placements in order
  for (const p of preferredPlacements) {
    const result = tryPlacement(p)
    if (result.fits) {
      return {
        top: result.top,
        left: result.left,
        placement: p,
        collided: false,
      }
    }
  }

  // If no placement fits without clipping/colliding, pick the placement with maximum vertical clearance
  let fallbackPlacement: PlacementPreference = 'below'
  let maxHeight: number = availableBelow

  if (availableAbove > availableBelow && availableAbove > 60) {
    fallbackPlacement = 'above'
    maxHeight = Math.max(80, availableAbove)
  } else {
    fallbackPlacement = 'below'
    maxHeight = Math.max(80, availableBelow)
  }

  let finalTop = 0
  let finalLeft = anchorRect.left

  if (fallbackPlacement === 'above') {
    const effectiveHeight = Math.min(overlayRect.height, maxHeight)
    finalTop = Math.max(minBoundaryTop, anchorRect.top - effectiveHeight - gap)
  } else {
    finalTop = Math.min(maxBoundaryBottom - Math.min(overlayRect.height, maxHeight), anchorRect.bottom + gap)
  }

  // Clamp horizontally
  if (finalLeft + overlayRect.width > maxBoundaryRight) {
    finalLeft = maxBoundaryRight - overlayRect.width
  }
  if (finalLeft < minBoundaryLeft) {
    finalLeft = minBoundaryLeft
  }

  return {
    top: finalTop,
    left: finalLeft,
    placement: fallbackPlacement,
    maxHeight,
    maxWidth: maxBoundaryRight - minBoundaryLeft,
    collided: true,
  }
}
