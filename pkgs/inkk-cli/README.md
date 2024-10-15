# inkk

`Incomplete Knowledge Kernel`, aka `inkk` (thanks ChatGPT for the suggestion)

## Why inkk?

[Copy n' paste is the king](https://x.com/dummy_coder/status/1846020965773595000)

Think about Shadcn/UI, but applies for other places. Turns out, copy and paste holds a lot of merit, and it is actually a great deal in the AI world.

## What inkk brings to the table?

- Way way easier reusing code snippet between projects, especially when it comes to typescript codes, there are a lot of time where Type interference are way to complicated to wrap libraries around (and a lot of time impossible to do so)
- Library always come with a lot of restrictions, and noises because it tends to cover cases you don't use as well. Well, copy and paste and you can copy what is needed, rather than everything
- Way easier to debug, the code you copied are just right there, you can make changes, slap in console.log and see what happened
- No more hair pulling due to library versioning complexities, you can just copy and paste, and you are good to go

# getting stared

- Install inkk globally or locally
- Run `inkk init` to create a config file
- Run `inkk add <component>` to add a component to the config
- Profit

# how inkk works?

There are 3 concepts in how inkk works

- `medium`: inkk package is just any other js package that you can install with npm, yarn, pnpm, bun, etc.
- `mechanism`: once inkk package is installed, the cli will look for `component.json` for component configuration, then files of the component will be copied to the target directory following the component instruction
- `transform`: there are certain things you can do to custom the component for the usage, at the moment, there is only copy or not copy, but more will be added in the future

# different to stuff like `shadcn/ui`

- inkk uses package manager to carry out the source. Package manager supports a pretty wide range of package source like git, ssh, file etc
- inkk uses package manager, as such, versioning, resetting to specific version will be pretty easy and straightforward
- as inkk uses package manager, authorizing/altering any package source will be way easier

# specification (and example)

### inkk.json

```json
{
  "version": "1.0",
  "pkg": "bun",
  "components": [
    {
      "name": "componento@*",
      "alias": "c"
    }
  ],
  "installDir": "mods"
}
```

### component.json

```json
{
  {
    "name": "componento",
    "version": "1.0.0",
    "files": [
      "README.md",
      {
        "file": "custom.ts",
        "overwrite": true
      }
    ]
  }
}
```

### cli
`(bunx | npm run | yarn run) inkk add componento`

will copy `README.md` and `custom.ts` to `mods/componento`

## License

[MIT](LICENSE).