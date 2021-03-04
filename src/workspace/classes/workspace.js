const jsonfile = require('jsonfile');

const { DEV_DEPENDENCIES, PEER_DEPENDENCIES, DEPENDENCIES } = require('../lib/consts');
const Package = require('./package');
const Dependency = require('./dependency');

class Workspace {
    constructor(paths) {
        this.paths = paths;

        this.allPackages = [];
        this.packagesByName = {};
        this.packagesByPath = {};

        this.allDependencies = [];
        this.dependenciesByName = {};

        this.dependencyTypes = { DEV_DEPENDENCIES, PEER_DEPENDENCIES, DEPENDENCIES };
    }

    async init({ onRegister = () => {} }) {
        const promises = this.paths.map(async (path) => {
            const contents = await jsonfile.readFile(path);
            onRegister();
            this.registerPackage({ contents, path });
        });
        await Promise.all(promises);
        return this;
    }

    // A workspace contains packages
    registerPackage({ contents, path }) {
        const pkg = new Package({ contents, path, workspace: this });
        this.allPackages.push(pkg);
        this.packagesByName[pkg.name] = pkg;
        this.packagesByPath[pkg.path] = pkg;

        // The workspace also wants to know what deps this package has
        this.registerDependencies(pkg, 'dependencies');
        this.registerDependencies(pkg, 'devDependencies');
        this.registerDependencies(pkg, 'peerDependencies');

        // in case it's already been added as a dep, mark it as a workspace package
        if (this.dependenciesByName[pkg.name]) {
            this.dependenciesByName[pkg.name].setWorkspacePackage(pkg);
            pkg.registerAsDependency(this.dependenciesByName[pkg.name]);
        }
    }

    // A workspace also contains dependencies.  Odd, but true. This is because they are linked.
    // we want to know about which versions are being used, and when we update, we want to update them all.
    registerDependencies(pkg, type) {
        const deps = pkg.contents[type] || {};
        Object.keys(deps).forEach((dep) => {
            this.registerDependency({ pkg, name: dep, version: deps[dep], type });
        });
    }

    // workspace must manage dependencies so we dont accidentally initialise the same one twice
    // this means the workspace all needs to tell the package about it's own deps :shock:
    registerDependency({ pkg, name, version, type }) {
        const workspacePackage = this.packagesByName[name];
        let dependency;

        if (this.dependenciesByName[name]) {
            //    this dep has already been initialised, add the new data
            dependency = this.dependenciesByName[name];
            dependency.registerParent({ name, version, type, pkg, workspacePackage });
        } else {
            dependency = new Dependency({ name, version, type, pkg, workspacePackage });
            this.allDependencies.push(dependency);
            this.dependenciesByName[dependency.name] = dependency;
        }
        if (workspacePackage) workspacePackage.registerAsDependency(dependency);
        pkg.registerDependency(dependency);
        return dependency;
    }

    // PUBLIC API

    // GET WORKSPACE DATA
    getRootPackage() {
        return this.allPackages.find((pkg) => pkg.isRoot);
    }

    getPackages() {
        return this.allPackages;
    }

    getPackageCount() {
        return this.allPackages.length;
    }

    getPackage({ name }) {
        return this.packagesByName[name];
    }

    getDependencies() {
        return this.allDependencies;
    }

    getDependencyCount() {
        return this.allDependencies.length;
    }

    getDependency({ name }) {
        return this.dependenciesByName[name];
    }

    // MUTATE WORKSPACE
    // calls callback with either pkgChange or dependencyChange.
    getChanges({ commit }, cb = () => {}) {
        const promises = this.allPackages
            .filter((pkg) => pkg.isDirty)
            .map(async (pkg) => {
                const pkgChange = pkg.getChanges();
                cb(pkgChange);
                pkgChange.changedDependencies
                    .filter((dependency) => dependency.isDirty)
                    .forEach((dependency) => {
                        const dependencyChange = dependency.getChanges();
                        cb(dependencyChange);
                    });

                if (commit) {
                    await jsonfile.writeFile(pkg.path, pkg.contents, { spaces: 2 });
                }
            });
        return Promise.all(promises);
    }
}

module.exports = Workspace;
