/* eslint-disable no-console */
import chalk from 'chalk';

export const branding = chalk.bgBlue.whiteBright(' Sonar ');
const errorBranding = chalk.bgRed.whiteBright(' Sonar ');
const warningBranding = chalk.bgCyan.whiteBright(' Sonar ');
const successBranding = chalk.bgGreen.whiteBright(' Sonar ');

export function title(message) {
    return console.log(`\n${branding} ${chalk.bold(message)}`);
}

export function log(message) {
    return console.log(`${branding} ${message}`);
}

export function error(message) {
    return console.error(`\n${errorBranding} ${chalk.red(message)}\n`);
}

export function success(message) {
    return console.info(`\n${successBranding} ${chalk.green(message)}\n`);
}

export function warning(message) {
    return console.warn(`\n${warningBranding} ${chalk.cyan(message)}\n`);
}
