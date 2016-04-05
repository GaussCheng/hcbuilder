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
    
    fs.readFile(dstPath, 'ascii', function(err, defines){
        if(!err){
            fs.readFile('/home/szhc/workspace_v6_0/Easy6/basemf', 'ascii', function(err, data){
                if(!err){
                    
                    var toReplaceBegin = data.indexOf("Easy6.out: $(OBJS) $(CMD_SRCS) $(LIB_SRCS) $(GEN_CMDS)");
                    var toReplaceEnd = data.indexOf("Easy6.hex", toReplaceBegin) - 1;
                    var header = data.substr(0, toReplaceBegin);
                    var end = data.substr(toReplaceEnd);
                    var toRepaceContent = 'Easy6.out: $(OBJS) $(CMD_SRCS) $(LIB_SRCS) $(GEN_CMDS)\n' +
                                           "@echo 'Building target: $@'\n" +
                                           "@echo 'Invoking: C2000 Linker'\n" +
            '"/opt/ti/ccsv6/tools/compiler/c2000_6.2.7/bin/cl2000" -v28 -ml -mt --float_support=fpu32 -g --diag_warning=225 --display_error_number --diag_wrap=off --c_extension=.C -z -m"Easy6.map" --stack_size=0x300 --warn_sections -i"/opt/ti/ccsv6/tools/compiler/c2000_6.2.7/lib" -i"/opt/ti/ccsv6/tools/compiler/c2000_6.2.7/include" --reread_libs --display_error_number --diag_wrap=off --xml_link_info="Easy6_linkInfo.xml" --entry_point=code_start --rom_model' +
                        '-o "Easy6.out" $(ORDERED_OBJS)\n' +
                                           "@echo 'Finished building target: $@'\n" +
                                           "@echo ' '\n" +
                                           "@$(MAKE) --no-print-directory post-build"
                    console.log(header, end);
                }
            });
        }
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
