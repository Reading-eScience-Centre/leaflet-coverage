# Development guide

## Getting started

First, install [Node.js](https://nodejs.org/download/).

Now, clone this repository and run the following in a shell in the checked out folder:
```
$ npm install
```

This installs all (development) dependencies in local subfolders.
It can be run at any time should the versions in the package.json change.

If you need to use the `jspm` CLI, install it globally:
```
$ npm install jspm/jspm-cli -g
```

## Running tests

Simply run:
```
$ npm test
```

This tests the library with Firefox and Chrome which will get started for that purpose.

Tests can be automatically re-run on file changes. For that, instead start the long-running
test runner:
```
$ npm run karma
```
and minimize the browser windows that popped up. Test output will appear in the shell.

## Building a classic bundle

A stand-alone bundle that extends Leaflet's L object can be created with:
```
$ npm run build
```
This will build the leaflet-coverage.{src|min}.js files in the root project folder.

Note that currently all dependencies except Leaflet are included in the bundle.

## Publishing a new version

1. Raise the version number in package.json.
2. Create a semver git tag (`x.y.z`) and push it.
3. Run `npm publish`.
4. Attach the `leaflet-coverage.{src|min}.js` files to the GitHub release.

The last two steps build and publish the classic bundle to the npm registry.
*TODO This project is registered on http://www.jsdelivr.com such that on every new
npm release, the bundle is made available automatically on the jsDelivr CDN.*

Note that the git tag alone is enough to make a new version usable via the JSPM CDN.
The publishing step on npm (and therefore jsDelivr) is there to support classic clients
which can't / don't want to use ECMAScript modules yet.

## Code style

The [JavaScript Standard Style](http://standardjs.com) is used in this project.
Conformance can be checked with:
```
$ npm run style
```

