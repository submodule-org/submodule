import { program } from "commander"

export default function ({ config, args }) {
  program
    .action(() => {
      console.log(config)
    })
    .parse(args, { from: 'user' })
}