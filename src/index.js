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

const { updateVersions } = require('./lib/update-versions');
const { errorFactory } = require('./lib/has-errors');
const { log, error } = require('./lib/log');

const configPathJson = findUp.sync(['.sonarrc', '.sonar.json']);
const configPathJs = configPathJson || findUp.sync(['.sonarrc.js', 'sonar.config.js']);
// eslint-disable-next-line import/no-dynamic-require
const config = configPathJson ? JSON.parse(fs.readFileSync(configPathJson)) : configPathJs ? require(configPathJs) : {};

const { argv } = yargs
    .config(config)
    .pkgConf('sonar')
    .boolean([
        'internal',
        'external',
        'major',
        'minor',
        'patch',
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'pattern',
        'fail',
        'dryRun',
    ])
    .array(['internal-scopes', 'ignore-scopes'])
    .command('ignore-scopes', 'These scopes will be ignored by the updater')
    .command('internal-scopes', 'Flag scopes as internal')
    .command('internal', 'Update scopes flagged as internal')
    .command('external', 'Update scopes not marked as internal')
    .command('patch', 'Update to the latest patch semantic version')
    .command('minor', 'Update to the latest minor semantic version')
    .command('major', 'Update to the latest major semantic version')
    .command('dependencies', 'Update dependencies')
    .command('devDependencies', 'Update devDependencies')
    .command('peerDependencies', 'Update peerDependencies')
    .command('fail', 'Terminate the process with an error if there are out of date packages')
    .command('dry-run', 'Run the process, without actually updating any files')
    .command('pattern', 'Only check packages matching the given pattern')
    .command('folder', 'Where to look for package.json files')
    .command('concurrency', 'Change how many promises to run concurrently')
    .example('$0 --major --no-internal babel', 'Update all external dependencies with a name containing babel')
    .example('$0 "babel|postcss|eslint|jest"', 'Update minor versions of babel, postcss, eslint and jest dependencies')
    .help('h')
    .alias('h', 'help')
    .alias('s', 'internalScopes')
    .alias('x', 'ignoreScopes')
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
    });

const { folder, dryRun, concurrency = 10, fail } = argv;
const { saveError, logErrors } = errorFactory(argv);

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
        // validate + output config
        const semVer = [argv.patch && 'patch', argv.minor && 'minor', argv.major && 'major'].filter(Boolean).join(', ');
        const types = [argv.deps && 'dependencies', argv.dev && 'devDependencies', argv.peer && 'peerDependencies']
            .filter(Boolean)
            .join(', ');
        const owners = [argv.internal && 'internal', argv.external && 'external']
            .filter(Boolean)
            .join(', ');
        log(`|`);
        log(`|   ${chalk.bold('is Dry-run?:')} ${argv.dryRun}`);
        log(`|   ${chalk.bold('SemVer:')} ${semVer}`);
        log(`|   ${chalk.bold('Types:')} ${types}`);
        log(`|   ${chalk.bold('Groups:')} ${owners}`);
        log(`|\n`);
        return paths;
    })
    .then((paths) => {
        // read all package jsons
        const files = paths.map((path) => jsonfile.readFile(path));
        return pMap(files, (file, index) => ({ path: paths[index], file }), { concurrency });
    })
    .then((files) => {
        // count deps + return update json
        const potentialDeps = files.reduce(
            (prev, { file }) =>
                prev +
                (file.dependencies && argv.dependencies ? Object.keys(file.dependencies).length : 0) +
                (file.devDependencies && argv.devDependencies ? Object.keys(file.devDependencies).length : 0) +
                (file.peerDependencies && argv.peerDependencies ? Object.keys(file.peerDependencies).length : 0),
            0,
        );
        log(`Found ${files.length} packages ...with ${potentialDeps} dependencies\n`);
        const depsBar = new ProgressBar('  Checking dependencies [:bar] :percent', { total: potentialDeps });
        const filesToUpdate = files.map(({ file }) => updateVersions(file, saveError, argv, depsBar));
        const updates = (update, index) => ({ update, path: files[index].path });
        return pMap(filesToUpdate, updates, { concurrency });
    })
    .then((updates) => {
        // write updated json to package.json files
        if (dryRun) return;
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
