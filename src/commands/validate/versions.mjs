import pMap from 'p-map';
import ProgressBar from 'progress';
import inquirer from 'inquirer';

import { log, error, success, warning } from '../lib/log.mjs';
import { errorFactory } from '../lib/has-errors.mjs';

const validateVersions = async ({ workspace, argv }) => {
    const { saveError, logErrors } = errorFactory({ major: true, minor: true, patch: true });
    const localBar = new ProgressBar('Checking dependency versions [:bar] :percent', {
        total: workspace.getPackageCount(),
    });
    const mismatchPeer = workspace
        .getDependencies()
        .filter((dependency) => dependency.getVersions({ peer: true, dep: false, dev: false }).length > 1);
    const mismatchUsage = workspace
        .getDependencies()
        .filter((dependency) => dependency.getVersions({ peer: false, dep: true, dev: true }).length > 1);

    const mapper = (filter, note) => async (dependency) => {
        const versions = dependency.getVersions(filter);
        if (argv.fix) {
            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'version',
                    message: `Which version should "${dependency.name}" be on ${note}?`,
                    choices: versions.map(({ version, count }) => ({
                        name: `${version} (${count} usages)`,
                        value: version,
                    })),
                },
            ]);

            // todo: validate peerDeps met
            // probably not here as we would need to ignore the version being updated
            // const peerDependencyErrors = dependency.peerDependencyErrors({ peerVersion: answers.version });
            // const dependencyErrors = dependency.peerDependencyErrors({ depVersion: answers.version });

            dependency.updateVersion(answers.version, filter);

            localBar.tick();
        } else {
            warning(`${dependency.name} ${note}`);
            versions.forEach(({ version, count }) => {
                log(`        - ${version}: has ${count} usages.`);
            });
        }
    };

    // ask for one version at a time!
    await pMap(mismatchUsage, mapper({ peer: false, dep: true, dev: true }, '(dev/dependencies)'), {
        concurrency: 1,
    });
    await pMap(mismatchPeer, mapper({ peer: true, dep: false, dev: false }, '(peerDependencies)'), {
        concurrency: 1,
    });
    localBar.terminate();

    // commit changes
    let packagesWithChanges = 0;
    let depsChanges = 0;
    await workspace.getChanges({ commit: argv.fix }, (change) => {
        if (change.type === 'package') packagesWithChanges += 1;
        if (change.type === 'dependency') depsChanges += 1;
        saveError(change);
    });
    const hasErrors = logErrors();

    if (mismatchUsage.length === 0) {
        success(`Found ${mismatchUsage.length} dependency versions to update`);
    } else if (argv.fix) {
        success(`Updated ${depsChanges} dependency versions in ${packagesWithChanges} packages`);
    } else if (argv.fail) {
        error(`Found ${mismatchUsage.length} dependency versions to update`);
    } else {
        warning(`Found ${mismatchUsage.length} dependency versions to update`);
    }

    return { hasErrors };
};

export default validateVersions;
