module.exports = {
    patch: true,
    minor: true,
    major: false,
    deps: true,
    devDeps: true,
    peerDeps: true,
    ignoreScopes: ['@not-published'],
    internalScopes: ['@clearscore'],
    groups: {
        lint: '^eslint(.*)?',
    },
    depCheckConfig: {
        ignoreMatches: ['jest-junit', '@commitlint/config-conventional'],
        ignorePattern: [
            'dist',
            '__mock__/*',
            'mock/*',
            '*.test.js',
            '*.spec.js',
            '*.stories.js',
            'tests',
            'test-resources',
            'cypress',
            'storybook',
        ],
    },
};
