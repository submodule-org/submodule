# [Submodule documentation](https://submodule.js.org)

The doc is out of date, soon to be updated

_actualization_ in the document meant the result of a function excution, assume the function execution is expensive/or unexpected (for example, we expect limited amount of instances)

_factory_ is the function that used to provide the value

# Common usecases

### Provide a value factory, actualize when needed. Use provide
```typescript
const scope = createScope()

const valueExecutor = provide(() => /* Some value */)
const value = await scope.resolve(valueExecutor)
```
Factory can be a sync or async function. `scope#resolve` is always async ops
Within same the same scope, the value is cached (singleton)

### Derive value
```typescript
const scope = createScope()

const seed = provide(async () => /* Read from config */)
const hashFnExecutor = map(seed, (seed) => () => /* Do hashing */)
const hashFn = await scope.resolve(hashFnExecutor)
```

### Create submodule function that requires some input

Given this code
```typescript
map(
  dependencies,                     // static dependency reference
  (dependencies) => {               // actualized static dependencies
                                    // preparation code, reusable part, cache etc
    return (inputParams: any[]): FinalValue => { // Runtime dependencies
      /* Implementation */
    }
  }
)
```

Example
```typescript
const scope = createScope()

const seed = provide(async () => /* Read from config */)
const hashFnExecutor = map(seed, (seed) => (value: string) => /* Do hashing */)
const hashFn = await scope.resolve(hashFnExecutor)
// hashFn('value') <-- hashed value
```

### Use multiple dependencies

Use combine to group multiple dependencies
```typescript
const stringValue = provide(() => '1')
const intValue = provide(() => 2)
const combined: Executor<{ stringValue: string, intValue: number }> = combine({ stringValue, intValue })

const use = map(combined, ({ intValue, stringValue}) => { /**/ })
//                           ^^ int
//                                     ^^ string

// shortcut, works most of the time, soemtime typescript can't resolve it
const use = map({ stringValue, intValue }, ({ intValue, stringValue}) => { /**/ })
```

### Group similar executors (like routes)
```typescript
const stringValue1 = provide(() => '1')
const stringValue2 = provide(() => '2')

const stringValues: Executor<string[]> = group(stringValue1, stringValue2 )
```

### Refer to the current scope inside a factory / conditional value

Use the special `scoper` to access to the current scope.

```typescript
const constantSeed = provide(() => 1)
const randomSeed = provide(() => Math.random())

const seed = map(
  combine({
    scoper,
    constantSeed: value(constantSeed), // wrap inside value so it won't be resolved
    randomSeed: value(randomSeed), // wrap inside value so it won't be resolved
  }),
  async ({ 
    scoper,
    constantSeed,
    randomSeed
  }) => {
    if (condition) return await scoper.resolve(constantSeed)
    return await scoper.resolve(randomSeed)
  }
)
```

Can also use `flat` to resolve `Executor<Executor<V>>`
```typescript
// In that case 
const seed = flat(map(
  combine({
    constantSeed: value(constantSeed), // wrap inside value so it won't be resolved
    randomSeed: value(randomSeed), // wrap inside value so it won't be resolved
  }),
  async ({ 
    constantSeed,
    randomSeed
  }) => condition ? constantSeed : randomSeed
))
```

And `flatMap` does exactly so
```typescript
const seed = flatMap(
  combine({
    constantSeed: value(constantSeed), // wrap inside value so it won't be resolved
    randomSeed: value(randomSeed), // wrap inside value so it won't be resolved
  }),
  async ({ 
    constantSeed,
    randomSeed
  }) => condition ? constantSeed : randomSeed
)
```

# Testing
Main purpose of submodule is to make the code
- side-effect free (app'll be faster to start)
- testing made easy
- testing should be fast, and easy, mock free and can run in parallel

Scope is the key in this testing technique

There are certain common testing techniques

### Assume value in the change to simluate different testing situations

For example
```typescript
function tomorrow() {
  /** implementation */
}
```
This function is likely rely on `new Date()` to implement. This is a global object and by mocking the global object, the test will not be able to run in parallel and depending on test framework mocking to be able to test.

Rewrite the code into
```typescript
const newDateFn = value(() => new Date())
const tomorrowFn = map(newDateFn, (newDateFn) => {
  /** Implementation **/
})
```
The implementation is mostly the same, now how to test?

```typescript
// use ResolveValue to force value of dependency

const scope = createScope()
scope.resolveValue(newDateFn, value(() => /* mock date*/))

const r = await scope.resolve(torrowFn)
r() // <-- day after the mock date
```