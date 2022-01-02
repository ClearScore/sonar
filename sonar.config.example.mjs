export default {
    // used in 'sonar update'
    ignoreScopes: ['@not-published'],
    internalScopes: ['@clearscore', '@clearscore-tools', '@clearscore-verticals'],
    groups: {
        lint: '^eslint(.*)?',
    },

    // used in 'sonar validate --unused'
    ignoreUnusedInPackages: ['@clearscore/dummy-package'],
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
