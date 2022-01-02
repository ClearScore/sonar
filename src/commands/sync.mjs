// Yargs module:
// https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module
import chalk from 'chalk';
import inquirer from 'inquirer';
import ProgressBar from 'progress';

import getWorkspace from '../workspace/index.mjs';
import { log, success, error, warning, branding } from './lib/log.mjs';
import { errorFactory } from './lib/has-errors.mjs';

export const command = 'sync';

export const describe = 'Sync your local workspace';

export function builder(yargs) {
    yargs
        .option('remote', {
            // it's rare this is needed, but useful for publish failures
            type: 'boolean',
            description: 'Ensure usages of workspace packages match the current version',
            default: false,
        })
        .option('bump', {
            type: 'boolean',
            description:
                'Update the version number of workspace packages by a specifies amount (major, minor or patch)',
            default: false,
        })
        .example('$0 sync', 'Update all the usages of your workspace packages to their current versions')
        .example('$0 sync --bump', 'Update all your workspace package version numbers')
        .example(
            '$0 sync --remote',
            'Sync all your workspace package version numbers with what has already been released',
        );
}

export async function handler(argv) {
    const { saveError, logErrors } = errorFactory({ major: true, minor: true, patch: true });
    const workspacePromise = getWorkspace({ folder: argv.folder });
    let answersPromise = Promise.resolve();

    if (argv.bump) {
        answersPromise = inquirer.prompt([
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
    }
    const [answers = {}, workspace] = await Promise.all([answersPromise, workspacePromise]);
    const bumpType = answers.sure ? answers.version : false;

    log(`------------`);
    log(``);
    log(`${chalk.bold('Will fix?:')} ${argv.fix}`);
    log(`${chalk.bold('Will fail?:')} ${argv.fail}`);
    log(`${chalk.bold('Sync with remote?:')} ${argv.remote}`);
    log(`${chalk.bold('Bump:')} ${argv.bump ? bumpType : false}`);
    log(`${chalk.bold('Pattern:')} ${argv.pattern || 'none'}`);
    log(``);
    log(`------------`);
    log(``);
    log(`Found ${workspace.getPackageCount()} workspace package.json files`);
    log(`Found ${workspace.getDependencyCount()} unique dependencies`);
    log(``);
    log(`------------`);
    log(``);

    // first update local package versions
    const localBar = new ProgressBar(`${branding} Checking workspace package versions [:bar] :percent`, {
        total: workspace.getPackageCount(),
    });

    await Promise.all(
        workspace
            .getPackages()
            .sort()
            .map(async (pkg) => {
                const { latestVersion } = argv.remote ? (await pkg.getLatest()) || {} : { latestVersion: pkg.version };
                // update main package version
                pkg.updateVersion(latestVersion);
                // bump
                pkg.bump(bumpType);
                // tick
                localBar.tick();
            }),
    );
    localBar.terminate();

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

    if (argv.bump || argv.fix) {
        success(`Updated ${packagesWithChanges} workspace package versions and synced ${depsChanges} usages`);
    } else if (packagesWithChanges === 0) {
        success(`Found no out of sync dependencies`);
    } else if (argv.fail) {
        error(`Found ${packagesWithChanges} files with out of sync dependencies`);
    } else {
        warning(`Found ${packagesWithChanges} workspace package versions to update with  ${depsChanges} usages`);
    }

    if (argv.fail && hasErrors) {
        process.exit(1);
    }
}
