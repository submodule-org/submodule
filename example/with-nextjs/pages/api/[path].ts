import { NextApiRequest, NextApiResponse } from "next";
import { execute } from "../../server/submodule";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const queries = req.query

  const query = queries.path as string
  const input = { ...queries, ...req.body }

  res.setHeader('content-type', 'application-json')

  await execute(async services => {
    if (services[query]) {
      res.send(await services[query](input))
    } else {
      res.status(404).send(`cannot find path of ${query}`)
    }
  })
}