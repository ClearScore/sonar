// Yargs module:
// https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module

const chalk = require('chalk');

const getFiles = require('./lib/get-package-jsons');
const { log } = require('./lib/log');
const listify = require('./lib/listify');
const validateVersions = require('./validate/versions');
const validateUnused = require('./validate/unused');

exports.command = 'validate';

exports.describe = 'validate your workspace dependency versions';

exports.builder = function handler(yargs) {
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
};

exports.handler = async function handler(argv) {
    log(`|`);
    log(`|   ${chalk.bold('Will fix?:')} ${argv.fix}`);
    log(`|   ${chalk.bold('Will fail?:')} ${argv.fail}`);
    log(`|   ${chalk.bold('Tasks:')} ${listify([argv.versions, argv.unused])}`);
    log(`|\n`);
    const files = await getFiles(argv);
    log(`Found ${files.length} workspace package.json files`);
    let versionErrors = false;
    let depCheckErrors = false;

    if (argv.versions) {
        const { hasErrors } = await validateVersions({ files, argv });
        versionErrors = hasErrors;
    }

    if (argv.unused) {
        const { hasErrors } = await validateUnused({ files, argv });
        depCheckErrors = hasErrors;
    }

    if (argv.fail && (depCheckErrors || versionErrors)) {
        process.exit(1);
    }
};
