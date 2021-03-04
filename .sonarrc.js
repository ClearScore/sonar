module.exports = {
    ignoreScopes: ['@not-published'],
    internalScopes: ['@clearscore'],
    groups: {
        lint: '^eslint(.*)?',
    },
    devPatterns: [
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
    depCheckConfig: {
        ignoreMatches: ['jest-junit', '@commitlint/config-conventional'],
        ignorePatterns: ['dist', 'build'],
    },
};
