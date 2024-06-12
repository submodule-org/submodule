# submodule helpers

A collection of utilities pre-made functions for submodule ecosystem.

## Noteworthy mentions

### Main
main is a function to wrap around your common execution. Main function will also listen to node SIGINT and SIGTERM and will shutdown gracefully.

Use `main` and wrap as many executions as you want. On shutdown, all executions will be disposed (triggering the lifecycle event)

### Pino
[pino](https://github.com/pinojs/pino). A wrapper around pino. Easily share a premade configuration

Use `setLoggerConfig` to set the logger configuration.
Use `createLogger` to create a new logger. This logger will share the same configuration as the root logger.
