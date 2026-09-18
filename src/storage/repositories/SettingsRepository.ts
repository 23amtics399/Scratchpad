import { db } from '../db.js'
import type { SettingsRecord } from '@/types/index.js'
import { DEFAULT_SETTINGS } from '@/types/index.js'

export class SettingsRepository {
  async get(): Promise<SettingsRecord> {
    const settings = await db.settings.get('global')
    return settings ?? { ...DEFAULT_SETTINGS }
  }

  async save(settings: SettingsRecord): Promise<void> {
    await db.settings.put(settings)
  }

  async patch(changes: Partial<Omit<SettingsRecord, 'id'>>): Promise<void> {
    const current = await this.get()
    await db.settings.put({ ...current, ...changes })
  }

  async reset(): Promise<void> {
    await db.settings.put({ ...DEFAULT_SETTINGS })
  }
}

export const settingsRepository = new SettingsRepository()
