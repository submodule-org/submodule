var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/cli.ts
var import_node = require("esbuild-register/dist/node");
var import_commander = require("commander");
var import_require_dir = __toESM(require("require-dir"));
(0, import_node.register)({});
var commandMods = (0, import_require_dir.default)(`${__dirname}/commands`);
Object.keys(commandMods).forEach((commandName) => {
  const command = commandMods[commandName]?.default;
  if (!(command instanceof import_commander.Command)) {
    delete commandMods[command];
  }
});
var defaultCommandKey = Object.keys(commandMods).find((command) => command === "_default");
var commandKeys = Object.keys(commandMods).filter((command) => command !== "_default");
var program = defaultCommandKey ? commandMods[defaultCommandKey] : new import_commander.Command();
commandKeys.forEach((name) => {
  const command = commandMods[name].default;
  command.name(name);
  program.addCommand(command);
});
program.parse();
//# sourceMappingURL=cli.js.map