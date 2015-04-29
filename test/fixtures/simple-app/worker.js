'use strict';
var http = require('http');
var pkg = require('./package.json');
var appName = 'haikro2-' + pkg.name + '.herokuapp.com';
console.log(appName);

var options = {
	host: appName,
	path: '/workerStarted'
};

function makeRequest () {
	http.request(options, function(response) {
		var str = '';

		//another chunk of data has been recieved, so append it to `str`
		response.on('data', function (chunk) {
			str += chunk;
		});

		//the whole response has been recieved, so we just print it out here
		response.on('end', function () {
			console.log(str);
		});
	}).end();
}
setInterval(makeRequest, 10000);
