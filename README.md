haikro [![Build Status](https://circleci.com/gh/matthew-andrews/haikro.svg)](https://circleci.com/gh/matthew-andrews/haikro)
======

A tool to make, deploy, scale and destroy node/iojs apps as self contained tarballs to Heroku.  [Read the explainer on my blog.](https://mattandre.ws/2014/11/haikro-heroku-deloys-node-js/)

## Installation

```sh
npm install --save haikro
```

I currently recommend installing **haikro** as a devDependency and you need not run `npm prune --production` as Haikro will effectively do this internally.

## Usage

Example `Makefile`:-

```sh
app := my-deplorable-app

deploy:
	# Clean+install dependencies
	git clean -fxd
	npm install

	# Build steps
	sass styles.scss public/styles.css
	
	# Package+deploy
	@haikro build
	@haikro deploy --app $(app) --commit `git rev-parse HEAD`
```

Example `Procfile`:-

```
web: server/app.js
```

Example `.travis.yml`

```yaml
script:
- npm test
language: node_js
node_js:
- '0.10'
after_success:
- test $TRAVIS_PULL_REQUEST == "false" && test $TRAVIS_BRANCH == "master" && make deploy
```

Example of `package.json`

```json
{
  "name": "My app",
  "version": "1.0.0",
  "engines": {
    "node": "0.10.x"
  }
}
```

If you want to use **iojs** just change your `package.json`'s `engines` to:-

```json
{
  "name": "My app",
  "version": "1.0.0",
  "engines": {
    "iojs": "^1.0.3"
  }
}
```

## CLI Options

- `--app` - Heroku app name
- `--commit` - free text used to identify a release

e.g. `haikro deploy --app my-exciting-app`

# Licence
This software is published by the Financial Times under the [MIT licence](http://opensource.org/licenses/MIT).
