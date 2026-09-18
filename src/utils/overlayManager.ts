/**
 * Global contextual overlay coordinator.
 * Ensures only one contextual floating tool/menu is active at a time
 * and coordinates dismissals on global events.
 */

export type OverlayId =
  | 'table-toolbar'
  | 'more-formatting'
  | 'bubble-menu'
  | 'slash-commands'
  | 'link-dialog'
  | 'color-picker'
  | 'context-menu'
  | (string & {})

class OverlayManager {
  private activeOverlayId: OverlayId | null = null

  /**
   * Opens an overlay and notifies all other overlays to close.
   */
  open(id: OverlayId): void {
    this.activeOverlayId = id
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('scratchpad:close-overlays', {
          detail: { exceptId: id },
        })
      )
    }
  }

  /**
   * Closes the specified overlay if it is currently active.
   */
  close(id: OverlayId): void {
    if (this.activeOverlayId === id) {
      this.activeOverlayId = null
    }
  }

  /**
   * Closes all active contextual overlays.
   */
  closeAll(exceptId?: OverlayId): void {
    if (this.activeOverlayId && this.activeOverlayId !== exceptId) {
      this.activeOverlayId = null
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('scratchpad:close-overlays', {
          detail: { exceptId },
        })
      )
    }
  }

  getActiveOverlay(): OverlayId | null {
    return this.activeOverlayId
  }
}

export const overlayManager = new OverlayManager()
