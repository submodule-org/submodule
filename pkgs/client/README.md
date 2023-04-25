# @submodule/client

A client should be able to do `client('query', <corresponding request shape>)` and receive `Promise<corresponding response type>`

The shape we are looking for is simple, `RouteA | RouteB | RouteC` with each route having `routeName` to distinguise. The `routeName` will be used to feed `query`.
Once we have the shape, it is easy to build any client

Then there'll need to have series of helper to transform the collection of routes to the shape we expected

- Transform from `{ path1: module1, path2: module2 }` to `{ routeName: path1, routeModule: module1 } | { routeName: path2, routeModule: module2 }`
- From that shape, we'll need to figure out what is the Input type
- Then, we'll need to figure out what is the Output type

As such, the createClient will need
- type to extract Input
- type to extract Output
