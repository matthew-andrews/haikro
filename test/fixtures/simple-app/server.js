'use strict';
var fs = require('fs');
var dep = "this file wasn't here\n";
var devDep = "this file wasn't here\n";
var pkg = require('./package.json');
var workerWasStarted = 'nope';
var appName = 'haikro-' + pkg.name + '.herokuapp.com';

console.log(pkg);
try { dep = fs.readFileSync('./node_modules/dep-test/test.txt'); } catch (e) { }
try { devDep = fs.readFileSync('./node_modules/dev-dep-test/test.txt'); } catch (e) { }

require('http').createServer(function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});

	console.log(req.url);
	if (req.url === '/workerStarted') {
		workerWasStarted = 'yarp';
		res.end("You did it, clever little thing!");
	} else {
		res.end("Probably the simplest webserver in the world\ndep:"
			+ dep
			+ "devDep:"
			+ devDep
			+ "worker:"
			+ workerWasStarted);
	}
	
}).listen(process.env.PORT || 3000);
