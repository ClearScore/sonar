# Publishing a Sonar Update

> Don't forget to manually bump the package.json version number using sem-ver, commit and push to the repo

```shell
npm login
```
^ this will prompt for a username e.g. `peter.mouland`, password and email address


```shell
npm publish --@clearscore:https://clearscoredev.jfrog.io/clearscoredev/api/npm/npm/
npm publish --@clearscore:registry=https://registry.npmjs.org
```
