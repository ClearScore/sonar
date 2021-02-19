/* eslint-disable no-param-reassign */
const pMapSeries = require('p-map');
const semver = require('semver');

const { getLatestFactory } = require('./get-latest');
const { update } = require('./update-version');
const {
    MAJOR,
    MINOR,
    PATCH,
    PRERELEASE,
    PREMINOR,
    PREPATCH,
    PREMAJOR,
    DEV_DEPENDENCIES,
    PEER_DEPENDENCIES,
    DEPENDENCIES,
} = require('./consts');

const getLatest = getLatestFactory();

const filter = ({ internal, external, dep, internalScopes, ignoreScopes }) => {
    if (internal && external) return true;
    if (internal) return internalScopes.includes(dep.split('/')[0]);
    if (external) return !internalScopes.includes(dep.split('/')[0]) && !ignoreScopes.includes(dep.split('/')[0]);
    return true;
};

const updateVersions = async (content, saveError, options = {}, depsBar, localPackages = {}) => {
    const { name: packageName, dependencies = {}, devDependencies = {}, peerDependencies = {} } = content;
    const { major, minor, patch, deps, dev, peer, concurrency, pattern, canary, syncLocal, group } = options;
    const matcher = pattern || (options._ && options._[0]) || '';
    const groupMatcher = (options.groups && options.groups[group]) || '';
    const matchRegEx = new RegExp(matcher, 'i');
    const groupRegEx = new RegExp(groupMatcher, 'i');
    const newContent = { ...content };

    // alias cli args to help code make more sense
    const updateDependencies = deps;
    const updateDevDependencies = dev;
    const updatePeerDependencies = peer;
    const updateMajors = major;
    const updateMinors = minor;
    const updatePatches = patch;
    const updateCanary = canary;

    // filter out deps we dont want to update
    const depsToUpdate = Object.keys(dependencies).filter((dep) => filter({ ...options, dep }));
    const devDepsToUpdate = Object.keys(devDependencies).filter((dep) => filter({ ...options, dep }));
    const peerDepsToUpdate = Object.keys(peerDependencies).filter((dep) => filter({ ...options, dep }));

    async function mapper(dependencyType, dependency) {
        const isLocal = !!localPackages[dependency];
        if (
            (matcher && !matchRegEx.test(dependency)) ||
            (groupMatcher && !groupRegEx.test(dependency)) ||
            (isLocal && !syncLocal)
        ) {
            return newContent;
        }
        const version = content[dependencyType][dependency];
        const localPackageVersion = localPackages[dependency];
        const latestVersion = await (localPackageVersion || getLatest(dependency, { canary: options.canary }));

        if (!latestVersion) {
            saveError({ packageName, dependency });
        } else if (!semver.satisfies(latestVersion, version)) {
            const { newVersion, semVerChange } = update({ version, latestVersion });
            saveError({ packageName, semVerChange, dependency, version, newVersion });

            if (
                (isLocal && syncLocal) ||
                (semVerChange === PRERELEASE && updatePatches) ||
                (semVerChange === MAJOR && updateMajors) ||
                (semVerChange === MINOR && updateMinors) ||
                (semVerChange === PATCH && updatePatches) ||
                ([PREMINOR, PREPATCH, PREMAJOR].includes(semVerChange) && updateCanary)
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
