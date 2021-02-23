// Yargs module:
// https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module

const chalk = require('chalk');
const jsonfile = require('jsonfile');
const pMap = require('p-map');
const ProgressBar = require('progress');
const inquirer = require('inquirer');

const getFiles = require('./lib/get-package-jsons');
const { log, error } = require('./lib/log');

exports.command = 'validate';

exports.describe = 'validate your workspace dependency versions';

exports.builder = function handler(yargs) {
    yargs.example('$0 validate', 'ensure you do not have any mixed version numbers of the same dependency');
};

const setNewContent = ({ dep, version, file }) => {
    const newContent = {
        ...file,
        ...(file.dependencies &&
            file.dependencies[dep] && {
                dependencies: {
                    ...file.dependencies,
                    [dep]: version,
                },
            }),
        ...(file.devDependencies &&
            file.devDependencies[dep] && {
                devDependencies: {
                    ...file.devDependencies,
                    [dep]: version,
                },
            }),
        ...(file.peerDependencies &&
            file.peerDependencies[dep] && {
                peerDependencies: {
                    ...file.peerDependencies,
                    [dep]: version,
                },
            }),
    };
    return newContent;
};

exports.handler = async function handler(argv) {
    log(`|`);
    log(`|   ${chalk.bold('Will fix?:')} ${argv.fix}`);
    log(`|\n`);
    const files = await getFiles(argv);
    log(`Found ${files.length} workspace package.json files`);

    // first
    const localBar = new ProgressBar('Checking dependencies [:bar] :percent', {
        total: files.length,
    });
    let localChanges = 0;
    const depUsage = {};
    const mismatchUsage = new Set();
    files.forEach(({ file, path }) => {
        const deps = { ...file.dependencies, ...file.devDependencies, ...file.peerDependencies };
        Object.keys(deps).forEach((dep) => {
            const depVersion = deps[dep];
            if (!depUsage[dep]) {
                depUsage[dep] = {};
            }
            if (!depUsage[dep][depVersion]) {
                depUsage[dep][depVersion] = { location: [], size: 0 };
            }
            depUsage[dep][depVersion].location.push({ path, file });
            depUsage[dep][depVersion].size = depUsage[dep][depVersion].location.length;
            const hasMoreThanOneVersion = Object.keys(depUsage[dep]).length > 1;
            if (hasMoreThanOneVersion) {
                mismatchUsage.add(dep);
            }
        });
    });
    const hasErrors = mismatchUsage.size > 0;
    const filesToUpdate = {};
    const mapper = async (dep) => {
        const versions = Object.keys(depUsage[dep]).sort((a, b) =>
            depUsage[dep][a].size < depUsage[dep][b].size ? 1 : -1,
        );
        if (argv.fix) {
            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'version',
                    message: `Which version should ${dep} be on?`,
                    choices: versions.map((version) => ({
                        name: `${version} (${depUsage[dep][version].size} usages)`,
                        value: version,
                    })),
                },
            ]);
            versions
                .filter((version) => answers.version !== version)
                .forEach((version) => {
                    const locations = depUsage[dep][version].location;
                    locations.forEach(({ file, path }) => {
                        localChanges += 1;
                        const mostRecentFile = filesToUpdate[path] || file;
                        filesToUpdate[path] = setNewContent({ dep, version: answers.version, file: mostRecentFile });
                    });
                });
        } else {
            log(dep);
            versions.forEach((version, index) => {
                if (index > 0) {
                    localChanges += depUsage[dep][version].size;
                }
                log(`        - ${version}: has ${depUsage[dep][version].size} usages.`);
            });
        }
    };

    await pMap([...mismatchUsage], mapper, { concurrency: 1 });

    if (argv.fix) {
        const promises = Object.keys(filesToUpdate).map((path) =>
            jsonfile.writeFile(path, filesToUpdate[path], { spaces: 2 }),
        );
        await Promise.all(promises);
        log(`Updated ${localChanges} versions`);
    } else {
        error(`Found ${localChanges} versions to update`);
    }

    if (argv.fail && hasErrors) {
        process.exit(1);
    }
    localBar.terminate();
};
