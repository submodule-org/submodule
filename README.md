# Submodule

<!-- ![Submodule archicture](https://excalidraw.com/#json=KIiVrXXCurMBhmZAZdqAU,pBfYDN9JLGTwYFVetw0cPA "Submodule architecture") -->

# Principle

Submodule approaches in a rather naive destruction of what component make an application an application.

1. Submodule starts with loading `configFn`. You can use whatever you like to build the config object

2. Submodule then passes the config object to `preparedContextFn`. Prepared context is the term we use to explain the space where we may store reusable service like Prisma Client, Mongo Client etc.

3. Once we built the service, we then need to prepare the shape of framework. Nice thing is, Submodule doesn't dictate any specific shape, it is up to your choice to setup your framework. Submodule alos plays nicely with moderating the differences between framework, if you are looking to build a shared interface between ExpressJS handler and Fastify handler, you are at the right place.
`handlerFn` is the place where we can prepare the handler to match with what is needed to operate in desired framework environment, says ExpressJS

4. The `adaptorFn` is where we can start the framework specific routine. For example, we'll need to start ExpressJS to listen on certain port to start handling request. With given information of config and `handlerFn` result, we can register handler to ExpressJS and to start handling accordingly. 
As this is the place where we will finally make the response to requests, we'll need to also handle unexpected exception

# Example

See more examples at how the submodule integrates with few other frameworks under [examples](https://github.com/silenteer/submodule/tree/main/example)