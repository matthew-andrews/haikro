'use strict';
require('es6-promise').polyfill();
require('isomorphic-fetch');
var logger = require('../lib/logger');

module.exports = function(opts) {
	var token = opts.token;
	opts = opts.app ? { name: opts.app } : {};

	return fetch("https://api.heroku.com/apps", {
		method: 'post',
		headers: {
			"Accept": "application/vnd.heroku+json; version=3",
			"Content-Type": "application/json",
			"Authorization": "Bearer " + token
		},
		body: JSON.stringify(opts)
	})
		.then(function(response) { return response.json(); })
		.then(function(app) {
			console.log(app);
			logger.info("created app with name " + app.name);
		});
};
