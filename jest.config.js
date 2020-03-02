module.exports = {
    testRegex: '\\.test\\.js$',
    testURL: 'http://localhost',
    setupFiles: [],
    coverageDirectory: './.reports/coverage',
    collectCoverage: false,
    reporters: ['default', 'jest-junit'],
    roots: ['<rootDir>'],
    collectCoverageFrom: ['src/**/*.js'],
    testPathIgnorePatterns: [],
    moduleNameMapper: {},
};
