const jsonfile = require('jsonfile');
const pMap = require('p-map');
const ProgressBar = require('progress');
const inquirer = require('inquirer');

const { log, error, success, warning } = require('../lib/log');

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

const validateVersions = async ({ files, argv }) => {
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
    localBar.terminate();

    if (argv.fix) {
        const promises = Object.keys(filesToUpdate).map((path) =>
            jsonfile.writeFile(path, filesToUpdate[path], { spaces: 2 }),
        );
        await Promise.all(promises);
        success(`Updated ${localChanges} versions`);
    } else if (localChanges === 0) {
        success(`Found ${localChanges} versions to update`);
    } else if (argv.fail) {
        error(`Found ${localChanges} versions to update`);
    } else {
        warning(`Found ${localChanges} versions to update`);
    }

    return { hasErrors };
};

module.exports = validateVersions;
