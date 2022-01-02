// Yargs module:
// https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module

import chalk from 'chalk';

import getWorkspace from '../workspace/index.mjs';
import { log } from './lib/log.mjs';
import listify from './lib/listify.mjs';
import validateVersions from './validate/versions.mjs';
import validateUnused from './validate/unused.mjs';

export const command = 'validate';

export const describe = 'validate your workspace dependency versions';

export function builder(yargs) {
    yargs
        .option('versions', {
            type: 'boolean',
            description: 'ensure you do not have different versions of the same dependency',
            default: false,
        })
        .option('unused', {
            alias: ['depCheck', 'dep-check'],
            type: 'boolean',
            description: 'ensure you using all dependencies and every dependency is within the package.json',
            default: false,
        })
        .example('$0 validate --versions --fix')
        .example('$0 validate --unused --fix')
        .middleware((argv) => {
            const newArgs = { ...argv };

            // neither validation? you probably meant both
            if (!argv.versions && !argv.unused) {
                newArgs.versions = true;
                newArgs.unused = true;
            }
            return newArgs;
        });
}

export async function handler(argv) {
    const workspace = await getWorkspace({ folder: argv.folder });

    log(`------------`);
    log(``);
    log(`${chalk.bold('Will fix?:')} ${argv.fix}`);
    log(`${chalk.bold('Will fail?:')} ${argv.fail}`);
    log(`${chalk.bold('Tasks:')} ${listify([argv.versions && 'versions', argv.unused && 'unused'].filter(Boolean))}`);
    log(``);
    log(`------------`);
    log(``);
    log(`Found ${workspace.getPackageCount()} workspace package.json files`);
    log(`Found ${workspace.getDependencyCount()} unique dependencies`);
    log(``);
    log(`------------`);

    let versionErrors = false;
    let depCheckErrors = false;

    if (argv.versions) {
        const { hasErrors } = await validateVersions({ workspace, argv });
        versionErrors = hasErrors;
    }

    if (argv.unused) {
        const { hasErrors } = await validateUnused({ workspace, argv });
        depCheckErrors = hasErrors;
    }

    if (argv.fail && (depCheckErrors || versionErrors)) {
        process.exit(1);
    }
}
