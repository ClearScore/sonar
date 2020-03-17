/* eslint-disable no-param-reassign */
const pMapSeries = require('p-map');

const { getLatestFactory } = require('./get-latest');
const { update } = require('./update-version');
const { MAJOR, MINOR, PATCH, DEV_DEPENDENCIES, PEER_DEPENDENCIES, DEPENDENCIES } = require('./consts');

const getLatest = getLatestFactory();

const filter = ({ internal, external, dep, internalScopes, ignoreScopes }) => {
    if (internal && external) return true;
    if (internal) return internalScopes.includes(dep.split('/')[0]);
    if (external) return !internalScopes.includes(dep.split('/')[0]) && !ignoreScopes.includes(dep.split('/')[0]);
    return true;
};

const updateVersions = async (content, saveError, options = {}, depsBar) => {
    const { name: packageName, dependencies = {}, devDependencies = {}, peerDependencies = {} } = content;
    const { major, minor, patch, deps, dev, peer, concurrency, pattern } = options;
    const matchRegEx = new RegExp(pattern || (options._ && options._[0]) || '', 'i');
    const newContent = { ...content };

    // alias cli args to help code make more sense
    const updateDependencies = deps;
    const updateDevDependencies = dev;
    const updatePeerDependencies = peer;
    const updateMajors = major;
    const updateMinors = minor;
    const updatePatches = patch;

    // filter out deps we dont want to update
    const depsToUpdate = Object.keys(dependencies).filter((dep) => filter({ ...options, dep }));
    const devDepsToUpdate = Object.keys(devDependencies).filter((dep) => filter({ ...options, dep }));
    const peerDepsToUpdate = Object.keys(peerDependencies).filter((dep) => filter({ ...options, dep }));

    async function mapper(dependencyType, dependency) {
        if (pattern && !matchRegEx.test(dependency)) return newContent;
        const version = content[dependencyType][dependency];
        const latestVersion = await getLatest(dependency);

        if (!latestVersion) {
            saveError({ packageName, dependency });
        } else if (latestVersion !== version) {
            const { newVersion, semVerChange } = update({ version, latestVersion });
            saveError({ packageName, semVerChange, dependency, version, newVersion });

            if (
                (semVerChange === MAJOR && updateMajors) ||
                (semVerChange === MINOR && updateMinors) ||
                (semVerChange === PATCH && updatePatches)
            ) {
                newContent[dependencyType][dependency] = newVersion;
            }
        }
        depsBar.tick();
        return newContent;
    }

    let promises = [];
    if (updateDependencies) {
        promises = [...promises, ...depsToUpdate.map((dep) => mapper(DEPENDENCIES, dep))];
    }
    if (updateDevDependencies) {
        promises = [...promises, ...devDepsToUpdate.map((dep) => mapper(DEV_DEPENDENCIES, dep))];
    }
    if (updatePeerDependencies) {
        promises = [...promises, ...peerDepsToUpdate.map((dep) => mapper(PEER_DEPENDENCIES, dep))];
    }
    await pMapSeries(promises, (updatedContent) => updatedContent, { concurrency });
    return newContent;
};

module.exports = { updateVersions };
