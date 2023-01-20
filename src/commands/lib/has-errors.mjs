/* eslint-disable no-console */
import { PATCH, MINOR, MAJOR } from './consts.mjs';
import { log, error, title } from './log.mjs';
import listify from './listify.mjs';

export function errorFactory({ major, minor, patch }) {
    const errors = {};

    const logOutstanding = (type) => {
        log(`To include ${Object.keys(errors[type]).length} '${type}' updates, run with: --${type} [--fix]`);
    };

    const logPackageInfo = (type) => {
        if (!errors[type]) return;
        const pkgs = Object.keys(errors[type])
            .sort()
            .filter((key) => errors[type][key].type === 'package');
        if (!pkgs.length) return;
        title(`--- Workspace Package Updates (${pkgs.length}) ---`);

        pkgs.forEach((NAME) => {
            const { version, newVersion } = errors[type][NAME];
            log(` ${NAME} ${version !== newVersion ? ` : ${version} => ${newVersion}` : ''}`);
        });
    };

    const logDepInfo = (type) => {
        if (!errors[type]) return;
        const deps = Object.keys(errors[type])
            .sort()
            .filter((key) => errors[type][key].type === 'dependency');
        if (!deps.length) return;
        title(
          `--- ${
            type === "undefined" ? "Workspace" : type.toUpperCase()
          } Dependency Updates (${deps.length}) ---`
        );

        deps.forEach((dependency) => {
            const { version, newVersion } = errors[type][dependency];
            log(` ${dependency} : ${version} => ${newVersion}`);
        });
    };

    function logErrors() {
        const hasErrors = Object.keys(errors).length;
        if (hasErrors) {
            if (major) logDepInfo(MAJOR);
            if (minor) logDepInfo(MINOR);
            if (patch) logDepInfo(PATCH);

            // any others?
            Object.keys(errors)
                .filter((key) => ![PATCH, MINOR, MAJOR].includes(key))
                .forEach((errorType) => {
                    logDepInfo(errorType);
                    logPackageInfo(errorType);
                });

            // List excluded updates last
            const notInFilter = [!major && 'major', !minor && 'minor', !patch && 'patch'].filter(Boolean);
            if ((!major || !minor || !patch) && (errors[patch] || errors[minor] || errors[patch])) {
                title(`--- Excluded Updates: ${listify(notInFilter)} ---`);
            }
            if (!major && errors[major]) logOutstanding(MAJOR);
            if (!minor && errors[minor]) logOutstanding(MINOR);
            if (!patch && errors[patch]) logOutstanding(PATCH);
        }
        return hasErrors;
    }

    function saveError({ semVerChange, name, version, newVersion, type }) {
        if (!newVersion) {
            error(`${name} => Could not find latest version`);
            return;
        }

        errors[semVerChange] = {
            ...errors[semVerChange],
            [name]: {
                version,
                newVersion,
                type,
            },
        };
    }

    return {
        logErrors,
        saveError,
    };
}
