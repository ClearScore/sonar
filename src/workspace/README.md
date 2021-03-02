# Workspace

 > Node Utils for you monorepo. Easily write custom tools to manipulate your workspace packages and dependencies.

## Approach

Using `Workspace` you can easily write a tool to inspect your packages and dependencies.

A workspace contains `Packages` and `Dependencies` which allows you to manipulate both in one place, and update everywhere.

### 1. Create the Workspace

```js
const createWorkspace = require('./workspace');

const workspace = await createWorkspace({ folder: '.' });
```

### 2. Make Changes

```js
const pkg = workspace.getPackage({ name: 'my-package' });
pkg.updateVersion('2.0.0');
pkg.addDependency({ name: 'ava', type: 'dependencies' });

const dependency = workspace.getDependency({ name: 'my-dep' });
dependency.updateVersion('1.0.0');
```

### 3. Commit Changes

```js
workspace.getChanges({ commit: true }, (change) => {
    console.log(change)
});
```

## API

## `Workspace`

 - getPackages():
    - returns `[Package]`
    - All packages within the workspace
 - getPackageCount(): 
    - returns `Int`
    - The number of packages within the workspace
 - getPackage({ name }):
    - returns `Package`
    - Get a specific package
 - getDependencies(): 
    - returns `[Dependency]`
    - All dependencies within a package
 - getDependencyCount():
    - returns `Int`
    - The number of dependencies within the workspace
 - getDependency({ name }):
    - returns `Dependency`
    - Get a specific dependency
 - _async_ getChanges(options, callback)
    - `commit`:
        - default `false`
        - Commit any changes to disk
    - `callback`
        - function called with change information. useful for logging output
    - Used to return all the changes made to the workspace, and optionally write these to disk.

## `Package`

 - name:
    - `String`
 - isDirty:
    - `Boolean`
    - if the package or dependency has changed
 - updateVersion(version, { dep: Boolean, dev: Boolean, peer: Boolean })
     - Set _all_ usages of this package to the given version
 - bump(`major|minor|patch`)
     - use semver to update the version
     - Set _all_ usages of this package to the given version
- _async_ getLatest():
    - returns `{ semVerChange: String, latestVersion: String }`
    - Fetch the latest version
- _async_ addDependency({ pkg, name, version, type }):
    - returns `Dependency`
    - Add a dependency to a package
    - if no version is supplied, it will try to fetch the latest
    - this will pack the dependency and package as dirty
- _async_ removeDependency({ pkg, name, type })
    - remove a dependency from a package
    - this will pack the dependency and package as dirty

## `Dependency`

 - name: 
    - `String`
 - isDirty:
    - `Boolean`
    - if the version has changed, or the dependency has been removed from a parent packge
 - minVersion
    - `String`
    - the lowest version that has been registered
 - parentPackages
    - `[Package]`
    - Each package that is using this dependency
 - getVersions(): 
    - returns `[{ version: String, count: Int, packages: [Package] }]`
    - All versions of this dependency within the workspace (along with usage count, and packages where is it used)
 - updateVersion(version, { dep: Boolean, dev: Boolean, peer: Boolean })
    - Set _all_ usages of this dependency to the given version
    - This will also mark all parent packages as 'dirty'
 - _async_ getLatest({ canary }):
    - returns `{ semVerChange: String, latestVersion: String }`
    - Fetch the latest version 
