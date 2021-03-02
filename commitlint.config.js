module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'scope-empty': [2, 'never'],
        'scope-enum': [2, 'always', ['repo', 'deps', 'sync', 'validate', 'update']],
        'header-max-length': [0, 'never', 200],
    },
};
