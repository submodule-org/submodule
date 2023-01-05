var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/commands/run.ts
var run_exports = {};
__export(run_exports, {
  default: () => run_default
});
module.exports = __toCommonJS(run_exports);
var import_commander = require("commander");
var import_require_dir = __toESM(require("require-dir"));
var import_path = __toESM(require("path"));
var import_zod = require("zod");
function tryRequire(args) {
  try {
    return require(import_path.default.join(args.dir, args.modulePath));
  } catch (e) {
    if (!!args.optional)
      return void 0;
    else
      throw e;
  }
}
var submoduleSchema = import_zod.z.object({
  configFn: import_zod.z.function().optional(),
  preparedContextFn: import_zod.z.function().optional(),
  handlerFn: import_zod.z.function().optional(),
  adaptorFn: import_zod.z.function().optional()
});
var run_default = new import_commander.Command().option("--cwd", "current working dir", process.cwd()).option("-c, --config", "config file", "./submodule").option("-r, --routeDir", "route dir", "./routes").action(async (args) => {
  const nonValidatedSubmodule = tryRequire({ dir: args.cwd, modulePath: args.config });
  const submodule = submoduleSchema.parse(nonValidatedSubmodule.default || nonValidatedSubmodule);
  const config = submodule?.configFn?.() || {};
  const preparedContext = submodule?.preparedContextFn?.({ config }) || {};
  const routes = (0, import_require_dir.default)(import_path.default.join(args.cwd, args.routeDir));
  const preparedRoutes = submodule?.handlerFn?.({ config, preparedContext, handlers: routes }) || routes;
  await submodule?.adaptorFn?.({ config, preparedContext, router: preparedRoutes });
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=run.js.map