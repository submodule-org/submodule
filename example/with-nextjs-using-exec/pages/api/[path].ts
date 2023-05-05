import { NextApiRequest, NextApiResponse } from "next";
import { exec } from "../../server/submodule";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const queries = req.query

  const query = queries.path as string
  const input = { ...queries, ...req.body }
  
  res.setHeader('content-type', 'application-json')
  
  await exec(async ({ services }) => {
    if (services.todoService[query]) {
      res.send(await services.todoService[query](input))
    } else {
      res.status(404).send(`cannot find path of ${query}`)
    }
  })
}