'use strict';

// Test stuff
var assert = require("assert");

// Util type shiz
var makeAppNameSuffix = require('./make-app-name-suffix');

GLOBAL.fetch = require('node-fetch');
var shellpromise = require('shellpromise');
var promiseToWait = require('./tools/promise-to-wait');

var build = require('../lib/build');
var deploy = require('../lib/deploy');
var create = require('./tools/create');
var destroy = require('./tools/destroy');

describe('simple deployment', function() {
	it('can create, deploy and delete an app', function() {
		this.timeout(120 * 1000);
		var token, project = __dirname + '/fixtures/simple-app';
		var appName = 'haikro-' + require(project + '/package.json').name + '-' + makeAppNameSuffix();

		return shellpromise('heroku auth:token')
			.then(function(result) {
				token = result.trim();
				return build({ project: project });
			})
			.then(function() {
				return create(appName);
			})
			.then(function() {
				return deploy({
					app: appName,
					token: token,
					project: project
				});
			})

			// HACK - Give Heroku a second or two to sort itself out
			.then(promiseToWait(4))
			.then(function() {
				return shellpromise('heroku ps:scale web=2:standard-2X worker=1:standard-1X --app ' + appName, { verbose: true });
			})
			.then(function() {
				return shellpromise('heroku config:set APP_NAME=' + appName + ' --app ' + appName, { verbose: true });
			})
			.then(promiseToWait(20))
			.then(function() {
				return fetch('https://' + appName + '.herokuapp.com/');
			})
			.then(function(response) {
				assert.equal(200, response.status);
				return response.text();
			})
			.then(function(body) {
				assert(/the simplest webserver in the world/.test(body));
				assert(/dep:this file should be here/.test(body));
				assert(/devDep:this file wasn't here/.test(body));
				assert(/worker:yarp/.test(body));
			})
			.then(function() {
				return destroy(appName);
			});
	});
});
