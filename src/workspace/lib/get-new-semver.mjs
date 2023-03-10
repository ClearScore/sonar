import semver from 'semver';

import { MINOR, PATCH } from './consts.mjs';

export const getWildCards = (version) => {
    const [, minorDep, patchDep = ''] = version.split('.');
    return {
        isWildPatch: patchDep.includes('x') || version.includes('~'),
        isWildMinor: minorDep.includes('x') || version.includes('^'),
    };
};

export const replaceWildCards = ({ version, latestVersion, semVerChange }) => {
    if (version.includes('~')) {
        // allow patches
        return semVerChange === PATCH ? version : `~${latestVersion}`;
    } else if (version.includes('^')) {
        // allow minors
        return [PATCH, MINOR].includes(semVerChange) ? version : `^${latestVersion}`;
    }
    if (version.includes('x')) {
        const newVersionSplit = [...latestVersion];
        const xLocation = version.indexOf('x');
        newVersionSplit.splice(xLocation, 1, 'x');
        const filteredMinor = newVersionSplit.slice(0, xLocation + 1);
        return filteredMinor.join('');
    }
    return latestVersion;
};

export const getNewSemver = ({ version, latestVersion }) => {
    if (!version) return null;
    if (version.includes("workspace") || latestVersion.includes('workspace')) return null;

    const depSatisfied = semver.satisfies(latestVersion, version);
    const coercedVersion = semver.coerce(version);
    const coercedLatestVersion = semver.coerce(latestVersion);
    const semVerChange = semver.diff(coercedVersion, coercedLatestVersion);
    const newVersion = replaceWildCards({ version, latestVersion, semVerChange });
    // only return update is
    return !depSatisfied ? { newVersion, semVerChange } : null;
};
