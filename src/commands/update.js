// Yargs module:
// https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module

const chalk = require('chalk');
const jsonfile = require('jsonfile');
const pMap = require('p-map');
const semver = require('semver');
const ProgressBar = require('progress');

const getFiles = require('./lib/get-package-jsons');
const updateVersions = require('./lib/set-dependency-versions');
const { getLatestFactory } = require('./lib/get-latest');
const { log, error } = require('./lib/log');
const { errorFactory } = require('./lib/has-errors');
const { MAJOR, MINOR, PATCH, PREMAJOR, PREPATCH, PREMINOR, PRERELEASE } = require('./lib/consts');

const getLatest = getLatestFactory();

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

exports.handler = async function handler(argv) {
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
    log(`|`);
    log(`|   ${chalk.bold('Will fix?:')} ${argv.fix}`);
    log(`|   ${chalk.bold('SemVer:')} ${semVer}`);
    log(`|   ${chalk.bold('Types:')} ${types}`);
    log(`|   ${chalk.bold('Groups:')} ${groups}`);
    log(`|   ${chalk.bold('Pattern:')} ${argv.pattern}`);
    log(`|\n`);
    const files = await getFiles(argv);
    log(`Found ${files.length} workspace package.json files`);

    const localPackages = {};
    const uniqueDeps = files.reduce((prev, { file }) => {
        localPackages[file.name] = file.version;
        const newDeps = {
            ...prev,
            ...(argv.dependencies ? file.dependencies : {}),
            ...(argv.devDependencies ? file.devDependencies : {}),
            ...(argv.peerDependencies ? file.peerDependencies : {}),
        };
        Object.keys(newDeps).forEach((dep) => {
            if (prev[dep] && semver.lt(semver.minVersion(prev[dep]), semver.minVersion(newDeps[dep]))) {
                newDeps[dep] = prev[dep];
            }
        });
        return newDeps;
    }, {});
    const uniqueDepCount = Object.keys(uniqueDeps).length;
    log(`Found ${uniqueDepCount} unique dependencies\n`);

    const depsBar = new ProgressBar('Checking dependency versions (:total) [:bar] :percent', { total: uniqueDepCount });
    const patternMatcher = argv.pattern || '';
    const groupMatcher = (argv.groups && argv.groups[argv.group]) || '';
    const patternRegEx = new RegExp(patternMatcher, 'i');
    const groupRegEx = new RegExp(groupMatcher, 'i');

    const versionedPackagesArr = await Promise.all(
        Object.keys(uniqueDeps)
            .sort()
            .map(async (dep) => {
                depsBar.tick(1);
                const depScope = dep.split('/')[0];
                const internalMatch = argv.internalScopes.includes(depScope);
                const ignoredMatch = argv.ignoreScopes.includes(depScope);
                const externalMatch = !argv.internalScopes.includes(depScope) && !ignoredMatch;
                const isValidInternal = (argv.internal && internalMatch) || !argv.internal;
                const isValidExternal = (argv.external && externalMatch) || !argv.external;
                const isValidPattern = (patternMatcher && patternRegEx.test(dep)) || !patternMatcher;
                const isValidGroup = (groupMatcher && groupRegEx.test(dep)) || !groupMatcher;
                const fetchLatest = isValidInternal && isValidExternal && isValidPattern && isValidGroup;
                if (!fetchLatest) return false;

                const latestVersion = localPackages[dep] || (await getLatest(dep, argv));
                if (!latestVersion && argv.canary) {
                    return false;
                }
                if (!latestVersion) {
                    error(`Could not find the latest version of ${dep}, has it been published?`);
                    return false;
                }
                const isSatisfied = latestVersion && semver.satisfies(latestVersion, uniqueDeps[dep]);
                if (isSatisfied) return false;

                const coercedVersion = semver.coerce(uniqueDeps[dep]);
                const semVerChange = semver.diff(coercedVersion, latestVersion);
                saveError({ semVerChange, dependency: dep, version: uniqueDeps[dep], newVersion: latestVersion });

                if (
                    (semVerChange === PRERELEASE && argv.patch) ||
                    (semVerChange === MAJOR && argv.major) ||
                    (semVerChange === MINOR && argv.minor) ||
                    (semVerChange === PATCH && argv.patch) ||
                    ([PREMINOR, PREPATCH, PREMAJOR].includes(semVerChange) && argv.canary)
                ) {
                    return { name: dep, version: latestVersion };
                }

                return false;
            }, {}),
    );
    depsBar.terminate();

    const versionedPackages = versionedPackagesArr
        .filter(Boolean)
        .reduce((prev, { name, version }) => ({ ...prev, [name]: { name, version } }), {});

    const depsToUpdate = Object.keys(versionedPackages).length;
    log(`Found ${depsToUpdate} dependencies to update`);

    if (argv.fix) {
        let fileChanges = 0;
        const depsMapper = async ({ file, path }) => {
            const { change, newContent } = updateVersions(file, versionedPackages, argv);
            if (!change) return;
            fileChanges += 1;
            if (newContent.version) {
                await jsonfile.writeFile(path, newContent, { spaces: 2 });
            }
        };
        await pMap(files, depsMapper, { concurrency: argv.concurrency });

        log(`Updated ${depsToUpdate} dependencies within ${fileChanges} files`);
    }

    const hasErrors = logErrors();
    if (argv.fail && hasErrors) {
        process.exit(1);
    }
};
