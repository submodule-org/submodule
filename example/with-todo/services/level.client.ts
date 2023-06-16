import { create } from "@submodule/core"
import { Level } from "level"

import { config } from "../config"

export const level = create(async config => {
  const db = new Level(config.levelConfig.name)
  await db.open({ createIfMissing: true })
  
  return db
}, config)