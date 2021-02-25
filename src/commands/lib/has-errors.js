/* eslint-disable no-console */
const { PATCH, MINOR, MAJOR } = require('./consts');
const { log, error, title } = require('./log');
const listify = require('./listify');

function errorFactory({ major, minor, patch }) {
    const errors = {};

    const logOutstanding = (type) => {
        if (!errors[type]) return;
        log(`To include ${Object.keys(errors[type]).length} '${type}' updates, run with: --${type} [--fix]`);
    };

    const logInfo = (type) => {
        if (!errors[type]) return;
        title(`--- ${type.toUpperCase()} (${Object.keys(errors[type]).length}) ---`);
        Object.keys(errors[type])
            .sort()
            .forEach((dependency) => {
                const { version, newVersion } = errors[type][dependency];
                log(` ${dependency} : ${version} => ${newVersion}`);
            });
    };

    function logErrors() {
        const hasErrors = Object.keys(errors).length;
        if (hasErrors) {
            if (major) logInfo(MAJOR);
            if (minor) logInfo(MINOR);
            if (patch) logInfo(PATCH);

            // any others?
            Object.keys(errors)
                .filter((key) => ![PATCH, MINOR, MAJOR].includes(key))
                .forEach((errorType) => {
                    logInfo(errorType, true);
                });

            // List excluded updates last
            const notInFilter = [!major && 'major', !minor && 'minor', !patch && 'patch'].filter(Boolean);
            if (!major || !minor || !patch) title(`--- Excluded Updates: ${listify(notInFilter)} ---`);
            if (!major) logOutstanding(MAJOR);
            if (!minor) logOutstanding(MINOR);
            if (!patch) logOutstanding(PATCH);
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
