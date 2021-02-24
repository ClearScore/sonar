module.exports = {
    patch: true,
    minor: true,
    major: false,
    deps: true,
    devDeps: true,
    peerDeps: true,
    ignoreScopes: ['@not-published'],
    internalScopes: ['@clearscore', '@clearscore-tools', '@clearscore-verticals'],
    groups: {
        lint: '^eslint(.*)?',
    },
};
