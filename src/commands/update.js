// Yargs module:
// https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module

const chalk = require('chalk');
const ProgressBar = require('progress');

const getWorkspace = require('../workspace');
const { log, error, success, warning, branding } = require('./lib/log');
const { errorFactory } = require('./lib/has-errors');
const listify = require('./lib/listify');
const { MAJOR, MINOR, PATCH, PREMAJOR, PREPATCH, PREMINOR, PRERELEASE } = require('./lib/consts');

exports.command = 'update';

exports.describe = 'Update your workspace dependencies';

exports.builder = function handler(yargs) {
    yargs
        .option('internal', {
            type: 'boolean',
            description: 'Update only those dependencies matching the internalScopes config',
            default: false,
        })
        .option('external', {
            type: 'boolean',
            description: 'Update all those dependencies that dont match the internalScopes config',
            default: false,
        })
        .option('patch', {
            type: 'boolean',
            description: 'Update those matching dependencies which have had new patches released',
            default: true,
        })
        .option('minor', {
            type: 'boolean',
            description: 'Update those matching dependencies which have had new minor releases',
            default: true,
        })
        .option('major', {
            type: 'boolean',
            description: 'Update those matching dependencies which have had new major releases',
            default: false,
        })
        .option('dependencies', {
            alias: ['deps'],
            type: 'boolean',
            description: 'Update dependencies within the package.json dependencies object',
            default: true,
        })
        .option('devDependencies', {
            alias: ['dev', 'devDeps', 'dev-deps', 'dev-dependencies'],
            type: 'boolean',
            description: 'Update dependencies within the package.json devDependencies object',
            default: true,
        })
        .option('peerDependencies', {
            alias: ['peer', 'peerDeps', 'peer-deps', 'peer-dependencies'],
            type: 'boolean',
            description: 'Update dependencies within the package.json peerDependencies object',
            default: true,
        })
        .option('canary', {
            type: 'string',
            description: 'A partial match is used to update all (valid) deps to a given canary version',
            default: '',
        })
        .option('pattern', {
            type: 'string',
            description: 'A regex used to target specific packages to update',
            default: '',
        })
        .option('group', {
            type: 'string',
            description: 'An alias for a preconfigured regex. See `Groups`',
            default: '',
        })
        .option('internalScopes', {
            alias: ['internal-scopes'],
            type: 'array',
            description: 'A list of scopes to be grouped as internal',
            default: [],
        })
        .option('ignoreScopes', {
            alias: ['ignore-scopes'],
            type: 'array',
            description: 'A list of scopes to be ignored i.e. never updated',
            default: [],
        })
        .example(
            '$0 update --no-patch --no-minor --major',
            'Investigate which dependencies have had major releases, without being distracted by patch + minor releases',
        )
        .example('$0 update --major --fix "babel|postcss"', 'Update all your babel and postcss dependencies')
        .example('$0 update --group=build', 'Update all your predefined "build" dependencies')
        .middleware((argv) => {
            const newArgs = { ...argv };
            const [, impliedPattern] = argv._;

            // impossible for a dep to be internal and external, they probably didn't mean to specify both!
            if (argv.internal && argv.external) {
                newArgs.internal = false;
                newArgs.external = false;
            }

            // use the final arg as a pattern
            if (!argv.pattern && impliedPattern) {
                newArgs.pattern = impliedPattern;
            }
            return newArgs;
        });
};

const matchesPattern = (dependency, { options, patternRegEx, groupRegEx }) => {
    const { name, scope } = dependency;
    const internalMatch = options.internalScopes.includes(scope);
    const ignoredMatch = options.ignoreScopes.includes(scope);
    const externalMatch = !options.internalScopes.includes(scope) && !ignoredMatch;
    const isValidInternal = (options.internal && internalMatch) || !options.internal;
    const isValidExternal = (options.external && externalMatch) || !options.external;
    const isValidPattern = (patternRegEx && patternRegEx.test(name)) || !patternRegEx;
    const isValidGroup = (groupRegEx && groupRegEx.test(name)) || !groupRegEx;
    const check = isValidInternal && isValidExternal && isValidPattern && isValidGroup;
    return check;
};

exports.handler = async function handler(argv) {
    const workspace = await getWorkspace({ folder: argv.folder });
    const { saveError, logErrors } = errorFactory(argv);
    const semVer = [argv.patch && 'patch', argv.minor && 'minor', argv.major && 'major'].filter(Boolean).join(', ');
    const types = [argv.deps && 'dependencies', argv.dev && 'devDependencies', argv.peer && 'peerDependencies']
        .filter(Boolean)
        .join(', ');

    const groups = [
        !argv.internal && !argv.external && !argv.group && 'internal, external',
        argv.internal && 'internal',
        argv.external && 'external',
        argv.group && argv.groups[argv.group] && argv.group,
    ]
        .filter(Boolean)
        .join(', ');

    // filter out deps based on args
    const patternMatcher = argv.pattern || '';
    const groupMatcher = (argv.groups && argv.groups[argv.group]) || '';
    const patternRegEx = patternMatcher && new RegExp(patternMatcher, 'i');
    const groupRegEx = groupMatcher && new RegExp(groupMatcher, 'i');
    const filteredDeps = workspace
        .getDependencies()
        .filter((dependency) => matchesPattern(dependency, { patternRegEx, groupRegEx, options: argv }))
        .sort();
    const filteredDepCount = filteredDeps.length;

    log(`|   ------------`);
    log(`|`);
    log(`|   ${chalk.bold('Will fix?:')} ${argv.fix}`);
    log(`|   ${chalk.bold('Will fail?:')} ${argv.fail}`);
    log(`|   ${chalk.bold('SemVer Filter:')} ${semVer}`);
    log(`|   ${chalk.bold('Types:')} ${types}`);
    log(`|   ${chalk.bold('Groups:')} ${groups}`);
    log(`|   ${chalk.bold('Pattern:')} ${argv.pattern || 'none'}`);
    log(`|`);
    log(`|   ------------`);
    log(`|`);
    log(`|   Found ${workspace.getPackageCount()} workspace package.json files`);
    log(`|   Found ${workspace.getDependencyCount()} unique dependencies`);
    if (argv.pattern || argv.group) {
        log(`|   Found ${filteredDepCount} dependencies (within groups + pattern)`);
    }
    log(`|   `);
    log(`|   ------------\n`);
    log(``);

    const depsBar = new ProgressBar(`${branding} Checking dependency versions (:total) [:bar] :percent`, {
        total: filteredDepCount,
    });

    await Promise.all(
        filteredDeps.map(async (dependency) => {
            const { semVerChange, latestVersion } = await dependency.getLatest({ canary: argv.canary });

            depsBar.tick(); // tick after the getLatest call

            // if there is a no new version, or change, exit stage left.
            if (!latestVersion || !semVerChange) {
                // you're trying to update to canary then exit without error
                if (!argv.canary && !dependency.workspacePackage && !latestVersion) {
                    error(`Could not find the latest version of ${dependency.name}, has it been published?`);
                }
                return false;
            }

            // save update log so we can inform user of other updates that weren't filtered out by semver restrictions
            saveError({
                semVerChange,
                dependency: dependency.name,
                version: dependency.minVersion,
                newVersion: latestVersion,
            });

            // save the update if the changes fit within the given restrictions
            if (
                (semVerChange === PRERELEASE && argv.patch) ||
                (semVerChange === MAJOR && argv.major) ||
                (semVerChange === MINOR && argv.minor) ||
                (semVerChange === PATCH && argv.patch) ||
                ([PREMINOR, PREPATCH, PREMAJOR].includes(semVerChange) && argv.canary)
            ) {
                return dependency.updateVersion(latestVersion);
            }
            return false;
        }, {}),
    );
    depsBar.terminate();

    // commit changes
    let packagesWithChanges = 0;
    let depsChanges = 0;
    await workspace.getChanges({ commit: argv.fix }, (change) => {
        if (change.type === 'package') packagesWithChanges += 1;
        if (change.type === 'dependency') {
            depsChanges += 1;
            // no need to output 'package' changes separately
            saveError(change);
        }
    });

    // Log results
    const inFilter = [argv.major && 'major', argv.minor && 'minor', argv.patch && 'patch'].filter(Boolean);
    const hasErrors = logErrors();
    if (argv.fix) {
        success(`Updated ${depsChanges} dependencies within ${packagesWithChanges} files`);
    } else if (packagesWithChanges === 0) {
        success(`Found nothing to update`);
    } else if (argv.fail) {
        error(`Found ${depsChanges} ${listify(inFilter)} dependency updates`);
    } else {
        warning(`Found ${depsChanges} ${listify(inFilter)} dependency updates`);
    }

    if (argv.fail && hasErrors) {
        process.exit(1);
    }
};
