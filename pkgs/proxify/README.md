# Oversimplified utility to provide simple proxy operation

## Usage

```typescript
import { proxify } from "@submodule/proxify"

const { value, update } = proxify({ object: 'value', nested: { another: 'value' } }) // objects and arrays are accepted

// You can update the value of value by using
update({ object: 'beta' })

console.log(value.object) // expect to be 'beta'

const nested = value.nested
update({ object: 'beta', nested: { another: 'another' } }})

console.log(nested.another) // expect to be 'another'
``` 