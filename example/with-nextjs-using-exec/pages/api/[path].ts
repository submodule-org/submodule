import { NextApiRequest, NextApiResponse } from "next";
import { exec } from "../../server/submodule";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const queries = req.query

  const query = queries.path as string
  const input = { ...queries, ...req.body }
  
  res.setHeader('content-type', 'application-json')
  
  const result = await exec(({ services, input }) => {
    return services.todoService.add(input)
  }, { value: '123456' })

  if (result) {
    res.send(JSON.stringify(result))
  } else {
    res.end()
  }
}