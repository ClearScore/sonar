module.exports = {
    '*.js': ['eslint --cache --fix', 'git add', 'yarn test --bail --findRelatedTests'],
    '*.{js,json,css,md}': ['prettier --write', 'git add'],
};
