import { DatabaseOptions, Level } from "level"

export type LevelConfig = {
  name: string
  config?: DatabaseOptions<string, string>
}


export async function createDb({ name, config }: LevelConfig): Promise<Level> {
  const db = new Level(name, config)
  await db.open({ createIfMissing: true })
  
  return db
}