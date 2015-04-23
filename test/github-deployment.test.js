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
var ghDeploy = require('../lib/gh-deploy');

describe('github deployment', function() {
	it('can create, deploy and delete an app [warning: can take over 20s]', function(done) {
		this.timeout(240 * 1000);
		var app, token, project = __dirname + '/fixtures/simple-app';

		(process.env.HEROKU_AUTH_TOKEN ? Promise.resolve(process.env.HEROKU_AUTH_TOKEN) : exec('heroku auth:token'))
			.then(function(result) {
				token = result;
			})
			.then(function() {
				return create({ token: token, organization: 'Financial-Times' });
			})
			.then(function(name) { app = name; })
			.then(function() {
				return ghDeploy({
					app: app,
					tag: 'v1.0.4',
					token: token,
					project: project,
					repository: 'matthew-andrews/haikro-simple-app'
				});
			})
			.then(function() { logger.warn("going to sleep for 60 seconds"); })

			// HACK - Give Heroku a few seconds to sort itself out
			.then(promiseToWait(60))
			.then(function() {
				return fetch('https://' + app + '.herokuapp.com/');
			})
			.then(function(response) {
				assert.equal(200, response.status);
				return response.text();
			})
			.then(function(body) {
				assert(/the simplest webserver in the world/.test(body));
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
