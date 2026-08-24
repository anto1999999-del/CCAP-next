/**
 * Stands in for the `server-only` package when tests run.
 *
 * That package exists to make a build fail if server code is imported into a
 * client bundle, and it does that by refusing to load outside a server
 * environment, which includes the test runner. The guard is worth keeping on
 * the modules themselves, so it is replaced here rather than removed there.
 */
export {};
