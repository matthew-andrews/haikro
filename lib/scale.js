'use strict';
var logger = require('../lib/logger');

module.exports = function(opts) {
	var token = opts.token;
	if (!token) throw new Error('please provide a heroku access token');
	var name = opts.app;
	
	var processProfiles = opts.processProfiles;
	if (!processProfiles) throw new Error('please provide processProfiles');
	
	logger.verbose("scaling processes", processProfiles);

	var apiUrl = "https://api.heroku.com/apps/" + name + "/formation";
	console.log(apiUrl);

	return fetch(apiUrl, {
			method: 'patch',
			headers: {
				"Accept": "application/vnd.heroku+json; version=3",
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(processProfiles)
		})
		.then(function(response) { return response.json(); })
		.then(function(scaleResults) {
			logger.info("scaling complete");
			return scaleResults;
		});
};
