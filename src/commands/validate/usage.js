const path = require('path');
const semver = require('semver');
const depcheck = require('depcheck');
const chalk = require('chalk');

const { log, error } = require('../lib/log');
const { getLatestFactory } = require('../lib/get-latest');
const { fixMissingDeps, fixUnusedDeps } = require('../lib/fix-usage');

const getLatest = getLatestFactory();

const depsCheckDefaults = {
    ignoreBinPackage: true, // ignore the packages with bin entry i.e. husky and jest which are used in npm scripts
    skipMissing: false, // skip calculation of missing dependencies
    parsers: {
        // the target parsers
        '**/*.js': depcheck.parser.jsx,
        '**/*.jsx': depcheck.parser.jsx,
    },
    detectors: [
        // the target detectors
        depcheck.detector.requireCallExpression,
        depcheck.detector.importDeclaration,
    ],
    specials: [
        // the target special parsers
        depcheck.special.eslint,
        depcheck.special.webpack,
    ],
};

const validateUsage = async ({ files, argv }) => {
    const depsCheckOptions = {
        ...depsCheckDefaults,
        ignoreMatches: argv.usageIgnorePackages || [],
        ignorePatterns: argv.usageIgnorePattern || [],
    };
    const uniqueDeps = files.reduce((prev, { file }) => {
        const newDeps = {
            ...prev,
            ...(argv.dependencies ? file.dependencies : {}),
            ...(argv.devDependencies ? file.devDependencies : {}),
            ...(argv.peerDependencies ? file.peerDependencies : {}),
        };
        Object.keys(newDeps).forEach((dep) => {
            if (prev[dep] && semver.gt(semver.minVersion(prev[dep]), semver.minVersion(newDeps[dep]))) {
                newDeps[dep] = prev[dep];
            }
        });
        return newDeps;
    }, {});

    const depsCheckPromises = files.map(({ path: filePath }) => {
        const file = filePath === 'package.json' ? '.' : filePath.replace('/package.json', '');
        return new Promise((resolve) =>
            depcheck(path.resolve(file), depsCheckOptions, (unused) => resolve({ unused, filePath })),
        );
    });
    const depsCheckResults = await Promise.all(depsCheckPromises);
    const resultPromises = depsCheckResults.map(async ({ unused, filePath }) => {
        const packageName = files.find(({ path: p }) => p === filePath).file.name;
        const missingPromises = Object.keys(unused.missing).map(async (dep) => {
            const version = uniqueDeps[dep] || (await getLatest(dep)) || '0.0.0';
            return { [dep]: version };
        });
        const missingArr = await Promise.all(missingPromises);
        const missing = missingArr.reduce((prev, dep) => ({ ...prev, ...dep }), {});
        const isValid =
            unused.dependencies.length === 0 &&
            unused.devDependencies.length === 0 &&
            Object.keys(missing).length === 0;

        if (Object.keys(unused.invalidFiles).length) {
            error(`Could not read file in ${packageName}`);
            error(JSON.stringify(unused.invalidFiles, null, 2));
        }

        if (unused.dependencies.length) {
            log(`Unused dependencies in ${packageName}`);
            log(unused.dependencies);

            if (argv.fix) {
                log(`fixing unused dev deps in ${packageName}...`);
                await fixUnusedDeps(filePath, 'dependencies', unused.dependencies);
            }
        }
        if (unused.devDependencies.length) {
            log(`Unused devDependencies in ${packageName}`);
            log(unused.devDependencies);

            if (argv.fix) {
                log(`fixing unused dev deps in ${filePath}...`);
                await fixUnusedDeps(filePath, 'devDependencies', unused.devDependencies);
            }
        }
        if (Object.keys(missing).length) {
            log(`missing dependencies in ${packageName}`);
            log(chalk.green(`${JSON.stringify(missing, null, 2)}\n`));

            if (argv.fix) {
                log(`fixing missing in ${filePath}...`);
                await fixMissingDeps(filePath, missing);
            }
        }

        return isValid;
    });
    const resultsArr = await Promise.all(resultPromises);
    const hasErrors = resultsArr.filter((isValid) => !isValid);
    return { hasErrors };
};

module.exports = validateUsage;
