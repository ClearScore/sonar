// Yargs module:
// https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module
const chalk = require('chalk');
const inquirer = require('inquirer');
const jsonfile = require('jsonfile');
const pMap = require('p-map');
const ProgressBar = require('progress');
const semver = require('semver');

const getFiles = require('./lib/get-package-jsons');
const updateVersions = require('./lib/set-dependency-versions');
const { getLatestFactory } = require('./lib/get-latest');
const { log, success, error } = require('./lib/log');
const { errorFactory } = require('./lib/has-errors');

const getLatest = getLatestFactory();

exports.command = 'sync';

exports.describe = 'Sync your local workspace';

exports.builder = function handler(yargs) {
    yargs
        .option('remote', {
            // it's rare this is needed, but useful for publish failures
            type: 'boolean',
            description: 'Ensure usages of workspace packages match the current version',
            default: false,
        })
        .option('bump', {
            type: 'boolean',
            description:
                'Update the version number of workspace packages by a specifies amount (major, minor or patch)',
            default: false,
        })
        .example('$0 sync', 'Update all the usages of your workspace packages to their current versions')
        .example('$0 sync --bump', 'Update all your workspace package version numbers')
        .example(
            '$0 sync --remote',
            'Sync all your workspace package version numbers with what has already been released',
        );
};

exports.handler = async function handler(argv) {
    const { saveError, logErrors } = errorFactory({ major: true, minor: true, patch: true });
    let answersPromise = Promise.resolve();
    const filesPromise = getFiles(argv);
    if (argv.bump) {
        answersPromise = inquirer.prompt([
            {
                type: 'list',
                name: 'version',
                message: 'Which type of version bump?',
                choices: ['Major', 'Minor', 'Patch'],
                filter(val) {
                    return val.toLowerCase();
                },
            },
            {
                type: 'confirm',
                name: 'sure',
                message: 'Are you sure?',
                default: false,
            },
        ]);
    }
    const [answers = {}, files] = await Promise.all([answersPromise, filesPromise]);
    const bumpType = answers.sure ? answers.version : false;
    const localPackages = {};

    log(`|`);
    log(`|   ${chalk.bold('Will fix?:')} ${argv.fix}`);
    log(`|   ${chalk.bold('Will fail?:')} ${argv.fail}`);
    log(`|   ${chalk.bold('Sync with remote?:')} ${argv.remote}`);
    log(`|   ${chalk.bold('Bump:')} ${argv.bump ? bumpType : false}`);
    log(`|\n`);
    log(`Found ${files.length} workspace package.json files`);

    // first update local package versions
    const localBar = new ProgressBar('Checking workspace package versions [:bar] :percent', {
        total: files.length,
    });
    let localChanges = 0;
    const mapper = async ({ file, path }) => {
        // only get Latest package version if 'remote' is flagged
        const latestVersion = argv.remote ? await getLatest(file.name) : file.version;
        localPackages[file.name] = { ...file, version: latestVersion };

        // then, update package to the desired sem-version is 'bump' is flagged
        if (bumpType) {
            localPackages[file.name] = { ...file, version: semver.inc(localPackages[file.name].version, bumpType) };
        }

        // then if the version has changed, log' the change
        if (localPackages[file.name].version && localPackages[file.name].version !== file.version) {
            const coercedVersion = semver.coerce(file.version);
            const semVerChange = semver.diff(coercedVersion, localPackages[file.name].version);
            saveError({
                semVerChange,
                dependency: file.name,
                version: file.version,
                newVersion: localPackages[file.name].version,
            });
            localChanges += 1;

            // then save the new file, if 'fix' was flagged
            if ((argv.bump || argv.fix) && localPackages[file.name].version) {
                await jsonfile.writeFile(path, localPackages[file.name], { spaces: 2 });
            }
        }
        localBar.tick(1, { name: file.name });
        return { file: localPackages[file.name], path };
    };
    const updatedFiles = await pMap(files, mapper, { concurrency: argv.concurrency });
    if (argv.bump || argv.fix) {
        log(`Updated ${localChanges} workspace package versions`);
    } else {
        log(`Found ${localChanges} workspace package versions to update`);
    }
    localBar.terminate();

    // second update usages of package (dep, devDeps, peerDeps)
    let depsChanges = 0;
    const depsBar = new ProgressBar('Checking dependency usage of workspace packages [:bar] :percent', {
        total: files.length,
    });

    const depsMapper = async ({ file, path }) => {
        const { change, newContent, changes } = updateVersions(file, localPackages, {
            dependencies: true,
            peerDependencies: true,
            devDependencies: true,
        });
        if (change) {
            depsChanges += 1;
            changes.forEach((args) => {
                saveError(args);
            });
        }
        // then save the new file, if 'fix' was flagged
        if (change && (argv.bump || argv.fix) && newContent.version) {
            await jsonfile.writeFile(path, newContent, { spaces: 2 });
        }
        depsBar.tick(1, { name: file.name });
    };
    await pMap(updatedFiles, depsMapper, { concurrency: argv.concurrency });

    if (argv.bump || argv.fix) {
        success(`Updated ${depsChanges} files with out of sync dependencies`);
    } else if (depsChanges === 0) {
        success(`Found no out of sync dependencies`);
    } else {
        error(`Found ${depsChanges} files with out of sync dependencies`);
    }
    depsBar.terminate();

    const hasErrors = logErrors();
    if (argv.fail && hasErrors) {
        process.exit(1);
    }
};
