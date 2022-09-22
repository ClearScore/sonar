export default {
    testRegex: '\\.test\\.js',
    testEnvironmentOptions: {
        url: 'http://localhost',
    },
    setupFiles: [],
    coverageDirectory: './.reports/coverage',
    collectCoverage: false,
    reporters: ['default', 'jest-junit'],
    roots: ['<rootDir>'],
    collectCoverageFrom: ['src/**/*.js', 'src/**/*.mjs'],
    testPathIgnorePatterns: [],
    moduleNameMapper: {},
    resetMocks: true,
    resetModules: true,
    restoreMocks: true,
};
