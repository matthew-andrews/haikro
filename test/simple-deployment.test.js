'use strict';

// Test stuff
var assert = require("assert");

// Util type shiz
var makeAppNameSuffix = require('./makeAppNameSuffix');

// Promise stuff
require('es6-promise').polyfill();
require('isomorphic-fetch');
var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var promiseToWait = require('./promise-to-wait');

var create = require('../lib/create');
var destroy = require('../lib/destroy');
var build = require('../lib/build');
var deploy = require('../lib/deploy');
var scale = require('../lib/scale');
var updateConfig = require('../lib/config-vars');
var processProfiles = {
							updates:[{
								"process":"web",
								"quantity":2,
								"size":"1X"
							},
							{
								"process":"worker",
								"quantity":1,
								"size":"2X"
							}]
						};

describe('simple deployment', function () {
	it('can create, deploy and delete an app', function(done) {
		this.timeout(120 * 1000);
		var app, token, project = __dirname + '/fixtures/simple-app';

		var appName = 'haikro-' + require(project + '/package.json').name + '-' + makeAppNameSuffix();

		(process.env.HEROKU_AUTH_TOKEN ? Promise.resolve(process.env.HEROKU_AUTH_TOKEN) : exec('heroku auth:token'))
			.then(function(result) {
				token = result;
				return build({ project: project });
			})
			.then(function() {
				return create({ token: token, organization: 'financial-times', app: appName });
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
			.then(function () {
				return scale({
					app: appName,
					token: token,
					processProfiles: processProfiles
				});
			})
			.then(function () {
				return updateConfig({
					app: appName,
					token: token,
					configVars: {					
						"APP_NAME": appName
					}
				});
			})
			.then(promiseToWait(15))
			.then(function() {
				return fetch('https://' + app + '.herokuapp.com/');
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
				return destroy({
					token: token,
					app: app
				});
			})
			.then(done.bind(this, null))
			.catch(done);
	});
});
