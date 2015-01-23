'use strict';
const http = require('http');
http.createServer(function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end("Probably the simplest webserver in the world");
}).listen(process.env.PORT || 3000);
