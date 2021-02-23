/* eslint-disable no-console */
const chalk = require('chalk');

const branding = chalk.bgBlue.whiteBright(' Sonar ');
const errorBranding = chalk.bgRed.whiteBright(' Sonar ');

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
};
