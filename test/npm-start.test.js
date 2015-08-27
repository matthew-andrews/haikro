'use strict';

// Test stuff
var assert = require("assert");

require('isomorphic-fetch');
var shellpromise = require('shellpromise');
var promiseToWait = require('./tools/promise-to-wait');

var create = require('../lib/create');
var destroy = require('../lib/destroy');
var build = require('../lib/build');
var deploy = require('../lib/deploy');

describe('simple deployment', function() {
	it('can run apps without Procfiles, falling back to npm start instead', function(done) {
		this.timeout(120 * 1000);
		var app, token, project = __dirname + '/fixtures/npm-start';

		shellpromise('heroku auth:token')
			.then(function(result) {
				token = result;
				return build({ project: project });
			})
			.then(function() {
				return create({ token: token, organization: 'financial-times' });
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
				assert(/the simplest webserver in the bin/.test(body));
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
