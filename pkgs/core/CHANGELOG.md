# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [4.1.0](https://github.com/submodule-js/submodule/compare/@submodule/core4.0.0...@submodule/core4.1.0) (2023-05-31)


### Features

* added runing mode, added hijack to test dependencies ([937c074](https://github.com/submodule-js/submodule/commit/937c074399b7c4d28d4fc574f62d3cb663e9c472))

## [4.0.0](https://github.com/submodule-js/submodule/compare/@submodule/core3.2.0...@submodule/core4.0.0) (2023-05-31)


### ⚠ BREAKING CHANGES

* simplify api surface

### Features

* simplify api surface ([9e76b20](https://github.com/submodule-js/submodule/commit/9e76b20f50c1370e4bd933cef5254b56ffd22b4d))

## [3.2.0](https://github.com/submodule-js/submodule/compare/@submodule/core3.1.0...@submodule/core3.2.0) (2023-05-09)


### Features

* api update, executor can also be used as initArgs ([0d2b698](https://github.com/submodule-js/submodule/commit/0d2b698340fb095e996285ed5e34494a42d35c3f))

## [3.1.0](https://github.com/submodule-js/submodule/compare/@submodule/core3.0.0...@submodule/core3.1.0) (2023-05-08)


### Features

* added compose api ([9ca937c](https://github.com/submodule-js/submodule/commit/9ca937c9e35c953dc7ea1f17e7bde4e355861a18))

## [3.0.0](https://github.com/submodule-js/submodule/compare/@submodule/core2.1.0...@submodule/core3.0.0) (2023-05-08)


### ⚠ BREAKING CHANGES

* completely oversimplified API

### Features

* completely oversimplified API ([5a4d721](https://github.com/submodule-js/submodule/commit/5a4d7216689d04270cdb05165a6a016290f91ced))

## [2.1.0](https://github.com/submodule-js/submodule/compare/@submodule/core2.0.0...@submodule/core2.1.0) (2023-05-06)


### Features

* added instrument option, each function can be wrapped and instrumented
* initArgs can be added using an async function, that helps with function composition
* added config() and services() to retrieve config and services directly
* change for 2.1 ([0f54ba4](https://github.com/submodule-js/submodule/commit/0f54ba4722ee4d2b723a6bfed631b0c39ff9abd7))

## [2.0.0](https://github.com/submodule-js/submodule/compare/@submodule/core1.1.1...@submodule/core2.0.0) (2023-05-05)


### ⚠ BREAKING CHANGES

* made core way simpler

### Features

* made core way simpler ([c128d43](https://github.com/submodule-js/submodule/commit/c128d43a609116be8d8ee8d0d9e609a9803fd5e4))

### [1.1.1](https://github.com/submodule-js/submodule/compare/@submodule/core1.1.0...@submodule/core1.1.1) (2023-05-04)


### Features

* bundle ts-toolbelt ([10cb739](https://github.com/submodule-js/submodule/commit/10cb739521575d30039c0098b2eed80beb700f52))

## 1.1.0 (2023-05-04)


### ⚠ BREAKING CHANGES

* prepare for a very big change
* added tsup to bundle, added dev command, added build command
* changed API, completly

### Features

* add more examples ([420f669](https://github.com/submodule-js/submodule/commit/420f669d31ac05c407e33d736e80b7fb3e6c7900))
* added commands dir, for extension ([1734917](https://github.com/submodule-js/submodule/commit/1734917acfe0cd47f805f0a211388d76dd5f4478))
* added commands extension without commander ([6318ce0](https://github.com/submodule-js/submodule/commit/6318ce00f470a19ee0477a0a83521b28cf264f45))
* added createCaller API to call from outside ([6ccb4c0](https://github.com/submodule-js/submodule/commit/6ccb4c04c3ce6a089051f115029a234caeebdcce))
* added createClient, access instance out of context ([07f3ca3](https://github.com/submodule-js/submodule/commit/07f3ca352b3f5bc515f9b50e443d469470ca4137))
* added deno checking ([5174657](https://github.com/submodule-js/submodule/commit/5174657fcd8dd24fb119eb74e8be941769262aed))
* added few more APIs, SPIs ([caa6f84](https://github.com/submodule-js/submodule/commit/caa6f8497ebd71d0176a807de0248e21598dc98c))
* added more defaults ([59cf533](https://github.com/submodule-js/submodule/commit/59cf533d876e9d532dd5cf200ca915a84973bfb2))
* added more generate-friendly functions ([591f2a6](https://github.com/submodule-js/submodule/commit/591f2a678d57c4241b9a974d159f77dc7bcf8893))
* added prepareExecutable to support serveless environment ([075e05d](https://github.com/submodule-js/submodule/commit/075e05d8203caf0b7473906de15084276f2e90fe))
* added submodule builder ([c2933c4](https://github.com/submodule-js/submodule/commit/c2933c4df218171f33eb83058cfb612a43adcd61))
* added submoduleArg to createCommands to create generate method ([c467ac2](https://github.com/submodule-js/submodule/commit/c467ac265ea872dbd29486639499a70f4131cfae))
* added tsup to bundle, added dev command, added build command ([81b3c65](https://github.com/submodule-js/submodule/commit/81b3c65023cb8be371b778368e94666fc4762dba))
* adding sensible defaults ([9414e11](https://github.com/submodule-js/submodule/commit/9414e11255e172469372d37b2ca1f636f6786319))
* auto carry shape of routeModule to the router, less code for createRoute ([5ee2cb8](https://github.com/submodule-js/submodule/commit/5ee2cb8e055d96e7248edcef737338fc0a6828da))
* by default, subcommand will just call the default function of the corresponding route ([10fd127](https://github.com/submodule-js/submodule/commit/10fd12754ba578d2207432b611958210db1be0d2))
* changed API, completly ([f99388c](https://github.com/submodule-js/submodule/commit/f99388c85b58f699a7500d7e7ea9cdf6a9c8b5f1))
* launch ([b3261b4](https://github.com/submodule-js/submodule/commit/b3261b4343dfe7738ac95c8fe729b43c521371bf))
* made aop ([2e29d68](https://github.com/submodule-js/submodule/commit/2e29d68b39acde1319c5fbc68f94bed3dd700631))
* made cli available as submodule ([b73fda7](https://github.com/submodule-js/submodule/commit/b73fda75e851a9566d0173391d4f32416524af86))
* prepare for a very big change ([e1c837f](https://github.com/submodule-js/submodule/commit/e1c837f7038246ea00a9afad50d772127f9bc086))
* restraint api version of opentelemetry ([9981a02](https://github.com/submodule-js/submodule/commit/9981a02c9ab33787369b60d022e7896f96b163e1))
* update type API ([87dbf92](https://github.com/submodule-js/submodule/commit/87dbf92f5b0c97567da0374211b71bddab8f1ac5))
* upgrade types API ([c33e2e2](https://github.com/submodule-js/submodule/commit/c33e2e266aca8f65c1e93d1f4bf1f87413d322fc))


### Bug Fixes

* cleanup dependencies ([6e0cccd](https://github.com/submodule-js/submodule/commit/6e0cccd134eccc5fe3448c680abec773eda736ba))
* reduce the use of this ([4874ce3](https://github.com/submodule-js/submodule/commit/4874ce3504af8356f11fada4df8eb7a0870ba90f))

### [1.0.4](https://github.com/submodule-js/submodule/compare/v1.0.3...v1.0.4) (2023-04-30)


### Bug Fixes

* reduce the use of this ([4874ce3](https://github.com/submodule-js/submodule/commit/4874ce3504af8356f11fada4df8eb7a0870ba90f))

### [1.0.3](https://github.com/submodule-js/submodule/compare/v1.0.2...v1.0.3) (2023-04-30)

### [1.0.2](https://github.com/submodule-js/submodule/compare/v1.0.1...v1.0.2) (2023-04-30)

### 1.0.1 (2023-04-30)
