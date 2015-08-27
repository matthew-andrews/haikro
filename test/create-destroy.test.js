'use strict';

// Test stuff
var assert = require("assert");

require('isomorphic-fetch');
var shellpromise = require('shellpromise');
var promiseToWait = require('./tools/promise-to-wait');
var create = require('./tools/create');
var destroy = require('./tools/destroy');

describe('create and destroy', function() {
	it('can create and delete an app', function() {
		this.timeout(60 * 1000);
		var app;

		return create()
			.then(function(name) { app = name; })

			// HACK - Give Heroku a second or two to sort itself out
			.then(promiseToWait(2))
			.then(function() {
				return fetch('https://' + app + '.herokuapp.com/');
			})
			.then(function(response) {
				assert.equal(502, response.status);
				return response.text();
			})
			.then(function(body) {
				assert(/Welcome to your new app!/.test(body));
			})
			.then(function() {
				return destroy(app);
			});
	});

	it('can create and delete a named app', function() {
		this.timeout(60 * 1000);
		var app;
		var desiredName = 'ft-haikro-test' + (Date.now() % 10000);

		return create(desiredName)
			.then(function(name) {
				app = name;
				assert(app === desiredName);
			})

			// HACK - Give Heroku a second or two to sort itself out
			.then(promiseToWait(2))
			.then(function() {
				return fetch('https://' + app + '.herokuapp.com/');
			})
			.then(function(response) {
				assert.equal(502, response.status);
				return response.text();
			})
			.then(function(body) {
				assert(/Welcome to your new app!/.test(body));
			})
			.then(function() {
				return destroy(app);
			});
	});

});
