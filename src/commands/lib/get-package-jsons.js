const FileHound = require('filehound');
const jsonfile = require('jsonfile');
const pMap = require('p-map');

module.exports = ({ folder }) =>
    FileHound.create()
        .paths(folder)
        .discard('node_modules')
        .ignoreHiddenDirectories()
        .ignoreHiddenFiles()
        .match('package.json')
        .find()
        .then((paths) => {
            const jsonFiles = paths.map((path) => jsonfile.readFile(path));
            return pMap(jsonFiles, (file, index) => ({ path: paths[index], file }), { concurrency: 25 });
        });
