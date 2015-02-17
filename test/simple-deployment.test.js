'use strict';

// Test stuff
var assert = require("assert");

// Promise stuff
require('es6-promise').polyfill();
require('isomorphic-fetch');
var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var promiseToWait = require('./promise-to-wait');

// Haikro stuff
var logger = require('../lib/logger');
logger.setLevel('debug');
var create = require('../lib/create');
var destroy = require('../lib/destroy');
var build = require('../lib/build');
var deploy = require('../lib/deploy');

describe('simple deployment', function() {
	it('can create, deploy and delete an app', function(done) {
		this.timeout(120 * 1000);
		var app, token, project = __dirname + '/fixtures/simple-app';

		(process.env.HEROKU_AUTH_TOKEN ? Promise.resolve(process.env.HEROKU_AUTH_TOKEN) : exec('heroku auth:token'))
			.then(function(result) {
				token = result;
				return build({ project: project });
			})
			.then(function() {
				return create({ token: token });
			})
			.then(function(name) { app = name; })
			.then(function() {
				return deploy({
					app: app,
					token: token,
					project: project
				});
			})

			// HACK - Give Heroku a second or two to sort itself out
			.then(promiseToWait(4))
			.then(function() {
				return fetch('https://' + app + '.herokuapp.com/');
			})
			.then(function(response) {
				assert.equal(200, response.status);
				return response.text();
			})
			.then(function(body) {
					console.log(body);
				assert(/the simplest webserver in the world/.test(body), "Body should contain 'the simplest webserver in the world'");
				assert(/dep:this file should be here/.test(body), "Body should contain 'dep:this file should be here'");
			})
			.then(function() {
				return destroy({
					token: token,
					app: app
				});
			})
			.then(done.bind(this, null))
			.catch(done);
	});

	it('can create, deploy and delete an app, automatically removing dev dependencies', function(done) {
		this.timeout(120 * 1000);
		var app, token, project = __dirname + '/fixtures/simple-app';

		(process.env.HEROKU_AUTH_TOKEN ? Promise.resolve(process.env.HEROKU_AUTH_TOKEN) : exec('heroku auth:token'))
				.then(function(result) {
					token = result;
					return build({ project: project, prune:true });
				})
				.then(function() {
					return create({ token: token });
				})
				.then(function(name) { app = name; })
				.then(function() {
					return deploy({
						app: app,
						token: token,
						project: project
					});
				})

			// HACK - Give Heroku a second or two to sort itself out
				.then(promiseToWait(4))
				.then(function() {
					return fetch('https://' + app + '.herokuapp.com/');
				})
				.then(function(response) {
					assert.equal(200, response.status);
					return response.text();
				})
				.then(function(body) {
					console.log(body);
					assert(/the simplest webserver in the world/.test(body), "Body should contain 'the simplest webserver in the world'");
					assert(/dep:this file should be here/.test(body), "Body should contain 'dep:this file should be here'");
					assert(/devDep:this file wasn't here/.test(body), "Body should contain 'devDep:this file wasn't here'");
				})
				.then(function() {
					return destroy({
						token: token,
						app: app
					});
				})
				.then(done.bind(this, null))
				.catch(done);
	});
});
