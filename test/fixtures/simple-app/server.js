'use strict';
var fs = require('fs');
var dep = "this file wasn't here\n";
var devDep = "this file wasn't here\o";
try { dep = fs.readFileSync('./node_modules/dep-test/test.txt'); } catch(e) { }
try { devDep = fs.readFileSync('./node_modules/dev-dep-test/test.txt'); } catch(e) { }

require('http').createServer(function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end("Probably the simplest webserver in the world\ndep:" + dep + "devDep:" + devDep);
}).listen(process.env.PORT || 3000);
