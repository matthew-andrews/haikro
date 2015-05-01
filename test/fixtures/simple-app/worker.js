'use strict';
var http = require('http');
var pkg = require('./package.json');
var appName = process.env.APP_NAME + '.herokuapp.com';
console.log('This app is called ', appName);

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
			console.log('Made the request...');
		});
	}).end();
}
makeRequest();
setInterval(makeRequest, 5000);
