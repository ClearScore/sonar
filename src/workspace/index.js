const FileHound = require('filehound');
const ProgressBar = require('progress');

const { log, branding } = require('./lib/log');
const Workspace = require('./classes/workspace');

module.exports = ({ folder }) => {
    let wsBar;
    log(`Creating Workspaces`);

    return FileHound.create()
        .paths(folder)
        .discard('node_modules')
        .ignoreHiddenDirectories()
        .ignoreHiddenFiles()
        .match('package.json')
        .find()
        .then(async (paths) => {
            wsBar = new ProgressBar(`${branding} Registering Workspace packages (:total) [:bar] :percent`, {
                total: paths.length,
            });
            const workspace = new Workspace(paths);
            await workspace.init({ onRegister: () => wsBar.tick() });
            wsBar.terminate();
            return workspace;
        });
};
