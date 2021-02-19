const semver = require('semver');

const { MINOR, PATCH } = require('./consts');

const getWildCards = (version) => {
    const [, minorDep, patchDep = ''] = version.split('.');
    return {
        isWildPatch: patchDep.includes('x') || version.includes('~'),
        isWildMinor: minorDep.includes('x') || version.includes('^'),
    };
};

const replaceWildCards = ({ version, latestVersion, semVerChange }) => {
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

const update = ({ version, latestVersion }) => {
    const coercedVersion = semver.coerce(version);
    const semVerChange = semver.diff(coercedVersion, latestVersion);
    const newVersion = replaceWildCards({ version, latestVersion, semVerChange });
    return { newVersion, semVerChange };
};

module.exports = { replaceWildCards, getWildCards, update };
