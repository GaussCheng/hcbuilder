var express = require('express');
var multiparty = require('multiparty');
var util = require('util');
var fs = require('fs');
var exec = require('child_process').exec; 
var app = express();
app.locals.title = "HCBuilder"
app.locals.email = "GaussCheng@live.com"
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile('/public/index.html');
});
app.post('/startToBuild', function(req, res){
    var form = new multiparty.Form({uploadDir: './public/files/'});
    form.parse(req, function(err, fields, files){
	var filesTmp = JSON.stringify(files,null,2);
	if(err){
	    console.log('parse error: ' + err);
	} else {
	    console.log('parse files: ' + filesTmp);
	    var inputFile = files.inputFile[0];
	    var uploadedPath = inputFile.path;
	    var dstPath = './public/files/' + inputFile.originalFilename;
	    //重命名为真实文件名
	    fs.rename(uploadedPath, dstPath, function(err) {
		if(err){
		    console.log('rename error: ' + err);
		} else {
		    console.log('rename ok');
		}
	    });
	}
	exec("ls", function(err, stdout, stderr){

	    console.log(stdout);
	});

	res.writeHead(200, {'content-type': 'text/plain;charset=utf-8'});
	res.write('received upload:\n\n');
	res.end(util.inspect({fields: fields, files: filesTmp}));
    });
});


var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
