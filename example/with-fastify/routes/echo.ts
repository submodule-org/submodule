import { defineMeta, defineRoute } from "../submodule";

export default defineRoute(({ req }) => {
  return {
    method: req.method,
    headers: req.headers,
    body: req.body,
    query: req.query,
  };
});

export const meta = defineMeta({ methods: ["COPY", "GET", "POST", "PUT"] });
