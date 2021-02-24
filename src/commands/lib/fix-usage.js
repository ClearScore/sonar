const jsonfile = require('jsonfile');

const fixMissingDeps = async (packageDir, missing) => {
    const packageContents = await jsonfile.readFile(packageDir);

    const newPackageDeps = {
        ...(packageContents.dependencies || {}),
        ...missing,
    };

    packageContents.dependencies = Object.keys(newPackageDeps)
        .sort()
        .reduce(
            (prev, depName) => ({
                ...prev,
                [depName]: newPackageDeps[depName],
            }),
            {},
        );

    await jsonfile.writeFile(packageDir, packageContents, { spaces: 2 });
};

const fixUnusedDeps = async (packageDir, depType, unusedDevDeps) => {
    const packageContents = await jsonfile.readFile(packageDir);

    unusedDevDeps.forEach((devDep) => {
        delete packageContents[depType][devDep];
    });

    await jsonfile.writeFile(packageDir, packageContents, { spaces: 2 });
};

exports.fixMissingDeps = fixMissingDeps;
exports.fixUnusedDeps = fixUnusedDeps;
