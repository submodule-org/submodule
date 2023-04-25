export function defineRouteModule<
  RouteFn,  
  RouteModule = { handle: RouteFn }
>(routeFn: RouteFn) {
  return routeFn
}
