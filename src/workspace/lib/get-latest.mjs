import packageJson from 'package-json';

const getVersion = async (packageName, { canary } = {}) => {
    const data = await packageJson(packageName.toLowerCase(), { allVersions: true });
    return canary
        ? Object.keys(data.versions)
              .sort((a, z) => (a - z < 0 ? -1 : 0))
              .find((version) => version.includes(canary))
        : data['dist-tags'].latest;
};

async function getLatestFromRepo(pck, options) {
    try {
        const version = await getVersion(pck, options);
        return version;
    } catch (e) {
        return undefined;
    }
}

export function getLatestFactory() {
    const checkedCache = {};
    const fetchingCache = {};

    return async function getLatest(dep, options) {
        if (typeof checkedCache[dep] !== 'undefined') {
            return checkedCache[dep];
        }
        // do not await on this line, so that multiple requests dont all go to the server
        fetchingCache[dep] = fetchingCache[dep] || getLatestFromRepo(dep, options);
        checkedCache[dep] = await fetchingCache[dep];
        return checkedCache[dep];
    };
}
