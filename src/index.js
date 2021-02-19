#!/usr/bin/env node
/**
 * Loops through all package.json in `args[0]` and update to latest in npm
 */

const FileHound = require('filehound');
const jsonfile = require('jsonfile');
const chalk = require('chalk');
const pMap = require('p-map');
const yargs = require('yargs');
const fs = require('fs');
const findUp = require('find-up');
const ProgressBar = require('progress');
const semver = require('semver');
const inquirer = require('inquirer');

const { updateVersions } = require('./lib/update-versions');
const { errorFactory } = require('./lib/has-errors');
const { log, error } = require('./lib/log');
const { getLatestFactory } = require('./lib/get-latest');

const configPathJson = findUp.sync(['.sonarrc', '.sonar.json']);
const configPathJs = configPathJson || findUp.sync(['.sonarrc.js', 'sonar.config.js']);
// eslint-disable-next-line import/no-dynamic-require, no-nested-ternary
const config = configPathJson ? JSON.parse(fs.readFileSync(configPathJson)) : configPathJs ? require(configPathJs) : {};
const getLatest = getLatestFactory();

const { argv } = yargs
    .config(config)
    .pkgConf('sonar')
    .boolean([
        'local',
        'sync',
        'bump',
        'internal',
        'external',
        'major',
        'minor',
        'patch',
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'fail',
        'dryRun',
    ])
    .string('canary')
    .array(['internal-scopes', 'ignore-scopes'])
    .command('ignore-scopes', 'These scopes will be ignored by the updater')
    .command('internal-scopes', 'Flag scopes as internal')
    .command('local', 'Update local workspace packages to latest version')
    .command('sync', 'Ensure usages of local workspace packages match the current version')
    .command('bump', 'Update the version number of local packages by a specifies amount (major, minor or patch)')
    .command('internal', 'Update scopes flagged as internal')
    .command('external', 'Update scopes not flagged as internal')
    .command('patch', 'Update to the latest patch semantic version')
    .command('minor', 'Update to the latest minor semantic version')
    .command('major', 'Update to the latest major semantic version')
    .command('dependencies', 'Update dependencies')
    .command('devDependencies', 'Update devDependencies')
    .command('peerDependencies', 'Update peerDependencies')
    .command('fail', 'Terminate the process with an error if there are out of date packages')
    .command('dry-run', 'Run the process, without actually updating any files')
    .command('pattern <pattern>', 'Only check packages matching the given pattern')
    .command('folder', 'Where to look for package.json files')
    .command('concurrency', 'Change how many promises to run concurrently')
    .command('canary', 'Only update thos packages with a canary release matching the given string')
    .example('$0 --major --no-internal babel', 'Update all external dependencies with a name containing babel')
    .example('$0 "babel|postcss|eslint|jest"', 'Update minor versions of babel, postcss, eslint and jest dependencies')
    .example('$0 --local --sync', 'Ensure all local package versions are up-to-date and in sync')
    .help('h')
    .alias('h', 'help')
    .alias('s', 'internalScopes')
    .alias('x', 'ignoreScopes')
    .alias('l', 'local')
    .alias('i', 'internal')
    .alias('e', 'external')
    .alias('deps', 'dependencies')
    .alias('dev', 'devDependencies')
    .alias('peer', 'peerDependencies')
    .alias('dryRun', 'dry-run')
    .alias('internalScopes', 'internal-scopes')
    .alias('ignoreScopes', 'ignore-scopes')
    .default({
        dryRun: false,
        fail: false,
        ignoreScopes: [],
        internalScopes: [],
        local: false, // it's rare this'll be out-of-date. For example on publish failures
        sync: true, // we should always aim to have all local packages in sync.
        bump: false,
        internal: true,
        external: true,
        major: false,
        minor: true,
        patch: true,
        dependencies: true,
        devDependencies: true,
        peerDependencies: true,
        folder: '.',
        concurrency: 10,
        canary: '',
    });

const { folder, dryRun, concurrency = 10, fail } = argv;
const { saveError, logErrors } = errorFactory(argv);

// validate + output config
const semVer = [argv.patch && 'patch', argv.minor && 'minor', argv.major && 'major'].filter(Boolean).join(', ');
const types = [argv.deps && 'dependencies', argv.dev && 'devDependencies', argv.peer && 'peerDependencies']
    .filter(Boolean)
    .join(', ');
const owners = [
    argv.internal && 'internal',
    argv.external && 'external',
    argv.local && 'local',
    argv.sync && 'sync-local',
]
    .filter(Boolean)
    .join(', ');
log(`|`);
log(`|   ${chalk.bold('is Dry-run?:')} ${argv.dryRun}`);
log(`|   ${chalk.bold('SemVer:')} ${semVer}`);
log(`|   ${chalk.bold('Types:')} ${types}`);
log(`|   ${chalk.bold('Groups:')} ${owners}`);
log(`|\n`);

/**
 * Find me all the package.json files (though not if they are within a node_modules folder)
 * @type {*|Array|{index: number, input: string}}
 */
FileHound.create()
    .paths(folder)
    .discard('node_modules')
    .ignoreHiddenDirectories()
    .ignoreHiddenFiles()
    .match('package.json')
    .find()
    .then((paths) => {
        // read all package jsons
        const files = paths.map((path) => jsonfile.readFile(path));
        return pMap(files, (file, index) => ({ path: paths[index], file }), { concurrency });
    })
    .then(async (files) => {
        if (argv.bump) {
            const answers = await inquirer.prompt([
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
            return { files, localBumps: answers.sure ? answers.version : false };
        }
        return { files, localBumps: false };
    })
    .then(async ({ files, localBumps }) => {
        let updatedFiles = files;
        const localPackages = {};
        log(`Found ${files.length} local package.json files`);
        if (argv.local) {
            const depsBar = new ProgressBar('  Checking local package versions [:bar] :percent', {
                total: files.length,
            });
            const mapper = async ({ file, path }) => {
                const remoteVersion = await getLatest(file.name, { canary: argv.canary });
                localPackages[file.name] = remoteVersion || file.version;
                if (localBumps) {
                    localPackages[file.name] = semver.inc(localPackages[file.name], localBumps);
                }
                if (localPackages[file.name] && localPackages[file.name] !== file.version) {
                    await jsonfile.writeFile(path, { ...file, version: localPackages[file.name] }, { spaces: 2 });
                }
                depsBar.tick();
                return { file: { ...file, version: localPackages[file.name] }, path };
            };
            updatedFiles = await pMap(files, mapper, { concurrency });
            depsBar.terminate();
        } else {
            files.forEach(({ file }) => {
                localPackages[file.name] = file.version;
            });
        }
        return { files: updatedFiles, localPackages };
    })
    .then(async ({ localPackages, files }) => {
        const potentialDeps = files.reduce(
            (prev, { file }) => {
                const includeDeps = file.dependencies && argv.dependencies;
                const includeDevDeps = file.devDependencies && argv.devDependencies;
                const includePeerDeps = file.peerDependencies && argv.peerDependencies;

                const depCount =
                    (includeDeps ? Object.keys(file.dependencies).length : 0) +
                    (includeDevDeps ? Object.keys(file.devDependencies).length : 0) +
                    (includePeerDeps ? Object.keys(file.peerDependencies).length : 0);

                const uniqueDeps = {
                    ...(includeDeps ? file.dependencies : {}),
                    ...(includeDevDeps ? file.devDependencies : {}),
                    ...(includePeerDeps ? file.peerDependencies : {}),
                };

                return {
                    ...prev,
                    depCount: prev.depCount + depCount,
                    uniqueDeps: { ...prev.uniqueDeps, ...uniqueDeps },
                };
            },
            { depCount: 0, uniqueDeps: {} },
        );
        const uniqueDepCount = Object.keys(potentialDeps.uniqueDeps).length;
        log(`Found ${uniqueDepCount} unique dependencies\n`);
        const depsBar = new ProgressBar('  Checking dependencies [:bar] :percent', { total: potentialDeps.depCount });
        const filesToUpdate = files.map(({ file }) => updateVersions(file, saveError, argv, depsBar, localPackages));
        const updates = (update, index) => ({ update, path: files[index].path });
        const results = await pMap(filesToUpdate, updates, { concurrency });
        return results;
    })
    .then((updates) => {
        // write updated json to package.json files
        if (dryRun) return;
        log(`Updating ${updates.length} package.json's\n`);
        const writeBar = new ProgressBar('  Writing files [:bar] :percent', { total: updates.length });
        const updater = ({ update, path }) => {
            writeBar.tick();
            return jsonfile.writeFile(path, update, { spaces: 2 });
        };
        pMap(updates, updater, { concurrency });
    })
    .then(() => {
        // output any errors
        const hasErrors = logErrors();
        if (fail && hasErrors) {
            error('There are out of date dependencies');
            process.exit(1);
        }
    });
