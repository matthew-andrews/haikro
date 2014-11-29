'use strict';
var denodeify = require('denodeify');
var readFile = denodeify(require('fs').readFile);

module.exports = function(project) {
	return readFile(project+"/package.json", { encoding: 'UTF-8' })
		.then(function(data) {
			return JSON.parse(data);
		})
		.catch(function() {});
};
