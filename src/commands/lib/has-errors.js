/* eslint-disable no-console */
const { PATCH, MINOR, MAJOR } = require('./consts');
const { log, error, title } = require('./log');

function errorFactory({ major, minor, patch }) {
    const errors = {};

    const logInfo = (type, hasType) => {
        if (!errors[type]) return;
        if (hasType) {
            title(`--- ${type.toUpperCase()} (${Object.keys(errors[type]).length}) ---`);
            Object.keys(errors[type])
                .sort()
                .forEach((dependency) => {
                    const { version, newVersion } = errors[type][dependency];
                    log(` ${dependency} : ${version} => ${newVersion}`);
                });
        } else {
            log(`${Object.keys(errors[type]).length} '${type}' updates not include; run with: --${type} [--fix]`);
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
                .forEach((errorType) => {
                    title(`--- ${errorType} (${Object.keys(errors[errorType]).length}) ---`);
                    Object.keys(errors[errorType])
                        .sort()
                        .forEach((dependency) => {
                            const { version, newVersion } = errors[errorType][dependency];
                            log(` ${dependency} : ${version} => ${newVersion}`);
                        });
                });

            error('Dependencies out of date');
        }
        return hasErrors;
    }

    function saveError({ semVerChange, dependency, version, newVersion }) {
        if (!newVersion) {
            error(`${dependency} => Could not find latest version`);
            return;
        }

        errors[semVerChange] = {
            ...errors[semVerChange],
            [dependency]: {
                version,
                newVersion,
            },
        };
    }

    return {
        logErrors,
        saveError,
    };
}

module.exports = { errorFactory };
