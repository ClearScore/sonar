const latestVersion = require('latest-version');

const { updateVersions } = require('./update-versions');
const mockPackageJson = require('../test-resources/mock-package-json.json');

const mockBar = { tick: jest.fn() };
let testJson = {};
const setTestJson = ({ dependencies, devDependencies, peerDependencies } = {}) => ({
    ...mockPackageJson,
    dependencies: { ...mockPackageJson.dependencies, ...dependencies },
    devDependencies: { ...mockPackageJson.devDependencies, ...devDependencies },
    peerDependencies: { ...mockPackageJson.peerDependencies, ...peerDependencies },
});
let testOptions = {};
const setTestOptions = (opts) => ({
    internalScopes: ['@clearscore'],
    internal: false,
    external: false,
    deps: false,
    devDeps: false,
    patch: false,
    minor: false,
    major: false,
    pattern: '',
    ...opts,
});

jest.mock('latest-version');

describe('map-versions', () => {
    beforeEach(async () => {
        testJson = setTestJson();
        await latestVersion.mockResolvedValue('1.1.1');
    });
    describe('internal', () => {
        beforeEach(() => {
            testOptions = setTestOptions({ internal: true });
        });
        describe('dependencies', () => {
            beforeEach(() => {
                testOptions = setTestOptions({ ...testOptions, deps: true });
            });
            describe('patch: true', () => {
                beforeEach(() => {
                    testOptions = setTestOptions({ ...testOptions, patch: true });
                });
                it('has no affect on deps with a patch-wildcard', async () => {
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch': '0.0.x',
                            '@clearscore/wild-card-patch2': '1.0.x',
                            '@clearscore/wild-card-patch3': '1.1.x',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('0.0.x');
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('1.0.x');
                    expect(updated.dependencies['@clearscore/wild-card-patch3']).toEqual('1.1.x');
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('has no affect on deps with a minor-wildcard', async () => {
                    testJson = setTestJson({
                        dependencies: { '@clearscore/wild-card-patch': '0.x', '@clearscore/wild-card-patch2': '1.x' },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('0.x');
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('1.x');
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('has no affect on deps with a tilda-wildcard ~', async () => {
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch': '~0.0.0',
                            '@clearscore/wild-card-patch2': '~1.0.0',
                            '@clearscore/wild-card-patch3': '~1.1.0',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('~0.0.0');
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('~1.0.0');
                    expect(updated.dependencies['@clearscore/wild-card-patch3']).toEqual('~1.1.0');
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('has no affect on deps with a hat-wildcard ^', async () => {
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch': '^0.0.0',
                            '@clearscore/wild-card-patch2': '^1.0.0',
                            '@clearscore/wild-card-patch3': '^1.1.0',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('^0.0.0');
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('^1.0.0');
                    expect(updated.dependencies['@clearscore/wild-card-patch3']).toEqual('^1.1.0');
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('updates the patch version if the deps are pinned and there has been a patch update', async () => {
                    await latestVersion.mockResolvedValue('1.1.1');
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch1': '~0.0.0',
                            '@clearscore/wild-card-patch2': '~1.0.0',
                            '@clearscore/wild-card-patch3': '~1.1.0',
                            '@clearscore/wild-card-patch4': '^0.0.0',
                            '@clearscore/wild-card-patch5': '^1.0.0',
                            '@clearscore/wild-card-patch6': '^1.1.0',
                            '@clearscore/wild-card-patch7': '0.0.x',
                            '@clearscore/wild-card-patch8': '1.0.x',
                            '@clearscore/wild-card-patch9': '1.1.x',
                            '@clearscore/wild-card-patch10': '0.x',
                            '@clearscore/wild-card-patch11': '1.x',
                            '@clearscore/wild-card-patch12': '1.x',
                            '@clearscore/wild-card-patch13': '0.0.0',
                            '@clearscore/wild-card-patch14': '1.0.0',
                            '@clearscore/wild-card-patch15': '1.1.0',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies).toEqual({
                        ...testJson.dependencies,
                        '@clearscore/wild-card-patch15': '1.1.1', // only this dependency should be updated
                    });
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
            });
            describe('minor: true', () => {
                beforeEach(() => {
                    testOptions = setTestOptions({ ...testOptions, minor: true });
                });
                it('should update deps with a patch-wildcard', async () => {
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch': '0.0.x',
                            '@clearscore/wild-card-patch2': '1.0.x',
                            '@clearscore/wild-card-patch3': '1.1.x',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('0.0.x');
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('1.1.x');
                    expect(updated.dependencies['@clearscore/wild-card-patch3']).toEqual('1.1.x');
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('should update deps with a tilda-wildcard ~', async () => {
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch': '~0.0.0',
                            '@clearscore/wild-card-patch2': '~1.0.0',
                            '@clearscore/wild-card-patch3': '~1.1.0',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('~0.0.0');
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('~1.1.1');
                    expect(updated.dependencies['@clearscore/wild-card-patch3']).toEqual('~1.1.0');
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('has no affect on deps with a minor-wildcard', async () => {
                    testJson = setTestJson({
                        dependencies: { '@clearscore/wild-card-patch': '0.x', '@clearscore/wild-card-patch2': '1.x' },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('0.x');
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('1.x');
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('has no affect on deps with a hat-wildcard ^', async () => {
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch': '^0.0.0',
                            '@clearscore/wild-card-patch2': '^1.0.0',
                            '@clearscore/wild-card-patch3': '^1.1.0',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('^0.0.0');
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('^1.0.0');
                    expect(updated.dependencies['@clearscore/wild-card-patch3']).toEqual('^1.1.0');
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('updates the minor version if the deps are pinned', async () => {
                    await latestVersion.mockResolvedValue('1.1.1');
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch1': '~0.0.0',
                            '@clearscore/wild-card-patch2': '~1.0.0',
                            '@clearscore/wild-card-patch3': '~1.1.0',
                            '@clearscore/wild-card-patch4': '^0.0.0',
                            '@clearscore/wild-card-patch5': '^1.0.0',
                            '@clearscore/wild-card-patch6': '^1.1.0',
                            '@clearscore/wild-card-patch7': '0.0.x',
                            '@clearscore/wild-card-patch8': '1.0.x',
                            '@clearscore/wild-card-patch9': '1.1.x',
                            '@clearscore/wild-card-patch10': '0.x',
                            '@clearscore/wild-card-patch11': '1.x',
                            '@clearscore/wild-card-patch12': '1.x',
                            '@clearscore/wild-card-patch13': '0.0.0',
                            '@clearscore/wild-card-patch14': '1.0.0',
                            '@clearscore/wild-card-patch15': '1.1.0',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies).toEqual({
                        ...testJson.dependencies,
                        '@clearscore/wild-card-patch14': '1.1.1', // only this dependency should be updated
                    });
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
            });
            describe('major: true', () => {
                beforeEach(() => {
                    testOptions = setTestOptions({ ...testOptions, major: true });
                });
                it('updates deps with a patch-wildcard', async () => {
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch': '0.0.x',
                            '@clearscore/wild-card-patch2': '1.0.x',
                            '@clearscore/wild-card-patch3': '1.1.x',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('1.1.x'); // completely update due to a major bump
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('1.0.x'); // not update due to a minor bump
                    expect(updated.dependencies['@clearscore/wild-card-patch3']).toEqual('1.1.x'); // not update due to no bump
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('updates deps with a minor-wildcard', async () => {
                    testJson = setTestJson({
                        dependencies: { '@clearscore/wild-card-patch': '0.x', '@clearscore/wild-card-patch2': '1.x' },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('1.x');
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('1.x');
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('updates deps with a tilda-wildcard ~', async () => {
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch': '~0.0.0',
                            '@clearscore/wild-card-patch2': '~1.0.0',
                            '@clearscore/wild-card-patch3': '~1.1.0',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('~1.1.1');
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('~1.0.0');
                    expect(updated.dependencies['@clearscore/wild-card-patch3']).toEqual('~1.1.0');
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('updates deps with a hat-wildcard ^', async () => {
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch': '^0.0.0',
                            '@clearscore/wild-card-patch2': '^1.0.0',
                            '@clearscore/wild-card-patch3': '^1.1.0',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies['@clearscore/wild-card-patch']).toEqual('^1.1.1'); // completely update due to a major bump
                    expect(updated.dependencies['@clearscore/wild-card-patch2']).toEqual('^1.0.0'); // not update due to a minor bump
                    expect(updated.dependencies['@clearscore/wild-card-patch3']).toEqual('^1.1.0'); // not update due to a patch bump
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
                it('updates the patch version if the deps are pinned and there has been a patch update', async () => {
                    await latestVersion.mockResolvedValue('1.1.1');
                    testJson = setTestJson({
                        dependencies: {
                            '@clearscore/wild-card-patch1': '~0.0.0',
                            '@clearscore/wild-card-patch2': '~1.0.0',
                            '@clearscore/wild-card-patch3': '~1.1.0',
                            '@clearscore/wild-card-patch4': '^0.0.0',
                            '@clearscore/wild-card-patch5': '^1.0.0',
                            '@clearscore/wild-card-patch6': '^1.1.0',
                            '@clearscore/wild-card-patch7': '0.0.x',
                            '@clearscore/wild-card-patch8': '1.0.x',
                            '@clearscore/wild-card-patch9': '1.1.x',
                            '@clearscore/wild-card-patch10': '0.x',
                            '@clearscore/wild-card-patch11': '1.x',
                            '@clearscore/wild-card-patch12': '1.x',
                            '@clearscore/wild-card-patch13': '0.0.0',
                            '@clearscore/wild-card-patch14': '1.0.0',
                            '@clearscore/wild-card-patch15': '1.1.0',
                        },
                    });
                    const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
                    expect(updated.dependencies).toEqual({
                        ...testJson.dependencies,
                        '@clearscore/wild-card-patch15': '1.1.0', // only this dependency should be updated
                    });
                    expect(updated.devDependencies).toEqual(testJson.devDependencies);
                    expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
                });
            });
        });
    });
});
