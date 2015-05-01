'use strict';
var logger = require('../lib/logger');

module.exports = function(opts) {
	var token = opts.token;
	if (!token) throw new Error('please provide a heroku access token');
	var name = opts.app;
	
	var configVars = opts.configVars;
	if (!configVars) throw new Error('please provide some configVars data');
	
	logger.verbose("Setting new config vars the app");

	var apiUrl = "https://api.heroku.com/apps/" + name + "/config-vars";

	return fetch(apiUrl, {
			method: 'patch',
			headers: {
				"Accept": "application/vnd.heroku+json; version=3",
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(configVars)
		})
		.then(function(response) {
			if (!response.ok) {
				throw new Error("Failed to update the config vars for the app", response);
			}
			return response.json();
		})
		.then(function(configVars) {
			logger.info("config vars update complete");
			return configVars;
		});
};
