const getLatestVersion = require('latest-version');

async function getLatestFromRepo(pck) {
    try {
        const version = await getLatestVersion(pck);
        return version;
    } catch (e) {
        return undefined;
    }
}

function getLatestFactory() {
    const checkedCache = {};

    return function getLatest(dep) {
        if (checkedCache[dep]) {
            return checkedCache[dep];
        }
        const latestVersion = getLatestFromRepo(dep);
        checkedCache[dep] = latestVersion;
        return latestVersion;
    };
}

module.exports = { getLatestFactory };
