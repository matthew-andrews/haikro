haikro [![Build Status](https://travis-ci.org/matthew-andrews/haikro.svg?branch=test)](https://travis-ci.org/matthew-andrews/haikro)
======

A tool to make + deploy node apps as self contained tarballs to Heroku.  [Read the explainer on my blog.](https://mattandre.ws/2014/11/haikro-heroku-deloys-node-js/)

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
	@haikro build deploy \
		--app $(app) \
		--heroku-token $(HEROKU_AUTH_TOKEN) \
		--commit `git rev-parse HEAD`
```

Where `HEROKU_AUTH_TOKEN` is:
```sh
heroku auth:token
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

Note: Haikro is also tested with [codeship.io](https://codeship.io).

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
- `--region` - Which region to create app in (when used with `haikro create`)
- `--organization` - Which organization to create app in (when used with `haikro create`)
- `--commit` - free text used to identify a release
- `--heroku-token` - Heroku auth token
- `--process-type` - Desired process type for Heroku app, defaults to `web`
- `--silent` - displays no debug info
- `--verbose` - displays lot of debug info

# Licence
This software is published by the Financial Times under the [MIT licence](http://opensource.org/licenses/MIT).
