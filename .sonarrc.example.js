module.exports = {
    internal: true,
    external: false,
    syncRemote: false,
    syncLocal: true,
    bump: false,
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
