const packageJson = require('package-json');

const getVersion = async (packageName, { canary } = {}) => {
    const data = await packageJson(packageName.toLowerCase(), { allVersions: true });
    return canary ? Object.keys(data.versions).find((version) => version.includes(canary)) : data['dist-tags'].latest;
};

async function getLatestFromRepo(pck, options) {
    try {
        const version = await getVersion(pck, options);
        return version;
    } catch (e) {
        return undefined;
    }
}

function getLatestFactory() {
    const checkedCache = {};
    return async function getLatest(dep, options) {
        if (checkedCache[dep]) {
            return checkedCache[dep];
        }
        const latestVersion = await getLatestFromRepo(dep, options);
        checkedCache[dep] = latestVersion;
        return latestVersion;
    };
}

module.exports = { getLatestFactory };
