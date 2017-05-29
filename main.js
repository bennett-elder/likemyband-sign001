const https = require('https');
const fs = require('fs');
const express = require('express');
const app1 = express();
const app2 = express();
const bodyParser = require('body-parser');
const xhub = require('express-x-hub');

const config = require( "./config");

// Set up express server here
const options = {
    cert: fs.readFileSync(config.pempath + '/fullchain.pem'),
    key: fs.readFileSync(config.pempath + '/privkey.pem')
};

app1.use(express.static('static'));
app1.set('port', 80);
app1.listen(app1.get('port'));

app2.use(xhub({ algorithm: 'sha1', secret: config.fbAppSecret }));

var getFacebookLikes = function () {
	
	var options = {
	  host: 'graph.facebook.com',
	  port: 443,
	  path: '/' + config.fbPageID + '/?fields=fan_count&access_token=' + config.fbAppToken,
	  method: 'GET'
	};

	https.request(options, function(res) {
	  //console.log('STATUS: ' + res.statusCode);
	  //console.log('HEADERS: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (stringChunk) {
		var chunk = JSON.parse(stringChunk);
	    	//console.log('BODY: ' + chunk);
		//console.log(chunk.fan_count);
		//console.log(chunk.id);
		//console.log(typeof chunk);
		console.log(chunk);
		if (typeof chunk.fan_count != 'undefined') {
			fs.writeFile('static/' + config.pageShortcode + '.txt', '###'+chunk.fan_count+'\0', function(err, data) {
				if (err) {
					return console.log(err);
				}
				// console.log(data);
			});
		}
	  });
	}).end();
};

getFacebookLikes();

app2.get('/', function(req, res) {
  //console.log(req);
  //res.send('<pre>' + JSON.stringify(received_updates, null, 2) + '</pre>');
  res.end();
});

app2.get('/facebook', function(req, res) {
  if (
    req.param('hub.mode') == 'subscribe' &&
    req.param('hub.verify_token') == 'blatherskite'
  ) {
    res.send(req.param('hub.challenge'));
  } else {
    res.sendStatus(400);
  }
});

app2.post('/facebook', function(req, res) {
  console.log('Facebook request body:', req.body);
  if (!req.isXHubValid()) {
    console.log('Warning - request header X-Hub-Signature not present or invalid');
    res.sendStatus(401);
    return;
  }

  console.log('request header X-Hub-Signature validated');

  // Process the Facebook updates here

  var body = req.body;

  if (typeof body.object != 'undefined' && body.object == "page") {
    console.log('yay, page changed');
    if (typeof body.entry != 'undefined') {
      console.log('yay, defined entry');
      for (var i = 0; i < body.entry.length; i++) {
        if(typeof body.entry[i] != 'undefined' 
		&& typeof body.entry[i].id != 'undefined' 
		&& body.entry[i].id == config.fbPageID) {
          console.log('yay, CS page changed');
	  getFacebookLikes();
        }
        else {
          console.log(body.entry[i].id);
        }
      }
    }
  }

  res.sendStatus(200);

});

https.createServer(options, app2).listen(443);
