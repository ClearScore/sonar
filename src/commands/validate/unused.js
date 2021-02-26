const path = require('path');
const depcheck = require('depcheck');
const deepMerge = require('deepmerge');
const ProgressBar = require('progress');

const { error, warning, success, branding } = require('../lib/log');
const { errorFactory } = require('../lib/has-errors');

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

const validateUnused = async ({ workspace, argv }) => {
    const { saveError, logErrors } = errorFactory({ major: true, minor: true, patch: true });
    const localBar = new ProgressBar(`${branding} Checking 'unused' dependencies [:bar] :percent`, {
        total: workspace.getPackageCount(),
    });
    const depsCheckOptions = deepMerge(depsCheckDefaults, argv.depCheckConfig || {});
    const packages = workspace.getPackages();

    const depsCheckPromises = packages.map(async (pkg) => {
        const file = pkg.path === 'package.json' ? '.' : pkg.path.replace('/package.json', '');
        const result = await new Promise((resolve) =>
            depcheck(path.resolve(file), depsCheckOptions, (unused) => resolve({ unused, pkg })),
        );
        localBar.tick();
        return result;
    });
    const depsCheckResults = await Promise.all(depsCheckPromises);
    localBar.terminate();

    let missingCount = 0;
    let unusedCount = 0;
    const resultPromises = depsCheckResults.map(async ({ unused, pkg }) => {
        const packageName = pkg.name;
        const missingPromises = Object.keys(unused.missing).map((unusedDepName) => {
            missingCount += 1;
            return pkg.addDependency({ name: unusedDepName, type: 'dependencies' });
        });
        const unusedDepsPromises = unused.dependencies.map((depName) => {
            unusedCount += 1;
            return pkg.removeDependency({ type: 'dependencies', name: depName });
        });
        const unusedDevDepsPromises = unused.devDependencies.map((depName) => {
            unusedCount += 1;
            return pkg.removeDependency({ type: 'devDependencies', name: depName });
        });

        await Promise.all(missingPromises);
        await Promise.all(unusedDepsPromises);
        await Promise.all(unusedDevDepsPromises);
        const isValid =
            unused.dependencies.length === 0 && unused.devDependencies.length === 0 && missingPromises.length === 0;

        if (Object.keys(unused.invalidFiles).length) {
            error(`Could not read file in ${packageName}`);
            error(JSON.stringify(unused.invalidFiles, null, 2));
        }

        return isValid;
    });

    await Promise.all(resultPromises);

    // commit changes
    let packagesWithChanges = 0;
    let depsChanges = 0;
    await workspace.getChanges({ commit: argv.fix }, (change) => {
        if (change.type === 'package') packagesWithChanges += 1;
        if (change.type === 'dependency') depsChanges += 1;
        saveError(change);
    });

    // Log results
    const hasErrors = logErrors();
    const logType = argv.fail ? error : argv.bump || argv.fix ? success : warning;
    if (packagesWithChanges === 0) {
        success(`Found no missing or unused dependencies`);
    } else {
        const missingLogger = missingCount === 0 ? success : logType;
        const unusedLogger = unusedCount === 0 ? success : logType;
        if (argv.bump || argv.fix) {
            success(`Updated ${packagesWithChanges} workspace packages`);
        } else if (argv.fail) {
            error(`Found ${packagesWithChanges} workspace packages with missing or unused dependencies`);
        } else {
            warning(`Found ${packagesWithChanges} workspace packages with missing or unused dependencies`);
        }
        missingLogger(` - ${missingCount} missing dependencies`);
        unusedLogger(` - ${unusedCount} unused dependencies`);
    }

    return { hasErrors: hasErrors.length };
};

module.exports = validateUnused;
