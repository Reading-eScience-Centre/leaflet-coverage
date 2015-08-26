# Development guide

## Getting started

First, install [Node.js](https://nodejs.org/download/).

Then, install JSPM globally:
```
$ npm install jspm/jspm-cli -g
```

Now, clone this repository and run the following in a shell in the checked out folder:
```
$ npm install
$ jspm install
```

This installs all (development) dependencies in local subfolders.
It can be run at any time should the versions in the package.json change.

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

## Building a bundle

A stand-alone bundle can be created with:
```
$ npm run build
```
This will build a bundle.js file in the root project folder.

## Code style

The [JavaScript Standard Style](http://standardjs.com) is used in this project.
Conformance can be checked with:
```
$ npm run style
```

