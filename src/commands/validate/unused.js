const path = require('path');
const semver = require('semver');
const depcheck = require('depcheck');
const deepMerge = require('deepmerge');

const { log, error, warning, success } = require('../lib/log');
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

const validateUnused = async ({ files, argv }) => {
    const errors = [];
    const depsCheckOptions = deepMerge(depsCheckDefaults, argv.depCheckConfig || {});
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
            errors.push({ packageName, unused: unused.dependencies, filePath, type: 'dependencies' });
        }
        if (unused.devDependencies.length) {
            errors.push({ packageName, unused: unused.devDependencies, filePath, type: 'devDependencies' });
        }
        if (Object.keys(missing).length) {
            errors.push({ packageName, missing, filePath });
        }
        return isValid;
    });

    const resultsArr = await Promise.all(resultPromises);
    const hasErrors = resultsArr.filter((isValid) => !isValid);
    const fixes = { unused: 0, missing: 0 };
    const promises = errors.map(async (err) => {
        if (err.unused) {
            fixes.unused += err.unused.length;
            if (argv.fix) {
                log(`fixing unused ${err.type} in ${err.packageName}...`);
                await fixUnusedDeps(err.filePath, err.type, err.unused);
            } else if (argv.fail) {
                error(`Found unused ${err.type} in ${err.packageName}`);
            } else {
                warning(`Found unused ${err.type} in ${err.packageName}`);
            }
            warning(`\n${JSON.stringify(err.unused, null, 2)}\n`);
        }
        if (err.missing) {
            fixes.missing += Object.keys(err.missing).length;
            if (argv.fix) {
                log(`fixing missing dependency in ${err.packageName}...`);
                await fixMissingDeps(err.filePath, err.missing);
            } else if (argv.fail) {
                error(`Found missing dependency in ${err.packageName}`);
            } else {
                warning(`Found missing dependency in ${err.packageName}`);
            }
            warning(`\n${JSON.stringify(err.missing, null, 2)}\n`);
        }
    });

    await Promise.all(promises);
    if (argv.fix && errors.length) {
        success(`Fixed ${fixes.unused} unused dependencies`);
        success(`Fixed ${fixes.missing} missing dependencies`);
    } else {
        const logFail = argv.fail ? error : success;
        if (fixes.unused === 0) success(`Found 0 unused dependencies`);
        if (fixes.missing === 0) success(`Found 0 missing dependencies`);
        if (fixes.unused > 0) logFail(`Found ${fixes.unused} unused dependencies`);
        if (fixes.missing > 0) logFail(`Found ${fixes.missing} missing dependencies`);
    }

    return { hasErrors: hasErrors.length };
};

module.exports = validateUnused;
