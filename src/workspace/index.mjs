import FileHound from 'filehound';
import ProgressBar from 'progress';

import { log, branding } from './lib/log.mjs';
import Workspace from './classes/workspace.mjs';

export default ({ folder }) => {
    let wsBar;
    log(`Creating Workspaces`);

    return FileHound.create()
        .paths(folder)
        .discard(['node_modules', '.yarn', 'dist'])
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
