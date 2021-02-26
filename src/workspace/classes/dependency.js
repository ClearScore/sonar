/* eslint-disable no-nested-ternary */
const semver = require('semver');

const { DEPENDENCIES, DEV_DEPENDENCIES, PEER_DEPENDENCIES } = require('../lib/consts');
const { getLatestFactory } = require('../lib/get-latest');
const { getNewSemver } = require('../lib/get-new-semver');

const getLatest = getLatestFactory();

// A dependency can belong to multiple packages. This means a single dep can have multiple versions
// A dependency can also belong to a workspace
class Dependency {
    constructor({ name, version, type, pkg, workspacePackage }) {
        this.name = name;
        this.scope = name.split('/')[0]; // eslint-disable-line prefer-destructuring

        // Used to know during an update, if we should fetch latest from server or from workspace
        this.workspacePackage = workspacePackage;

        // Used so we know which other packages to update when this version updates
        // On initialisation we'll know of a single parent package
        this.parentPackages = [pkg];
        this.parentPackagesByVersion = { [version]: [pkg] };

        // know what changes have happened for quick file writes and happy logs
        this.isDirty = false;
        this.change = {};

        // used for helping find most used versions i.e. sync
        this.minVersion = version;
        this.versions = {};
        this.registerVersion({ version, type });
    }

    registerVersion({ version, type }) {
        if (!this.versions[version]) {
            this.versions[version] = {};
        }
        const depCount = this.versions[version][DEPENDENCIES] || 0;
        const devCount = this.versions[version][DEV_DEPENDENCIES] || 0;
        const peerCount = this.versions[version][PEER_DEPENDENCIES] || 0;
        const count = this.versions[version].count || 0;
        this.versions = {
            ...this.versions,
            [version]: {
                ...this.versions[version],
                version,
                count: count + 1,
                ...(type === DEPENDENCIES && { [DEPENDENCIES]: depCount + 1 }),
                ...(type === DEV_DEPENDENCIES && { [DEV_DEPENDENCIES]: devCount + 1 }),
                ...(type === PEER_DEPENDENCIES && { [PEER_DEPENDENCIES]: peerCount + 1 }),
            },
        };
    }

    // todo: keep a cache of initialised deps: and do this automatically
    // While the looping through package files we may find the same dependency again.
    // dd the new parent, and other info
    registerParent({ version, type, pkg, workspacePackage }) {
        this.parentPackages.push(pkg);
        this.registerVersion({ version, type });

        // todo: add non-peer min version adn non-peer mismatch check. who cares about peers.
        const newIsGtMin = semver.gt(semver.minVersion(version), semver.minVersion(this.minVersion));
        this.minVersion = newIsGtMin ? this.minVersion : version;

        this.workspacePackage = this.workspacePackage || workspacePackage;
        this.parentPackagesByVersion = {
            ...this.parentPackagesByVersion,
            [version]: [...(this.parentPackagesByVersion[version] || []), pkg],
        };
    }

    removeParent({ pkg, type }) {
        const version = pkg.contents[type][this.name];
        this.parentPackages = this.parentPackages.filter((parent) => parent.name !== pkg.name);
        this.parentPackagesByVersion[version] = this.parentPackagesByVersion[version].filter(
            (parent) => parent.name !== pkg.name,
        );
        if (!this.parentPackagesByVersion[version].length) {
            delete this.parentPackagesByVersion[version];
        }
        this.isDirty = true;
        this.change = { semVerChange: 'remove', name: this.name, version, newVersion: 'REMOVE', type: 'dependency' };
    }

    // allow us to set it as a workspace package after initialisation
    // this allows us to do a single loop through all packages, updating their status as we find more info
    setWorkspacePackage(pkg) {
        this.workspacePackage = pkg;
    }

    getChanges() {
        return this.change;
    }

    // PUBLIC API

    // return all version sorted by most popular
    getVersions({ peer = true, dev = true, dep = true } = {}) {
        return Object.keys(this.versions)
            .filter((version) => {
                const isDep = this.versions[version][DEPENDENCIES] > 0;
                const isDev = this.versions[version][DEV_DEPENDENCIES] > 0;
                const isPeer = this.versions[version][PEER_DEPENDENCIES] > 0;
                return (peer && isPeer) || (isDev && dev) || (isDep && dep);
            })
            .map((version) => ({
                ...this.versions[version],
                packages: this.parentPackagesByVersion[version],
            }))
            .sort((a, b) => (a.count - b.count ? 1 : -1));
    }

    // get the latest version from the package store
    async getLatest({ canary } = {}) {
        // if it's a workspace package, we trust the workspace version
        // i.e. the version of the workspace package should always be latest.
        // if it's not a 'sync' is needed, or a rebase. neither not the job of 'update'
        if (this.workspacePackage) return this.workspacePackage.version;
        if (this.latestVersion) return this.latestVersion;

        const latestVersion = await getLatest(this.name, { canary });
        this.latestVersion = latestVersion;
        const isSatisfied = latestVersion && semver.satisfies(latestVersion, this.minVersion);
        if (isSatisfied || !latestVersion) {
            return { semVerChange: null, latestVersion: this.latestVersion };
        }

        const coercedVersion = semver.coerce(this.minVersion || '0.0.0');
        const semVerChange = semver.diff(coercedVersion, latestVersion);
        return { semVerChange, latestVersion: this.latestVersion };
    }

    // Update to a new version; if it is in a new semVer range
    // update any parent packages so the change is propagated
    updateVersion(version, { dep = true, dev = true, peer = true } = {}) {
        if (!version) return; // return if no new version

        this.getVersions({ dep, dev, peer }).forEach(({ version: currVersion, packages }) => {
            const newSemver = getNewSemver({ version: currVersion, latestVersion: version });
            if (!newSemver) return; // return if no change

            const { semVerChange } = newSemver;

            this.isDirty = true;
            this.change = {
                semVerChange,
                name: this.name,
                version: currVersion,
                newVersion: version,
                type: 'dependency',
            };
            // update any parent packages
            packages.forEach((pkg) => {
                pkg.updateDependency(this, { dep, dev, peer });
            });
        });
    }

    peerDependencyErrors({ peerVersion, depVersion } = {}) {
        const versions = this.getVersions({ peer: false, dev: true, dep: true });
        const peerVersions = this.getVersions({ peer: true, dev: false, dep: false });
        if (!peerVersion && !depVersion) {
            //     todo: check current versions
        } else if (peerVersion) {
            return versions.filter(({ version }) => !semver.satisfies(semver.coerce(peerVersion), version));
        } else if (depVersion) {
            return peerVersions.filter(({ version }) => !semver.satisfies(semver.coerce(depVersion), version));
        }
        return [];
    }
}

module.exports = Dependency;
