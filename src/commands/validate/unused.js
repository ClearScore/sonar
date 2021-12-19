const path = require('path');
const depcheck = require('depcheck');
const deepMerge = require('deepmerge');
const ProgressBar = require('progress');

const { error, warning, success, branding, log, title } = require('../lib/log');

const depsCheckDefaults = {
    ignoreBinPackage: true, // ignore the packages with bin entry i.e. husky and jest which are used in npm scripts
    skipMissing: false, // skip calculation of missing dependencies
    parsers: {
        // the target parsers
        '**/*.js': depcheck.parser.jsx,
        '**/*.jsx': depcheck.parser.jsx,
        '**/*.ts': depcheck.parser.typescript,
        '**/*.tsx': depcheck.parser.typescript,
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

const getEmptyResultCache = () => ({
    missing: { prod: {}, dev: {} },
    unused: { prod: {}, dev: {} },
    using: { prod: {}, dev: {} },
});

const checkWorkspaceDeps = async ({
    packageCount,
    packages,
    devPatterns = [],
    depCheckConfig = {},
    ignorePackages = [],
}) => {
    const phase = devPatterns.length ? 1 : 2;
    const barTitle = `${branding} Phase ${phase}: ${phase === 1 ? 'production' : 'development'} [:bar] :percent`;
    const devBar = new ProgressBar(barTitle, { total: packageCount });
    const config = deepMerge({ ...depsCheckDefaults, ignorePatterns: devPatterns }, depCheckConfig);
    const promises = [];
    packages.forEach((pkg) => {
        if (ignorePackages.includes(pkg.name)) return;
        const file = pkg.path === 'package.json' ? '.' : pkg.path.replace('/package.json', '');
        const promise = new Promise((resolve) =>
            depcheck(path.resolve(file), config, (unused) => resolve({ unused, pkg, isDev: devPatterns.length })),
        );
        devBar.tick();
        promises.push(promise);
    });
    const dependenciesList = await Promise.all(promises);
    devBar.terminate();
    return dependenciesList;
};

// # Approach
// Run dep-check, excluding all 'ignoredPatterns' _and_ all 'devPatterns' to create a 'production dependencies list'
// Run again, excluding all 'ignoredPatterns' only.  This will be our 'base dependencies list'
// To get our true 'dev dependencies list' we have to check the 'base' list against our 'prod' list.
//      anything that appears only in the 'base' list, is a 'dev' dependency
// While we loop over the lists, we build a cache of checked dependencies
//      This makes it easier and quicker to know if a dependency exits in another list

// # use-cases
// 1. if a package uses a dep in prod. make sure that dep is in the package.json
// 2. if a package uses a dep _only_ in a test. make sure that dep is in the _root_ package.json

// # 'Missing dependencies': Adding dependencies to the package json
// 1. If a prod dependency is 'missing', it should go in the package.json
// 2. If a dev dependency is 'missing', it should go in the _root_ package.json
//      2a. (but not if it is also a 'workspace package')

// # 'Unused dependencies': Removing dependencies from the packages
// 1. if a prod dependency is 'unused' in a prod file, remove it from the package.json
// 2. if a dev dependency is 'unused' anywhere, remove it from the _root_ package.json

const validateUnused = async ({ workspace, argv }) => {
    const packages = workspace.getPackages();
    const rootPackage = workspace.getRootPackage();
    const packageCount = workspace.getPackageCount();
    const resultCache = { [rootPackage.name]: getEmptyResultCache() };

    title(`Checking 'unused' and 'missing' dependencies`);

    // 1. create a 'production dependencies list'
    const prodDependenciesList = await checkWorkspaceDeps({
        packages,
        packageCount,
        devPatterns: argv.devPatterns,
        depCheckConfig: argv.depCheckConfig,
        ignorePackages: argv.ignoreUnusedInPackages,
    });

    // 2. create a 'base dependencies list'
    const baseDependenciesList = await checkWorkspaceDeps({
        packages,
        packageCount,
        depCheckConfig: argv.depCheckConfig,
        ignorePackages: argv.ignoreUnusedInPackages,
    });

    // 3. find missing + unused prod deps
    prodDependenciesList.forEach(({ unused, pkg }) => {
        if (!resultCache[pkg.name]) resultCache[pkg.name] = getEmptyResultCache();
        const missing = Object.keys(unused.missing);
        resultCache[pkg.name].using.prod = unused.using;

        // cache the missing + unused deps
        missing.forEach((depName) => {
            // no need to add it to the root if it's a workspace package
            if (pkg.name === rootPackage.name && workspace.getPackage({ name: depName })) return;
            // console.log(`0. adding prod dep ${depName} from ${pkg.name}`);
            resultCache[pkg.name].missing.prod[depName] = { name: depName, type: 'dependencies', pkg };
        });
        unused.devDependencies.forEach((depName) => {
            resultCache[pkg.name].unused.prod[depName] = { name: depName, type: 'devDependencies', pkg };
        });
        unused.dependencies.forEach((depName) => {
            resultCache[pkg.name].unused.prod[depName] = { name: depName, type: 'dependencies', pkg };
        });
    });

    // 4. check missing + unused dev deps.
    //       - A dev dependency is only 'missing' if it's not _also_ in prod
    baseDependenciesList.forEach(({ unused, pkg }) => {
        if (!resultCache[pkg.name]) resultCache[pkg.name] = getEmptyResultCache();
        const missing = Object.keys(unused.missing);
        resultCache[pkg.name].using.dev = unused.using;
        resultCache[rootPackage.name].using.dev = {
            ...resultCache[rootPackage.name].using.dev,
            ...unused.using,
        };

        const isProdDependency = (depName, type) =>
            // if it's also used in prod, then it's not a dev-only dependency
            resultCache[pkg.name][type].prod[depName] ||
            // no need to put workspace packages into the root package as a dev-dep
            workspace.getPackage({ name: depName }) ||
            // also, no need to add it to the root, if it's already there
            rootPackage.getDependency({ name: depName });

        missing.forEach((depName) => {
            if (isProdDependency(depName, 'using')) return;
            // console.log(`1. adding dev dep ${depName} from ${pkg.name}`);
            resultCache[rootPackage.name].missing.dev[depName] = {
                name: depName,
                type: 'devDependencies',
                pkg: rootPackage,
            };
        });
        unused.devDependencies.forEach((depName) => {
            if (isProdDependency(depName, 'unused')) return;
            resultCache[pkg.name].unused.dev[depName] = { name: depName, type: 'devDependencies', pkg };
        });
        unused.dependencies.forEach((depName) => {
            if (isProdDependency(depName, 'unused')) return;
            resultCache[pkg.name].unused.dev[depName] = { name: depName, type: 'dependencies', pkg };
        });

        // since 'dev' files include most files, now check for mis-formed files
        if (Object.keys(unused.invalidFiles).length) {
            error(`Could not read file in ${pkg.name}`);
            error(JSON.stringify(unused.invalidFiles, null, 2));
        }
    });

    // step 5. now we have all the data, we can go through unused deps in prod, see if they are used in dev
    //      e.g. a dev dep in the root project is unused in prod, we still want it in devDependencies, so dont remove it
    baseDependenciesList.forEach(({ pkg }) => {
        const unusedProdDeps = resultCache[pkg.name].unused.prod;
        const usedDevDeps = resultCache[rootPackage.name].using.dev;
        Object.keys(unusedProdDeps).forEach((depName) => {
            if (usedDevDeps[depName] && unusedProdDeps[depName].type === 'devDependencies') {
                delete resultCache[pkg.name].unused.prod[depName];
            }
        });

        // if it's unused in prod, but used in dev (and doesn't exist in the root package already),
        // then, mark it as a missing dev-dependency
        Object.keys(resultCache[pkg.name].unused.prod).forEach((depName) => {
            if (
                resultCache[pkg.name].unused.prod[depName] &&
                resultCache[pkg.name].using.dev[depName] &&
                !rootPackage.getDependency({ name: depName })
            ) {
                // console.log(`2. adding ${depName} from ${pkg.name}`);
                resultCache[rootPackage.name].missing.dev[depName] = {
                    name: depName,
                    type: 'devDependencies',
                    pkg: rootPackage,
                };
            }
        });
    });

    // Update packages
    const updatePromises = [];
    let packagesWithChanges = 0;
    let missingCount = 0;
    let unusedCount = 0;
    Object.keys(resultCache).forEach((pkgName) => {
        const missingProd = Object.values(resultCache[pkgName].missing.prod);
        const missingDev = Object.values(resultCache[pkgName].missing.dev);
        const unusedProd = Object.values(resultCache[pkgName].unused.prod);
        const unusedDev = Object.values(resultCache[pkgName].unused.dev);
        const missing = [...missingProd, ...missingDev].sort((a, b) => (a.name < b.name ? -1 : 1));
        const unused = [...unusedProd, ...unusedDev].sort((a, b) => (a.name < b.name ? -1 : 1));
        if (missing.length || unused.length) {
            packagesWithChanges += 1;
        }
        if (missing.length) {
            title(`Add dependencies to ${pkgName}`);
            missing.forEach((update) => {
                log(update.name);
                updatePromises.push(update.pkg.addDependency(update));
                missingCount += 1;
            });
        }
        if (unused.length) {
            title(`Remove dependencies from ${pkgName}`);
            unused.forEach((update) => {
                log(update.name);
                updatePromises.push(update.pkg.removeDependency(update));
                unusedCount += 1;
            });
        }
    });
    await Promise.all(updatePromises);

    // commit changes
    await workspace.getChanges({ commit: argv.fix });

    // eslint-disable-next-line no-nested-ternary
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

    return { hasErrors: packagesWithChanges };
};

module.exports = validateUnused;
