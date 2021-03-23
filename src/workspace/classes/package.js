const semver = require('semver');

const { getLatestFactory } = require('../lib/get-latest');

const getLatest = getLatestFactory();

class Package {
    constructor({ contents, path, workspace }) {
        this.workspace = workspace;
        this.isRoot = path === 'package.json'; // todo: do better
        this.path = path;
        this.name = contents.name;
        this.version = contents.version;
        this.contents = contents;
        this.scope = contents.name.split('/')[0]; // eslint-disable-line prefer-destructuring
        this.allDependencies = [];
        this.dependenciesByName = {};
        this.asDependency = undefined;
        this.isDirty = false;
    }

    registerAsDependency(dependency) {
        this.asDependency = dependency;
    }

    // add a dependency so changes can be identified quickly
    // must be used by workspace so that we dont duplicate dep initialisations
    // todo: have deps handle duplicate inits?
    registerDependency(dependency) {
        this.allDependencies.push(dependency);
        this.dependenciesByName[dependency.name] = dependency;
    }

    // todo: check semver ranges are different?
    // update the package contents + set isDirty so we can save those changes to disk later
    updateDependencyType(dependency, type) {
        if (!this.contents[type] || !this.contents[type][dependency.name]) return;

        const inPkgVersion = this.contents[type][dependency.name];
        const hasChanged = inPkgVersion !== dependency.change.newVersion;
        if (hasChanged) {
            this.isDirty = hasChanged;
            this.contents[type][dependency.name] = dependency.change.newVersion;
        }
    }

    updateDependency(dependency, { dep = true, dev = true, peer = true }) {
        if (dep) this.updateDependencyType(dependency, 'dependencies');
        if (dev) this.updateDependencyType(dependency, 'devDependencies');
        if (peer) this.updateDependencyType(dependency, 'peerDependencies');
    }

    // return change descriptions so they can be logged
    getChanges() {
        const changedDependencies = this.allDependencies.filter((dep) => dep.isDirty);
        const coercedVersion = semver.coerce(this.version);
        const semVerChange = semver.diff(coercedVersion, this.contents.version);
        const change = {
            semVerChange,
            name: this.name,
            version: this.version,
            newVersion: this.contents.version,
            type: 'package',
            changedDependencies,
        };
        return change;
    }

    // PUBIC API

    //  try to get the latest version number from the server
    async getLatest() {
        if (this.latestVersion) return this.latestVersion;
        const coercedVersion = semver.coerce(this.version);
        const latestVersion = await getLatest(this.name);
        if (!latestVersion) return null;

        this.latestVersion = latestVersion;
        const semVerChange = semver.diff(coercedVersion, latestVersion);
        return { semVerChange, latestVersion };
    }

    // update package version + set isDirt so we can save those changes to disk later
    // if this package is used as a dependency anywhere, we also need to update that too.
    updateVersion(version) {
        // if version has changed, update the main package.json file
        if (version && version !== this.version) {
            this.isDirty = true;
            this.contents.version = version;
        }
        // either way, ensure all dependency usages are on the same version
        if (this.asDependency) {
            this.asDependency.updateVersion(version);
        }
    }

    // update the package version by the specified semver bump
    bump(bumpType) {
        if (!bumpType) return;
        const version = semver.inc(this.version, bumpType);
        this.updateVersion(version);
    }

    // allow deps to be added after everything is registered
    async addDependency({ name, version = '0.0.0', type }) {
        let dependency = this.workspace.getDependency({ name });
        if (!dependency) {
            dependency = this.workspace.registerDependency({ pkg: this, name, version, type });
        }
        this.isDirty = true;
        if (!this.contents[type]) {
            this.contents[type] = {};
        }
        this.contents[type][dependency.name] = dependency.minVersion;
        this.contents[type] = Object.keys(this.contents[type])
            .sort()
            .reduce((prev, curr) => ({ ...prev, [curr]: this.contents[type][curr] }), {});

        if (!version || version === '0.0.0') {
            const [commonVersion] = dependency.getVersions();
            if (commonVersion && commonVersion.version !== '0.0.0') {
                dependency.updateVersion(commonVersion.version);
            } else {
                const { latestVersion } = await dependency.getLatest();
                dependency.updateVersion(latestVersion);
            }
        }
        return dependency;
    }

    getDependency({ name }) {
        return this.dependenciesByName[name];
    }

    // allow deps to be removed after everything is registered
    removeDependency({ name, type }) {
        const dependency = this.workspace.getDependency({ name });
        dependency.removeParent({ pkg: this, type });
        this.isDirty = true;
        delete this.contents[type][dependency.name];
    }
}

module.exports = Package;
