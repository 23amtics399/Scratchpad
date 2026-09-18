import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import type { WorkspaceRecord } from '@/types/index.js'

export class WorkspaceRepository {
  async getAll(): Promise<WorkspaceRecord[]> {
    return db.workspaces.toArray()
  }

  async getById(id: string): Promise<WorkspaceRecord | undefined> {
    return db.workspaces.get(id)
  }

  async create(name: string): Promise<WorkspaceRecord> {
    const now = Date.now()
    const workspace: WorkspaceRecord = {
      id: uuidv4(),
      name,
      createdAt: now,
      updatedAt: now,
    }
    await db.workspaces.add(workspace)
    return workspace
  }

  async update(id: string, changes: Partial<Pick<WorkspaceRecord, 'name'>>): Promise<void> {
    await db.workspaces.update(id, { ...changes, updatedAt: Date.now() })
  }

  async delete(id: string): Promise<void> {
    await db.workspaces.delete(id)
  }

  /** Returns an existing default workspace or creates one */
  async getOrCreateDefault(): Promise<WorkspaceRecord> {
    const all = await this.getAll()
    if (all.length > 0) return all[0]
    return this.create('My Workspace')
  }
}

export const workspaceRepository = new WorkspaceRepository()
