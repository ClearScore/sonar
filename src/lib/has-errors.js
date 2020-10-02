/* eslint-disable no-console */
const { PATCH, MINOR, MAJOR } = require('./consts');
const { log, error, title } = require('./log');

function errorFactory({ major, minor, patch }) {
    const errors = {};

    const logInfo = (type, hasType) => {
        if (!errors[type]) return;
        title(`--- ${type.toUpperCase()} (${errors[type].length}) ---`);
        if (hasType) {
            errors[type].sort().forEach((e) => log(e));
        } else {
            log(`To update ${type}, run with: --${type}`);
            log(`To see possible ${type} updates, run with: --${type} --dry-run`);
        }
    };

    function logErrors() {
        const hasErrors = Object.keys(errors).length;
        if (hasErrors) {
            logInfo(MAJOR, major);
            logInfo(MINOR, minor);
            logInfo(PATCH, patch);

            Object.keys(errors)
                .filter((key) => ![PATCH, MINOR, MAJOR].includes(key))
                .forEach(function logUnknownSemVerTypes(errorType) {
                    title(`--- ${errorType} (${errors[errorType].length}) ---`);
                    errors[errorType].sort().forEach((e) => log(e));
                });

            error('Dependencies out of date');
        }
        return hasErrors;
    }

    function saveError({ semVerChange, packageName, dependency, version, newVersion }) {
        if (!newVersion) {
            error(`${packageName} : ${dependency} => unknown version`);
            return;
        }

        errors[semVerChange] = [
            ...(errors[semVerChange] || []),
            `${packageName} : ${dependency}@${version} => ${newVersion}`,
        ];
    }

    return {
        logErrors,
        saveError,
    };
}

module.exports = { errorFactory };
