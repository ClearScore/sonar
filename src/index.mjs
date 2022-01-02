#!/usr/bin/env node
import fs from 'node:fs';
import yargs from 'yargs';
import { findUpSync } from 'find-up';
import { hideBin } from 'yargs/helpers';

const configPathJson = findUpSync(['.sonarrc', '.sonar.json']);
const configPathJs = configPathJson || findUpSync(['.sonarrc.js','.sonarrc.mjs', 'sonar.config.js', 'sonar.config.mjs']);
// eslint-disable-next-line import/no-dynamic-require, no-nested-ternary
const config = await (configPathJson ?
    JSON.parse(fs.readFileSync(configPathJson)) : configPathJs ?
        import(configPathJs).then(({ default: config }) => config) : {});

// need to return { argv } otherwise the whole thing breaks!
const { argv } = yargs(hideBin(process.argv))
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
    .command(await import('./commands/sync.mjs'))
    .command(await import('./commands/update.mjs'))
    .command(await import('./commands/validate.mjs'))
    .example('$0 sync --help')
    .example('$0 update --help')
    .example('$0 validate --help')
    .demandCommand()
    .help();
