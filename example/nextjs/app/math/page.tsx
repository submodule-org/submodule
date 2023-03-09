import { getClient } from "@submodule/cli"

export default async function Math() {
  const message = await getClient().router['hello'].handle({}) as string

  return <>
    <div>This is a math endpoint</div>
    <div>{JSON.stringify(message)}</div>
  </>
}