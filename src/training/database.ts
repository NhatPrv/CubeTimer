import Dexie, { type EntityTable } from 'dexie'
import type { Session, Solve } from './records'

export class TrainingDatabase extends Dexie {
  sessions!: EntityTable<Session, 'id'>
  solves!: EntityTable<Solve, 'id'>

  constructor(name = 'CubeTimer') {
    super(name)
    this.version(1).stores({
      sessions: 'id,[puzzleId+createdAtMs+id]',
      solves: 'id,[puzzleId+sessionId+finishedAtMs+id]',
    })
  }
}
