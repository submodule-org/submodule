# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [8.1.0](https://github.com/submodule-org/submodule/compare/v8.0.0...v8.1.0) (2024-12-10)


### Features

* added controller API so stream can also be controlled from outside ([eed0547](https://github.com/submodule-org/submodule/commit/eed0547112cd92dc99241ea059700bbe9ba405d1))

## [8.0.0](https://github.com/submodule-org/submodule/compare/v7.6.0...v8.0.0) (2024-12-10)


### Features

* added experimental publisher ([aa47ec4](https://github.com/submodule-org/submodule/commit/aa47ec4bfb3604a6f7e8d6e175e552eedd3654c2))
* added more capability to filter ([aa47ec4](https://github.com/submodule-org/submodule/commit/aa47ec4bfb3604a6f7e8d6e175e552eedd3654c2))
* added more meaningful id to each executor ([aa47ec4](https://github.com/submodule-org/submodule/commit/aa47ec4bfb3604a6f7e8d6e175e552eedd3654c2))
* added update API to trigger changes ([aa47ec4](https://github.com/submodule-org/submodule/commit/aa47ec4bfb3604a6f7e8d6e175e552eedd3654c2))
* move resolve logic to scope (instead of individual executor) ([aa47ec4](https://github.com/submodule-org/submodule/commit/aa47ec4bfb3604a6f7e8d6e175e552eedd3654c2))


### Bug Fixes

* use Map instead of WeakMap ([ee29eba](https://github.com/submodule-org/submodule/commit/ee29ebaa359434ca23f92f76598d144fc33ae86e))


### Tests

* added leak test ([8ae3f79](https://github.com/submodule-org/submodule/commit/8ae3f79dd835d6c87520259e75a37eade4b850e8))

## [7.6.0](https://github.com/submodule-org/submodule/compare/v7.5.8...v7.6.0) (2024-11-13)


### Features

* added defaults API ([5d18bd1](https://github.com/submodule-org/submodule/commit/5d18bd114ce777b35572faddd5966f9df61bf06e))

## [7.5.8](https://github.com/submodule-org/submodule/compare/v7.5.7...v7.5.8) (2024-11-08)


### Features

* added experimental preset* API ([bee39e0](https://github.com/submodule-org/submodule/commit/bee39e0766f9d86ba747c6e3fffe13e933266300))


### Miscellaneous Chores

* release 7.5.8 ([f9a9360](https://github.com/submodule-org/submodule/commit/f9a9360ccdb394f34a6ea09c0cd5dbbc05ca46a4))

## [7.5.7](https://github.com/submodule-org/submodule/compare/v7.5.6...v7.5.7) (2024-11-07)


### Bug Fixes

* corrected test ([126c554](https://github.com/submodule-org/submodule/commit/126c5544054754fb50cd97fa1212efdfa89abcab))


### Miscellaneous Chores

* release 7.5.7 ([f498446](https://github.com/submodule-org/submodule/commit/f49844644ef30d485c8c1e109f62f5f7a2c8dc1b))

## [7.5.6](https://github.com/submodule-org/submodule/compare/v7.5.5...v7.5.6) (2024-11-07)


### Bug Fixes

* correct the case handling function as key ([ce0ac36](https://github.com/submodule-org/submodule/commit/ce0ac367ade3de7fef20eaeea74e36948c6a99a3))

## [7.5.5](https://github.com/submodule-org/submodule/compare/v7.5.4...v7.5.5) (2024-11-07)


### Bug Fixes

* corrected keybuilder behavior ([82e322e](https://github.com/submodule-org/submodule/commit/82e322e3d8774200c1f80a22bb7fd77d41222f40))

## [7.5.4](https://github.com/submodule-org/submodule/compare/v7.5.3...v7.5.4) (2024-11-07)


### Bug Fixes

* loosen type for createFamily ([05262dd](https://github.com/submodule-org/submodule/commit/05262ddd9035f7249b3b2b1ae8aba8ea74627256))

## [7.5.3](https://github.com/submodule-org/submodule/compare/v7.5.2...v7.5.3) (2024-11-07)


### Bug Fixes

* improved createFamily typing ([6bdd907](https://github.com/submodule-org/submodule/commit/6bdd9071a400b0e055568b0cb0012fa39c199066))

## [7.5.2](https://github.com/submodule-org/submodule/compare/v7.5.1...v7.5.2) (2024-11-07)


### Bug Fixes

* corrected types for group ([5cc0565](https://github.com/submodule-org/submodule/commit/5cc0565c00aab726b509dc528010ca37d8b41b90))

## [7.5.1](https://github.com/submodule-org/submodule/compare/v7.5.0...v7.5.1) (2024-11-07)


### Features

* refined options for createFamily, with cacheControl ([20d2a53](https://github.com/submodule-org/submodule/commit/20d2a539f69d6be425b44daa93ad62a9338ef571))

## [7.5.0](https://github.com/submodule-org/submodule/compare/v7.4.2...v7.5.0) (2024-11-06)


### Features

* added createFamily API to address building actor-like, multiple instances ([a2cb489](https://github.com/submodule-org/submodule/commit/a2cb489f0503785e4f0593f0b70ddb959459c085))

## [7.4.2](https://github.com/submodule-org/submodule/compare/v7.4.1...v7.4.2) (2024-11-05)


### Bug Fixes

* remove codemod so the path became normal ([c720f38](https://github.com/submodule-org/submodule/commit/c720f38c7f3eff886c41e40c2bd0a5dcca7d3d3e))

## [7.4.1](https://github.com/submodule-org/submodule/compare/v7.4.0...v7.4.1) (2024-11-05)


### Features

* added executor#separate to combine to retrieve the original pre combined executor ([c5d457c](https://github.com/submodule-org/submodule/commit/c5d457cbe89fa809114f16c090a521978e2a1f5f))


### Bug Fixes

* use jscodeshift instead of typescript on its own for codemod ([141830b](https://github.com/submodule-org/submodule/commit/141830b5d92f91e105ec0ca3b55132923ea10901))

## [7.4.0](https://github.com/submodule-org/submodule/compare/v7.3.0...v7.4.0) (2024-11-01)


### Features

* added codemod to convert create to provide and map ([e6710c0](https://github.com/submodule-org/submodule/commit/e6710c0806caf334968539163cbb0e0e57d911c2))

## [7.3.0](https://github.com/submodule-org/submodule/compare/v7.2.0...v7.3.0) (2024-10-29)


### Features

* added safeRun API (to replace execute) ([e081526](https://github.com/submodule-org/submodule/commit/e0815265b7823fe7b21b8537c174c168c44e888a))

## [7.2.0](https://github.com/submodule-org/submodule/compare/v7.1.2...v7.2.0) (2024-10-28)


### Features

* added safeResolve API ([059d6d7](https://github.com/submodule-org/submodule/commit/059d6d71d25fc3b09f34d508aa870a3f4139ee85))
* make combine compatible with array as well ([8c4685a](https://github.com/submodule-org/submodule/commit/8c4685a11abd53ed88ab7e9532ad9e2ff740e097))


### Miscellaneous Chores

* release 7.2.0 ([e33d445](https://github.com/submodule-org/submodule/commit/e33d4456597537276ec7731867cb6a975ab9adbd))

## [7.1.2](https://github.com/submodule-org/submodule/compare/v7.1.1...v7.1.2) (2024-10-28)


### Miscellaneous Chores

* change dependency type, this package has no dependency ([f978d6c](https://github.com/submodule-org/submodule/commit/f978d6c0d13e3a740ce937f6e383b363afd7349f))

## [7.1.1](https://github.com/submodule-org/submodule/compare/v1.0.4...v7.1.1) (2024-10-28)


### ⚠ BREAKING CHANGES

* prepare for next version
* clean up `from` API
* simplify api surface
* completely oversimplified API
* made core way simpler

### Features

* add overriding ([676a47b](https://github.com/submodule-org/submodule/commit/676a47b300c0a9ea626b5a459d12ab1d37c46a8f))
* added booting and shutdown utilities ([766407c](https://github.com/submodule-org/submodule/commit/766407cb7efb7e56b0178a7eba89d06a65161b43))
* added compose api ([9ca937c](https://github.com/submodule-org/submodule/commit/9ca937c9e35c953dc7ea1f17e7bde4e355861a18))
* added createFactory, an atom to have better authoring ([b0e2018](https://github.com/submodule-org/submodule/commit/b0e20183d473fe4a37af106a32e84847f666ccac))
* added make API ([97e968d](https://github.com/submodule-org/submodule/commit/97e968d682f630804cfefd829897d22e9b59b4ff))
* added onError and onExecute ([08849c3](https://github.com/submodule-org/submodule/commit/08849c3cb0d9d87347e4ee07d8866417f2bbe7f5))
* added prepare function ([938b719](https://github.com/submodule-org/submodule/commit/938b719ea08632ef4fa0718fd9cc15cf4b8a4b6d))
* added prepare to from result ([59a5af9](https://github.com/submodule-org/submodule/commit/59a5af9b85b939d41b6099de5bbb464ac5b6e457))
* added prepareExecutable to support serveless environment ([075e05d](https://github.com/submodule-org/submodule/commit/075e05d8203caf0b7473906de15084276f2e90fe))
* added ProvideOption to all operations ([ea6e1cb](https://github.com/submodule-org/submodule/commit/ea6e1cbed692a67e8c506d553aa55fa0df72291e))
* added providerOption to staged ([d1376ae](https://github.com/submodule-org/submodule/commit/d1376ae7870fcb07fda5857b392b5726b9f36a1a))
* added proxify package ([18882da](https://github.com/submodule-org/submodule/commit/18882dac8e31f9dc96dbd3ee7f09eb728b13acce))
* added receipes package to cover common patterns ([00fcf2d](https://github.com/submodule-org/submodule/commit/00fcf2d9309a49c8fa2aa281d6a891035fa78fc8))
* added runing mode, added hijack to test dependencies ([937c074](https://github.com/submodule-org/submodule/commit/937c074399b7c4d28d4fc574f62d3cb663e9c472))
* api update, executor can also be used as initArgs ([0d2b698](https://github.com/submodule-org/submodule/commit/0d2b698340fb095e996285ed5e34494a42d35c3f))
* bring back the template, remove stage and unstage ([b6b2cf8](https://github.com/submodule-org/submodule/commit/b6b2cf8dde79bc107f2ef05880111654dcda919f))
* bundle ts-toolbelt ([10cb739](https://github.com/submodule-org/submodule/commit/10cb739521575d30039c0098b2eed80beb700f52))
* change API to get and execute (from execute like get) ([d6669b4](https://github.com/submodule-org/submodule/commit/d6669b4bb0078d85456aa343c50e30d0741d561d))
* change for 2.1 ([0f54ba4](https://github.com/submodule-org/submodule/commit/0f54ba4722ee4d2b723a6bfed631b0c39ff9abd7))
* clean up `from` API ([c97e506](https://github.com/submodule-org/submodule/commit/c97e5066b6417601a25c7867d8be83d187a0cf9f))
* completely oversimplified API ([5a4d721](https://github.com/submodule-org/submodule/commit/5a4d7216689d04270cdb05165a6a016290f91ced))
* finalized instrument api ([5807e1e](https://github.com/submodule-org/submodule/commit/5807e1e7ca0888f018cc865de25645b13e0ecdaa))
* made core way simpler ([c128d43](https://github.com/submodule-org/submodule/commit/c128d43a609116be8d8ee8d0d9e609a9803fd5e4))
* magic function can accept variadic arguments ([9432bf5](https://github.com/submodule-org/submodule/commit/9432bf58443ada3fad34631e0e91291700a4e0f3))
* make prepare to take variadic arguments ([7d242ab](https://github.com/submodule-org/submodule/commit/7d242ab73141e279dde513541167151d93cfc8d9))
* moved to bun, added few fancy API ([a73b951](https://github.com/submodule-org/submodule/commit/a73b951caecd0158a9a4687f07a6cfd2c147aec0))
* prepare flow release ([8729869](https://github.com/submodule-org/submodule/commit/87298698754fe843548857f6d6d88e689af1f715))
* prepare for next version ([6ea6394](https://github.com/submodule-org/submodule/commit/6ea63941a4123cf63685b81d8ed0c987f6f6b449))
* prepare to release new instrument api ([854d15b](https://github.com/submodule-org/submodule/commit/854d15b9acf62473e0a8b15ee77b6d154a86a723))
* restructure stage apis ([db70c7d](https://github.com/submodule-org/submodule/commit/db70c7da9e9484c1a168ed1b00be91aeae6e3309))
* simplify api surface ([9e76b20](https://github.com/submodule-org/submodule/commit/9e76b20f50c1370e4bd933cef5254b56ffd22b4d))
* **submodule:** added combineScope API ([316825e](https://github.com/submodule-org/submodule/commit/316825ef8710e2dd05af581aca6be5fc75a5d5f4))


### Bug Fixes

* build ([c262bea](https://github.com/submodule-org/submodule/commit/c262beab6c94e67d36e89cbd9650d0e86631d093))
* build ([33538e9](https://github.com/submodule-org/submodule/commit/33538e9e65ef25c9ffa7695ed2218bd0ba8d6984))
* correct parameter extraction logic ([7d242ab](https://github.com/submodule-org/submodule/commit/7d242ab73141e279dde513541167151d93cfc8d9))
* corrected how arg work ([9f773d7](https://github.com/submodule-org/submodule/commit/9f773d7ca5eadf4c45f16d77af4d926e2903b399))
* corrected run path ([4c3f374](https://github.com/submodule-org/submodule/commit/4c3f374004675aa8385dd07023ef8972119c0d23))
* throw error on initialization failure ([af0462c](https://github.com/submodule-org/submodule/commit/af0462cb90b4e54ae34816fc1f33b021baa97d9f))
* wrong build ([b15cb6a](https://github.com/submodule-org/submodule/commit/b15cb6a226f53be10abb36b9ca3715ff23070f06))


### Miscellaneous Chores

* release 7.1.1 ([d38c9db](https://github.com/submodule-org/submodule/commit/d38c9db88199e082981f87bbca517258ee470ddd))

## [7.1.0](https://github.com/submodule-js/submodule/compare/@submodule/core6.1.0...@submodule/core7.1.0) (2024-10-25)


### Features

* **submodule:** added combineScope API ([316825e](https://github.com/submodule-js/submodule/commit/316825ef8710e2dd05af581aca6be5fc75a5d5f4))

## [6.1.0](https://github.com/submodule-js/submodule/compare/@submodule/core6.0.0...@submodule/core6.1.0) (2024-10-04)


### Features

* added createFactory, an atom to have better authoring ([b0e2018](https://github.com/submodule-js/submodule/commit/b0e20183d473fe4a37af106a32e84847f666ccac))

## [6.0.0](https://github.com/submodule-js/submodule/compare/@submodule/core5.2.0...@submodule/core6.0.0) (2024-08-27)

## [6.0.0-rc.8](https://github.com/submodule-js/submodule/compare/@submodule/core6.0.0-rc.7...@submodule/core6.0.0-rc.8) (2024-06-14)


### Features

* added flat api to turn Executor<Executor<T>> to Executor<T> ([38846d8](https://github.com/submodule-js/submodule/commit/38846d8c539e65513c9a059939ab2159aac9f4b0))

## [6.0.0-rc.7](https://github.com/submodule-js/submodule/compare/@submodule/core6.0.0-rc.6...@submodule/core6.0.0-rc.7) (2024-06-13)

## [6.0.0-rc.6](https://github.com/submodule-js/submodule/compare/@submodule/core6.0.0-rc.5...@submodule/core6.0.0-rc.6) (2024-06-13)


### Features

* added helpers module (migrated from previous meta) ([2bf2847](https://github.com/submodule-js/submodule/commit/2bf28476c38cdb954353b0ed790fd40916bff80f))
* added substituion api ([a1d3df3](https://github.com/submodule-js/submodule/commit/a1d3df3423df317c1091495d79ffde63e2dc8c78))

## [6.0.0-rc.5](https://github.com/submodule-js/submodule/compare/@submodule/core6.0.0-rc.4...@submodule/core6.0.0-rc.5) (2024-06-11)


### Features

* applied EDOE to all API ([0406290](https://github.com/submodule-js/submodule/commit/04062901ad034eca63730face97f91c9567a1065))

## [6.0.0-rc.4](https://github.com/submodule-js/submodule/compare/@submodule/core6.0.0-rc.3...@submodule/core6.0.0-rc.4) (2024-06-10)

## [6.0.0-rc.3](https://github.com/submodule-js/submodule/compare/@submodule/core6.0.0-rc.2...@submodule/core6.0.0-rc.3) (2024-06-10)


### Features

* can use object instead of combine ([e90b503](https://github.com/submodule-js/submodule/commit/e90b503c92c3b14130b80fd3fe54cccb633900e3))

## [6.0.0-rc.2](https://github.com/submodule-js/submodule/compare/@submodule/core6.0.0-rc.1...@submodule/core6.0.0-rc.2) (2024-06-10)

## [6.0.0-rc.1](https://github.com/submodule-js/submodule/compare/@submodule/core6.0.0-rc.0...@submodule/core6.0.0-rc.1) (2024-06-06)

## [6.0.0-rc.0](https://github.com/submodule-js/submodule/compare/@submodule/core5.2.0...@submodule/core6.0.0-rc.0) (2024-06-06)


### Features

* added a lot of new api for metas ([69c4d21](https://github.com/submodule-js/submodule/commit/69c4d21b9642ce79bb50651546cc65bc3a504d2a))
* added scope and its api ([1937024](https://github.com/submodule-js/submodule/commit/1937024b65ed7a77edbbca7fce33f5531360b74b))
* oversimplified submodule api ([b8639d7](https://github.com/submodule-js/submodule/commit/b8639d736cb89b6022565871f0a2fe84a373abd1))

## [5.2.0](https://github.com/submodule-js/submodule/compare/@submodule/core5.1.4...@submodule/core5.2.0) (2024-01-04)

### [5.1.4](https://github.com/submodule-js/submodule/compare/@submodule/core5.1.3...@submodule/core5.1.4) (2024-01-04)


### Features

* added make API ([97e968d](https://github.com/submodule-js/submodule/commit/97e968d682f630804cfefd829897d22e9b59b4ff))

### [5.1.3](https://github.com/submodule-js/submodule/compare/@submodule/core5.1.2...@submodule/core5.1.3) (2023-10-31)

### [5.1.2](https://github.com/submodule-js/submodule/compare/@submodule/core5.1.1...@submodule/core5.1.2) (2023-10-31)

### [5.1.1](https://github.com/submodule-js/submodule/compare/@submodule/core5.1.0...@submodule/core5.1.1) (2023-10-30)

## [5.1.0](https://github.com/submodule-js/submodule/compare/@submodule/core5.0.0...@submodule/core5.1.0) (2023-10-30)


### Features

* added onError and onExecute ([08849c3](https://github.com/submodule-js/submodule/commit/08849c3cb0d9d87347e4ee07d8866417f2bbe7f5))

## [5.0.0](https://github.com/submodule-js/submodule/compare/@submodule/core4.6.2...@submodule/core5.0.0) (2023-10-18)


### ⚠ BREAKING CHANGES

* prepare for next version

### Features

* added booting and shutdown utilities ([766407c](https://github.com/submodule-js/submodule/commit/766407cb7efb7e56b0178a7eba89d06a65161b43))
* added providerOption to staged ([d1376ae](https://github.com/submodule-js/submodule/commit/d1376ae7870fcb07fda5857b392b5726b9f36a1a))
* bring back the template, remove stage and unstage ([b6b2cf8](https://github.com/submodule-js/submodule/commit/b6b2cf8dde79bc107f2ef05880111654dcda919f))
* moved to bun, added few fancy API ([a73b951](https://github.com/submodule-js/submodule/commit/a73b951caecd0158a9a4687f07a6cfd2c147aec0))
* prepare for next version ([6ea6394](https://github.com/submodule-js/submodule/commit/6ea63941a4123cf63685b81d8ed0c987f6f6b449))
* restructure stage apis ([db70c7d](https://github.com/submodule-js/submodule/commit/db70c7da9e9484c1a168ed1b00be91aeae6e3309))


### Bug Fixes

* throw error on initialization failure ([af0462c](https://github.com/submodule-js/submodule/commit/af0462cb90b4e54ae34816fc1f33b021baa97d9f))

## [5.0.0-rc.1](https://github.com/submodule-js/submodule/compare/@submodule/core5.0.0-rc.0...@submodule/core5.0.0-rc.1) (2023-09-17)


### Features

* bring back the template, remove stage and unstage ([b6b2cf8](https://github.com/submodule-js/submodule/commit/b6b2cf8dde79bc107f2ef05880111654dcda919f))

## 5.0.0-rc.0 (2023-09-10)


### ⚠ BREAKING CHANGES

* prepare for next version
* clean up `from` API
* simplify api surface
* completely oversimplified API
* made core way simpler
* prepare for a very big change
* added tsup to bundle, added dev command, added build command
* changed API, completly

### Features

* add more examples ([420f669](https://github.com/submodule-js/submodule/commit/420f669d31ac05c407e33d736e80b7fb3e6c7900))
* add overriding ([676a47b](https://github.com/submodule-js/submodule/commit/676a47b300c0a9ea626b5a459d12ab1d37c46a8f))
* added booting and shutdown utilities ([766407c](https://github.com/submodule-js/submodule/commit/766407cb7efb7e56b0178a7eba89d06a65161b43))
* added commands dir, for extension ([1734917](https://github.com/submodule-js/submodule/commit/1734917acfe0cd47f805f0a211388d76dd5f4478))
* added commands extension without commander ([6318ce0](https://github.com/submodule-js/submodule/commit/6318ce00f470a19ee0477a0a83521b28cf264f45))
* added compose api ([9ca937c](https://github.com/submodule-js/submodule/commit/9ca937c9e35c953dc7ea1f17e7bde4e355861a18))
* added createCaller API to call from outside ([6ccb4c0](https://github.com/submodule-js/submodule/commit/6ccb4c04c3ce6a089051f115029a234caeebdcce))
* added createClient, access instance out of context ([07f3ca3](https://github.com/submodule-js/submodule/commit/07f3ca352b3f5bc515f9b50e443d469470ca4137))
* added deno checking ([5174657](https://github.com/submodule-js/submodule/commit/5174657fcd8dd24fb119eb74e8be941769262aed))
* added few more APIs, SPIs ([caa6f84](https://github.com/submodule-js/submodule/commit/caa6f8497ebd71d0176a807de0248e21598dc98c))
* added more defaults ([59cf533](https://github.com/submodule-js/submodule/commit/59cf533d876e9d532dd5cf200ca915a84973bfb2))
* added more generate-friendly functions ([591f2a6](https://github.com/submodule-js/submodule/commit/591f2a678d57c4241b9a974d159f77dc7bcf8893))
* added prepare function ([938b719](https://github.com/submodule-js/submodule/commit/938b719ea08632ef4fa0718fd9cc15cf4b8a4b6d))
* added prepare to from result ([59a5af9](https://github.com/submodule-js/submodule/commit/59a5af9b85b939d41b6099de5bbb464ac5b6e457))
* added prepareExecutable to support serveless environment ([075e05d](https://github.com/submodule-js/submodule/commit/075e05d8203caf0b7473906de15084276f2e90fe))
* added ProvideOption to all operations ([ea6e1cb](https://github.com/submodule-js/submodule/commit/ea6e1cbed692a67e8c506d553aa55fa0df72291e))
* added providerOption to staged ([d1376ae](https://github.com/submodule-js/submodule/commit/d1376ae7870fcb07fda5857b392b5726b9f36a1a))
* added runing mode, added hijack to test dependencies ([937c074](https://github.com/submodule-js/submodule/commit/937c074399b7c4d28d4fc574f62d3cb663e9c472))
* added submodule builder ([c2933c4](https://github.com/submodule-js/submodule/commit/c2933c4df218171f33eb83058cfb612a43adcd61))
* added submoduleArg to createCommands to create generate method ([c467ac2](https://github.com/submodule-js/submodule/commit/c467ac265ea872dbd29486639499a70f4131cfae))
* added tsup to bundle, added dev command, added build command ([81b3c65](https://github.com/submodule-js/submodule/commit/81b3c65023cb8be371b778368e94666fc4762dba))
* adding sensible defaults ([9414e11](https://github.com/submodule-js/submodule/commit/9414e11255e172469372d37b2ca1f636f6786319))
* api update, executor can also be used as initArgs ([0d2b698](https://github.com/submodule-js/submodule/commit/0d2b698340fb095e996285ed5e34494a42d35c3f))
* auto carry shape of routeModule to the router, less code for createRoute ([5ee2cb8](https://github.com/submodule-js/submodule/commit/5ee2cb8e055d96e7248edcef737338fc0a6828da))
* bundle ts-toolbelt ([10cb739](https://github.com/submodule-js/submodule/commit/10cb739521575d30039c0098b2eed80beb700f52))
* by default, subcommand will just call the default function of the corresponding route ([10fd127](https://github.com/submodule-js/submodule/commit/10fd12754ba578d2207432b611958210db1be0d2))
* change API to get and execute (from execute like get) ([d6669b4](https://github.com/submodule-js/submodule/commit/d6669b4bb0078d85456aa343c50e30d0741d561d))
* change for 2.1 ([0f54ba4](https://github.com/submodule-js/submodule/commit/0f54ba4722ee4d2b723a6bfed631b0c39ff9abd7))
* changed API, completly ([f99388c](https://github.com/submodule-js/submodule/commit/f99388c85b58f699a7500d7e7ea9cdf6a9c8b5f1))
* clean up `from` API ([c97e506](https://github.com/submodule-js/submodule/commit/c97e5066b6417601a25c7867d8be83d187a0cf9f))
* completely oversimplified API ([5a4d721](https://github.com/submodule-js/submodule/commit/5a4d7216689d04270cdb05165a6a016290f91ced))
* finalized instrument api ([5807e1e](https://github.com/submodule-js/submodule/commit/5807e1e7ca0888f018cc865de25645b13e0ecdaa))
* launch ([b3261b4](https://github.com/submodule-js/submodule/commit/b3261b4343dfe7738ac95c8fe729b43c521371bf))
* made aop ([2e29d68](https://github.com/submodule-js/submodule/commit/2e29d68b39acde1319c5fbc68f94bed3dd700631))
* made cli available as submodule ([b73fda7](https://github.com/submodule-js/submodule/commit/b73fda75e851a9566d0173391d4f32416524af86))
* made core way simpler ([c128d43](https://github.com/submodule-js/submodule/commit/c128d43a609116be8d8ee8d0d9e609a9803fd5e4))
* magic function can accept variadic arguments ([9432bf5](https://github.com/submodule-js/submodule/commit/9432bf58443ada3fad34631e0e91291700a4e0f3))
* make prepare to take variadic arguments ([7d242ab](https://github.com/submodule-js/submodule/commit/7d242ab73141e279dde513541167151d93cfc8d9))
* moved to bun, added few fancy API ([a73b951](https://github.com/submodule-js/submodule/commit/a73b951caecd0158a9a4687f07a6cfd2c147aec0))
* prepare for a very big change ([e1c837f](https://github.com/submodule-js/submodule/commit/e1c837f7038246ea00a9afad50d772127f9bc086))
* prepare for next version ([6ea6394](https://github.com/submodule-js/submodule/commit/6ea63941a4123cf63685b81d8ed0c987f6f6b449))
* prepare to release new instrument api ([854d15b](https://github.com/submodule-js/submodule/commit/854d15b9acf62473e0a8b15ee77b6d154a86a723))
* restraint api version of opentelemetry ([9981a02](https://github.com/submodule-js/submodule/commit/9981a02c9ab33787369b60d022e7896f96b163e1))
* restructure stage apis ([db70c7d](https://github.com/submodule-js/submodule/commit/db70c7da9e9484c1a168ed1b00be91aeae6e3309))
* simplify api surface ([9e76b20](https://github.com/submodule-js/submodule/commit/9e76b20f50c1370e4bd933cef5254b56ffd22b4d))
* update type API ([87dbf92](https://github.com/submodule-js/submodule/commit/87dbf92f5b0c97567da0374211b71bddab8f1ac5))
* upgrade types API ([c33e2e2](https://github.com/submodule-js/submodule/commit/c33e2e266aca8f65c1e93d1f4bf1f87413d322fc))


### Bug Fixes

* cleanup dependencies ([6e0cccd](https://github.com/submodule-js/submodule/commit/6e0cccd134eccc5fe3448c680abec773eda736ba))
* reduce the use of this ([4874ce3](https://github.com/submodule-js/submodule/commit/4874ce3504af8356f11fada4df8eb7a0870ba90f))
* wrong build ([b15cb6a](https://github.com/submodule-js/submodule/commit/b15cb6a226f53be10abb36b9ca3715ff23070f06))

### [4.6.2](https://github.com/submodule-js/submodule/compare/@submodule/core4.6.1...@submodule/core4.6.2) (2023-06-21)


### Features

* make prepare to take variadic arguments ([7d242ab](https://github.com/submodule-js/submodule/commit/7d242ab73141e279dde513541167151d93cfc8d9))

### [4.6.1](https://github.com/submodule-js/submodule/compare/@submodule/core4.6.0...@submodule/core4.6.1) (2023-06-19)


### Features

* add overriding ([676a47b](https://github.com/submodule-js/submodule/commit/676a47b300c0a9ea626b5a459d12ab1d37c46a8f))
* added ProvideOption to all operations ([ea6e1cb](https://github.com/submodule-js/submodule/commit/ea6e1cbed692a67e8c506d553aa55fa0df72291e))

## [4.6.0](https://github.com/submodule-js/submodule/compare/@submodule/core4.4.2...@submodule/core4.6.0) (2023-06-16)


### ⚠ BREAKING CHANGES

* clean up `from` API

### Features

* clean up `from` API ([c97e506](https://github.com/submodule-js/submodule/commit/c97e5066b6417601a25c7867d8be83d187a0cf9f))
* finalized instrument api ([5807e1e](https://github.com/submodule-js/submodule/commit/5807e1e7ca0888f018cc865de25645b13e0ecdaa))
* prepare to release new instrument api ([854d15b](https://github.com/submodule-js/submodule/commit/854d15b9acf62473e0a8b15ee77b6d154a86a723))

## [4.5.0](https://github.com/submodule-js/submodule/compare/@submodule/core4.4.2...@submodule/core4.5.0) (2023-06-13)


### Features

* finalized instrument api ([5807e1e](https://github.com/submodule-js/submodule/commit/5807e1e7ca0888f018cc865de25645b13e0ecdaa))
* prepare to release new instrument api ([854d15b](https://github.com/submodule-js/submodule/commit/854d15b9acf62473e0a8b15ee77b6d154a86a723))

### [4.4.2](https://github.com/submodule-js/submodule/compare/@submodule/core4.4.1...@submodule/core4.4.2) (2023-06-09)

### [4.4.1](https://github.com/submodule-js/submodule/compare/@submodule/core4.4.0...@submodule/core4.4.1) (2023-06-09)

## [4.4.0](https://github.com/submodule-js/submodule/compare/@submodule/core4.3.0...@submodule/core4.4.0) (2023-06-06)


### Features

* magic function can accept variadic arguments ([9432bf5](https://github.com/submodule-js/submodule/commit/9432bf58443ada3fad34631e0e91291700a4e0f3))

## [4.3.0](https://github.com/submodule-js/submodule/compare/@submodule/core4.2.1...@submodule/core4.3.0) (2023-06-06)


### Features

* added prepare function ([938b719](https://github.com/submodule-js/submodule/commit/938b719ea08632ef4fa0718fd9cc15cf4b8a4b6d))
* added prepare to from result ([59a5af9](https://github.com/submodule-js/submodule/commit/59a5af9b85b939d41b6099de5bbb464ac5b6e457))

### [4.2.1](https://github.com/submodule-js/submodule/compare/@submodule/core4.2.0...@submodule/core4.2.1) (2023-06-05)


### Bug Fixes

* wrong build ([b15cb6a](https://github.com/submodule-js/submodule/commit/b15cb6a226f53be10abb36b9ca3715ff23070f06))

## [4.2.0](https://github.com/submodule-js/submodule/compare/@submodule/core4.1.0...@submodule/core4.2.0) (2023-06-05)


### Features

* change API to get and execute (from execute like get) ([d6669b4](https://github.com/submodule-js/submodule/commit/d6669b4bb0078d85456aa343c50e30d0741d561d))

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
