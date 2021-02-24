// Yargs module:
// https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module

const chalk = require('chalk');

const getFiles = require('./lib/get-package-jsons');
const { log } = require('./lib/log');
const validateVersions = require('./validate/versions');
const validateUsage = require('./validate/usage');

exports.command = 'validate';

exports.describe = 'validate your workspace dependency versions';

exports.builder = function handler(yargs) {
    yargs
        .option('versions', {
            type: 'boolean',
            description: 'ensure you do not have different versions of the same dependency',
            default: false,
        })
        .option('usage', {
            type: 'boolean',
            description: 'ensure you using all dependencies and every dependency is within the package.json',
            default: false,
        })
        .example('$0 validate --versions --fix')
        .example('$0 validate --usage --fix');
};

exports.handler = async function handler(argv) {
    log(`|`);
    log(`|   ${chalk.bold('Will fix?:')} ${argv.fix}`);
    log(`|\n`);
    const files = await getFiles(argv);
    log(`Found ${files.length} workspace package.json files`);

    if (argv.versions) {
        const { hasErrors } = await validateVersions({ files, argv });
        if (argv.fail && hasErrors) {
            process.exit(1);
        }
    }

    if (argv.usage) {
        const { hasErrors } = await validateUsage({ files, argv });
        if (argv.fail && hasErrors) {
            process.exit(1);
        }
    }
};
