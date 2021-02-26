/* eslint-disable no-console */
const chalk = require('chalk');

const branding = chalk.bgBlue.whiteBright(' Workspace ');
const errorBranding = chalk.bgRed.whiteBright(' Workspace ');
const warningBranding = chalk.bgKeyword('orange').whiteBright(' Workspace ');
const successBranding = chalk.bgGreen.whiteBright(' Workspace ');

module.exports = {
    branding,
    title: function log(message) {
        return console.log(`\n${branding} ${chalk.bold(message)}`);
    },
    log: function log(message) {
        return console.log(`${branding} ${message}`);
    },
    error: function error(message) {
        return console.error(`\n${errorBranding} ${chalk.red(message)}\n`);
    },
    success: function success(message) {
        return console.info(`\n${successBranding} ${chalk.green(message)}\n`);
    },
    warning: function warning(message) {
        return console.warn(`\n${warningBranding} ${chalk.keyword('orange')(message)}\n`);
    },
};
