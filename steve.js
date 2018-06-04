const { spawn } = require( 'child_process' );
var http = require('http');

let html = `
<!DOCTYPE html>
<html>
	<head>
		<title>Demo</title>
		<script>
			function processData() {
				var base64 = document.getElementById('base64');
				var request = new XMLHttpRequest();
				request.open('POST', '/', true);
				request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');

				request.onload = function() {
					if (request.status >= 200 && request.status < 400) {
						// Success!
						var response = document.getElementById('response');
						var data = JSON.parse(request.responseText);
						response.innerHTML = 'Total: ' + data.total + '<br /> Used: ' + data.used + '<br />Free: ' + data.free
					} else {
						// We reached our target server, but it returned an error

					}
				};

				request.onerror = function() {
					// There was a connection error of some sort
				};

				request.send(base64.value);
			}
		</script>
	</head>
	<body>
		<textarea id="base64"></textarea>
		<button onclick="processData();">Convert</button>
		<div id="response"></div>
	</body>
</html>
`

/*process.stdin.on('data', function(data) {
	//processData(JSON.parse(data.toString()));
	let buffer = decodeBase64(data.toString());
	//console.log(buffer);
	decompress(buffer, function(err, out) {
		processData(JSON.parse(out.toString()))
	});
});*/

var decompress = function(buffer, callback) {
	let out = [];

	child = spawn('pigz', ['-d']);
	child.stdin.setEncoding('utf-8');
	child.stdin.write(buffer);
	child.stdin.end();

	child.stdout.on('data', function(data) {
		for(let i = 0; i <= data.length - 1; i++) {
			out.push(data[i]);
		}
	});

	child.on('exit', function(code) {
		if (code != 0) {
			callback(true, 'error');
		} else {
			let decombuf = Buffer.from(out);
			callback(false, decombuf.toString());
		}
	});
}

var decodeBase64 = function(data) {
	let b64string = data;
	//console.log(b64string);
	let buf = Buffer.from(b64string, 'base64');
	return buf;
}

var processData = function(data) {
	let total = 0;
	let used = 0;
	let free = 0;
	
	var sum = {
		total: 0,
		used: 0,
		free: 0
	}

	for(let i = 0; i <= data.length - 1; i++) {
		//console.log(data[i]);
		//console.log(data[i].Volume)
		total = total + data[i].Volume.Total;
		used = used + data[i].Volume.Used;
		free = free + data[i].Volume.Free;
	}
	sum.total = Math.round(100 * (total / (1024 * 1024))) / 100 + 'GB';
	sum.used = Math.round(100 * (used / (1024 * 1024))) / 100 + 'GB';
	sum.free = Math.round(100 * (free / (1024 * 1024))) / 100  + 'GB';
	
	return sum;
}

http.createServer(function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'}); // http header
		var url = req.url;
		if (req.method === 'POST') {
			let body = '';
			req.on('data', chunk => {
				body += chunk.toString(); // convert Buffer to string
			});
			req.on('end', () => {
				console.log(body);
				let buffer = decodeBase64(body);
				//console.log(buffer);
				decompress(buffer, function(err, out) {
					console.log(processData(JSON.parse(out.toString())));
					res.write(JSON.stringify(processData(JSON.parse(out.toString())))); //write a response
					res.end();
				});
			});
		} else {
			res.write(html); //write a response
			res.end(); //end the response
		}
}).listen(3000, function(){
	console.log("server start at port 3000"); //the server object listens on port 3000
});
