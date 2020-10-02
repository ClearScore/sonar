const packageJson = require('package-json');

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
    canary: '',
    ...opts,
});

jest.mock('package-json');

describe('map-versions', () => {
    beforeEach(() => {});
    afterEach(() => {
        jest.resetModules();
    });

    describe('internal dependencies', () => {
        beforeEach(async () => {
            testJson = setTestJson();
            packageJson.mockResolvedValue({ versions: { '1.1.1': {} }, 'dist-tags': { latest: '1.1.1' } });
        });
        describe('patch: true', () => {
            beforeEach(() => {
                testOptions = setTestOptions({ internal: true, deps: true, patch: true });
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
                testOptions = setTestOptions({ internal: true, deps: true, minor: true });
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
                testOptions = setTestOptions({ internal: true, deps: true, major: true });
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

    describe('canary:', () => {
        beforeEach(async () => {
            testJson = setTestJson();
            packageJson.mockResolvedValue({
                versions: { '1.1.1': {}, '1.2.0-my-canary': {} },
                'dist-tags': { latest: '1.1.1', 'my-canary': '1.2.0-my-canary' },
            });
            testOptions = setTestOptions({ internal: true, deps: true, canary: 'my-canary' });
        });
        it('updates deps with a patch-wildcard', async () => {
            testJson = setTestJson({
                dependencies: {
                    '@clearscore/canary-wild-card-patch': '0.0.x',
                    '@clearscore/canary-wild-card-patch2': '1.0.x',
                    '@clearscore/canary-wild-card-patch3': '1.1.x',
                },
            });
            const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
            expect(updated.dependencies['@clearscore/canary-wild-card-patch']).toEqual('1.2.x'); // completely update due to a major bump
            expect(updated.dependencies['@clearscore/canary-wild-card-patch2']).toEqual('1.2.x'); // not update due to a minor bump
            expect(updated.dependencies['@clearscore/canary-wild-card-patch3']).toEqual('1.2.x'); // not update due to no bump
            expect(updated.devDependencies).toEqual(testJson.devDependencies);
            expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
        });
        it('updates deps with a minor-wildcard', async () => {
            testJson = setTestJson({
                dependencies: {
                    '@clearscore/canary-minor-wild-card-patch': '0.x',
                    '@clearscore/canary-minor-wild-card-patch2': '1.x',
                },
            });
            const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
            expect(updated.dependencies['@clearscore/canary-minor-wild-card-patch']).toEqual('1.x');
            expect(updated.dependencies['@clearscore/canary-minor-wild-card-patch2']).toEqual('1.x');
            expect(updated.devDependencies).toEqual(testJson.devDependencies);
            expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
        });
        it('updates deps with a tilda-wildcard ~', async () => {
            testJson = setTestJson({
                dependencies: {
                    '@clearscore/canary-tilda-patch': '~0.0.0',
                    '@clearscore/canary-tilda-patch2': '~1.0.0',
                    '@clearscore/canary-tilda-patch3': '~1.1.0',
                },
            });
            const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
            expect(updated.dependencies['@clearscore/canary-tilda-patch']).toEqual('~1.2.0-my-canary');
            expect(updated.dependencies['@clearscore/canary-tilda-patch2']).toEqual('~1.2.0-my-canary');
            expect(updated.dependencies['@clearscore/canary-tilda-patch3']).toEqual('~1.2.0-my-canary');
            expect(updated.devDependencies).toEqual(testJson.devDependencies);
            expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
        });
        it('updates deps with a hat-wildcard ^', async () => {
            testJson = setTestJson({
                dependencies: {
                    '@clearscore/canary-har-patch': '^0.0.0',
                    '@clearscore/canary-har-patch2': '^1.0.0',
                    '@clearscore/canary-har-patch3': '^1.1.0',
                },
            });
            const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
            expect(updated.dependencies['@clearscore/canary-har-patch']).toEqual('^1.2.0-my-canary'); // completely update due to a major bump
            expect(updated.dependencies['@clearscore/canary-har-patch2']).toEqual('^1.2.0-my-canary'); // not update due to a minor bump
            expect(updated.dependencies['@clearscore/canary-har-patch3']).toEqual('^1.2.0-my-canary'); // not update due to a patch bump
            expect(updated.devDependencies).toEqual(testJson.devDependencies);
            expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
        });
        it('updates the patch version if the deps are pinned and there has been a patch update', async () => {
            testJson = setTestJson({
                dependencies: {
                    '@clearscore/canary-pinned-patch1': '~0.0.0',
                    '@clearscore/canary-pinned-patch2': '~1.0.0',
                    '@clearscore/canary-pinned-patch3': '~1.1.0',
                    '@clearscore/canary-pinned-patch4': '^0.0.0',
                    '@clearscore/canary-pinned-patch5': '^1.0.0',
                    '@clearscore/canary-pinned-patch6': '^1.1.0',
                    '@clearscore/canary-pinned-patch7': '0.0.x',
                    '@clearscore/canary-pinned-patch8': '1.0.x',
                    '@clearscore/canary-pinned-patch9': '1.1.x',
                    '@clearscore/canary-pinned-patch10': '0.x',
                    '@clearscore/canary-pinned-patch11': '1.x',
                    '@clearscore/canary-pinned-patch12': '1.x',
                    '@clearscore/canary-pinned-patch13': '0.0.0',
                    '@clearscore/canary-pinned-patch14': '1.0.0',
                    '@clearscore/canary-pinned-patch15': '1.1.0',
                },
            });
            const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);
            expect(updated.dependencies).toEqual({
                ...testJson.dependencies,
                '@clearscore/canary-pinned-patch15': '1.2.0-my-canary', // only this dependency should be updated
            });
            expect(updated.devDependencies).toEqual(testJson.devDependencies);
            expect(updated.peerDependencies).toEqual(testJson.peerDependencies);
        });
    });

    describe('pattern', () => {
        beforeEach(async () => {
            packageJson.mockResolvedValue({ versions: { '1.1.1': {} }, 'dist-tags': { latest: '1.1.1' } });
        });

        it('should use pattern if it is provided', async () => {
            testJson = setTestJson({
                dependencies: {
                    '@clearscore/pattern-a-test': '0.0.0',
                    '@clearscore/pattern-a-test-2': '1.0.0',
                    '@clearscore/pattern-a-foo': '0.0.0',
                    '@clearscore/pattern-a-bar': '1.0.0',
                    '@clearscore/pattern-a-baz': '1.1.0',
                },
            });
            testOptions = setTestOptions({
                pattern: '@clearscore/pattern-a-test',
                patch: true,
                internal: true,
                minor: true,
                major: true,
                deps: true,
            });
            const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);

            expect(updated.dependencies['@clearscore/pattern-a-test']).toEqual('1.1.1');
            expect(updated.dependencies['@clearscore/pattern-a-test-2']).toEqual('1.1.1');
        });

        it('should handle multiple patterns', async () => {
            testOptions = setTestOptions({
                patch: true,
                internal: true,
                minor: true,
                major: true,
                deps: true,
                pattern: '@clearscore/pattern-multiple-(test|foo|bar)',
            });

            testJson = setTestJson({
                dependencies: {
                    '@clearscore/pattern-multiple-test': '0.0.0',
                    '@clearscore/pattern-multiple-test-2': '1.0.0',
                    '@clearscore/pattern-multiple-foo': '0.0.0',
                    '@clearscore/pattern-multiple-bar': '1.0.0',
                    '@clearscore/pattern-multiple-baz': '1.1.0',
                },
            });
            const updated = await updateVersions(testJson, (_) => _, testOptions, mockBar);

            expect(updated.dependencies['@clearscore/pattern-multiple-test']).toEqual('1.1.1');
            expect(updated.dependencies['@clearscore/pattern-multiple-test-2']).toEqual('1.1.1');
            expect(updated.dependencies['@clearscore/pattern-multiple-foo']).toEqual('1.1.1');
            expect(updated.dependencies['@clearscore/pattern-multiple-bar']).toEqual('1.1.1');
            expect(updated.dependencies['@clearscore/pattern-multiple-baz']).toEqual('1.1.0');
        });
    });

    describe('implied pattern', () => {
        beforeEach(async () => {
            packageJson.mockResolvedValue({ versions: { '1.1.1': {} }, 'dist-tags': { latest: '1.1.1' } });
        });
        it('should use pattern if it is provided', async () => {
            testOptions = setTestOptions({
                _: ['implied-pattern-test'],
                patch: true,
                internal: true,
                minor: true,
                major: true,
                deps: true,
            });
            const updated = await updateVersions(
                {
                    dependencies: {
                        '@clearscore/implied-pattern-test': '0.0.0',
                        '@clearscore/implied-pattern-test-2': '1.0.0',
                    },
                },
                (_) => _,
                testOptions,
                mockBar,
            );

            expect(updated.dependencies['@clearscore/implied-pattern-test']).toEqual('1.1.1');
            expect(updated.dependencies['@clearscore/implied-pattern-test-2']).toEqual('1.1.1');
        });

        it('should handle multiple patterns', async () => {
            testOptions = setTestOptions({
                patch: true,
                internal: true,
                minor: true,
                major: true,
                deps: true,
                _: ['@clearscore/implied-multiple-(test|foo|bar)'],
            });

            testJson = setTestJson({
                dependencies: {
                    '@clearscore/implied-multiple-test': '0.0.0',
                    '@clearscore/implied-multiple-test2': '1.0.0',
                    '@clearscore/implied-multiple-foo': '0.0.0',
                    '@clearscore/implied-multiple-bar': '1.0.0',
                    '@clearscore/implied-multiple-baz': '1.1.0',
                },
            });
            const updated = await updateVersions(testJson, (arg1) => arg1, testOptions, mockBar);

            expect(updated.dependencies['@clearscore/implied-multiple-test']).toEqual('1.1.1');
            expect(updated.dependencies['@clearscore/implied-multiple-test2']).toEqual('1.1.1');
            expect(updated.dependencies['@clearscore/implied-multiple-foo']).toEqual('1.1.1');
            expect(updated.dependencies['@clearscore/implied-multiple-bar']).toEqual('1.1.1');
            expect(updated.dependencies['@clearscore/implied-multiple-baz']).toEqual('1.1.0');
        });
    });
});
