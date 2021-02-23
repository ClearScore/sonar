const { DEV_DEPENDENCIES, PEER_DEPENDENCIES, DEPENDENCIES } = require('./consts');
const { update } = require('./update-version');

module.exports = (file, versionedPackages, options) =>
    Object.values(versionedPackages).reduce(
        (prev, versionedPackage) => {
            const { change, newContent, changes } = prev;
            const localVersion = versionedPackage.version;

            // dependencies
            const depVersion =
                options.dependencies && newContent[DEPENDENCIES] && newContent[DEPENDENCIES][versionedPackage.name];
            const depChange = update({ version: depVersion, latestVersion: localVersion });
            if (depChange) {
                changes.push({
                    semVerChange: depChange.semVerChange,
                    dependency: versionedPackage.name,
                    version: depVersion,
                    newVersion: localVersion,
                });
                newContent[DEPENDENCIES][versionedPackage.name] = depChange.newVersion;
            }

            // devDependencies
            const devVersion =
                options.devDependencies &&
                newContent[DEV_DEPENDENCIES] &&
                newContent[DEV_DEPENDENCIES][versionedPackage.name];
            const devChange = devVersion && update({ version: devVersion, latestVersion: localVersion });
            if (devChange) {
                changes.push({
                    semVerChange: devChange.semVerChange,
                    dependency: versionedPackage.name,
                    version: devVersion,
                    newVersion: localVersion,
                });
                newContent[DEV_DEPENDENCIES][versionedPackage.name] = devChange.newVersion;
            }

            // peerDependencies
            const peerVersion =
                options.peerDependencies &&
                newContent[PEER_DEPENDENCIES] &&
                newContent[PEER_DEPENDENCIES][versionedPackage.name];
            const peerChange = peerVersion && update({ version: peerVersion, latestVersion: localVersion });
            if (peerChange) {
                changes.push({
                    semVerChange: peerChange.semVerChange,
                    dependency: versionedPackage.name,
                    version: peerVersion,
                    newVersion: localVersion,
                });
                newContent[PEER_DEPENDENCIES][versionedPackage.name] = peerChange.newVersion;
            }

            return { change: change || depChange || devChange || peerChange, newContent, changes };
        },
        { change: false, newContent: file, changes: [] },
    );
