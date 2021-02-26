#!/usr/bin/env node
const yargs = require('yargs');
const fs = require('fs');
// require('abab');
const findUp = require('find-up');

const configPathJson = findUp.sync(['.sonarrc', '.sonar.json']);
const configPathJs = configPathJson || findUp.sync(['.sonarrc.js', 'sonar.config.js']);
// eslint-disable-next-line import/no-dynamic-require, no-nested-ternary
const config = configPathJson ? JSON.parse(fs.readFileSync(configPathJson)) : configPathJs ? require(configPathJs) : {};

const { argv, ...rest } = yargs
    .option('fix', {
        type: 'boolean',
        description: 'Update the package.json files if updates are found',
        default: false,
    })
    .option('fail', {
        type: 'boolean',
        description: 'Return a failure (exit code 1) if updates are found',
        default: false,
    })
    .option('folder', {
        // we should always aim to have all local packages in sync.
        type: 'string',
        description: 'Where to look for package.json files',
        default: '.',
    })
    .option('concurrency', {
        type: 'number',
        description: 'Tweak how many network requests can be made at once',
        default: 10,
    })
    .config(config)
    .pkgConf('sonar')
    .command(require('./commands/sync.js'))
    .command(require('./commands/update.js'))
    .command(require('./commands/validate.js'))
    .example('$0 sync --help')
    .example('$0 update --help')
    .example('$0 validate --help')
    .help();

if (!['sync', 'update', 'validate'].includes(argv._[0])) {
    rest.showHelp();
}
