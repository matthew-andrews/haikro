haikro
======

A tool to make + deploy node apps as self contained tarballs to Heroku.

## Installation

```sh
npm install --save haikro
```

I currently recommend installing **haikro** as a normal dependency instead of a `devDependency` even though strictly speaking it shouldn't be used in production to stop it being deleted by `npm prune --production`.

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
	
	# Pre-deploy clean
	npm prune --production

	# Package+deploy
	@./node_modules/.bin/haikro build deploy \
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

Note: Haikro is also tested with [codeship.io](https://codeship.io).

## CLI Options

- `--app` - Heroku app name
- `--commit` - free text used to identify a release
- `--heroku-token` - Heroku auth token
- `--silent` - displays no debug info
- `--verbose` - displays lot of debug info
