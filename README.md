# Sonar

> Fine tune all your mono-repo dependency updates.

A tool to search all package.json files in a given folder,
find their dependencies and update the package.json with the latest version of those dependencies.

Fine tune the updates you wish to make. For example, keep life simple by updating only those with new 'patches' (or bug fixes).

e.g. `sonar --patch`.

## Why?

Working to keep mono-repo dependencies up-to-date and in sync can take time.
Sonar makes our lives easier by automating these sem-ver updates.

### Our workflow

We use Sonar daily to keep all our internally created scopes up to date.

```sh
sonar --no-external
```

Then every month we use Sonar to update external updates which dont have breaking changes.

```sh
sonar --no-internal
```

Monthly, we also gauge how many external dependencies have had major releases. This helps us plan how much time we need to spend on this new tech-debt and when we should make the updates.

```sh
sonar --no-internal --major --dry-run
```

## Config

> zero config needed

Out of the box, Sonar will update dependencies (inc. peerDependencies and devDependencies) with new patch and minor releases.

Alternatively, using a `sonar.config.js`, or the [CLI options](#cli-options), you can set your own defaults.

## CLI options

> sonar [command]

```sh
Commands:
  sonar ignoreScopes      This scopes will be ignored by the updater
  sonar internalScopes    Flag scopes as internal
  sonar internal          Update scopes flagged as internal
  sonar external          Update scopes not marked as internal
  sonar patch             Update to the latest patch semantic version
  sonar minor             Update to the latest minor semantic version
  sonar major             Update to the latest major semantic version
  sonar dependencies      Update dependencies
  sonar devDependencies   Update devDependencies
  sonar peerDependencies  Update peerDependencies
  sonar fail              Terminate the process with an error if there are
                                out of date packages
  sonar dryRun            Run the process, without actually updating any
                                files
  sonar pattern           Only check packages matching the given pattern
  sonar folder            Where to look for package.json files
  sonar concurrency       Change how many promises to run concurrently

Options:
  --version                   Show version number                      [boolean]
  -h, --help                  Show help                                [boolean]
  --dryRun, --dry-run                                 [boolean] [default: false]
  --fail                                              [boolean] [default: false]
  --major                                             [boolean] [default: false]
  --minor                                              [boolean] [default: true]
  --patch                                              [boolean] [default: true]
  --folder                                                        [default: "."]
  --concurrency                                                    [default: 10]
  -x, --ignoreScopes                                       [array] [default: []]
  -s, --internalScopes                                     [array] [default: []]
  -i, --internal                                       [boolean] [default: true]
  -e, --external                                       [boolean] [default: true]
  --deps, --dependencies                               [boolean] [default: true]
  --dev, --devDependencies                             [boolean] [default: true]
  --peer, --peerDependencies                           [boolean] [default: true]

Examples:
  sonar --major --no-internal babel  Update all external dependencies with
                                           a name containing babel
  sonar "babel|postcss|eslint|jest"  Update minor versions of babel,
                                           postcss, eslint and jest dependencies

```

## What will be updated?

When version numbers are pinned (e.g. '1.2.3'), and a new patch is available, the package.json will be rewritten to match the new version (e.g. '1.2.4').

Using version ranges like caret (^), tilde (~) or wildcards may mean there is nothing to update.

e.g.

- `1.0.x` or `~1.0.4` will not be updated if a new patch is released, but will be updated if a new minor release becomes available (`1.1.x` or `~1.1.0`)
- `1.x` or `^1.0.4` will not be updated if a new minor is released, but will be updated if a new major release becomes available (`2.x` or `^2.0.0`)

For more information go here: https://docs.npmjs.com/about-semantic-versioning

## Example

**Config**

[.sonarrc.js example](.sonarrc.example.js)

**Output**

![image](https://user-images.githubusercontent.com/1727939/75665226-bff54600-5c6b-11ea-8ee1-69885ea0c11d.png)
