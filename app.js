var express = require('express');
var multiparty = require('multiparty');
var util = require('util');
var fs = require('fs');
var iconv = require('iconv-lite');
var exec = require('child_process').exec; 
var app = express();
app.locals.title = "HCBuilder"
app.locals.email = "GaussCheng@live.com"
app.use(express.static('public'));

app.get('/[1-9]*', function (req, res) {
    console.log("Refresh");
//  res.sendFile('/public/index.html');
    fs.readFile('/home/szhc/workspace_v6_0/Easy6/Easy6/Source/datatype.h', function(err, content1){
        if(err){
            res.send("Err:"+ err);
            return;
        }
        fs.readFile('/home/szhc/workspace_v6_0/Easy6/Easy6/Source/IOPort.h', function(err, content2){
            if(err){
                res.send("Err:"+ err);
                return;
            }
            content1 = iconv.decode(content1, 'gbk');
            content2 = iconv.decode(content2, 'gbk');
            var cs = content1.split(/[\r\n]+/);
            var defines = [];
            cs = cs.concat(content2.split(/[\r\n]+/));
            var re = /^[#//]+define/g;
            re.compile(re);
            for(var i = 0; i < cs.length; ++i){
                if(cs[i].length == 0) continue;
                cs[i] = cs[i].replace(/(^\s*)|(\s*$)/g, "");
//                console.log(cs[i]);
                if(re.test(cs[i]))
                    defines.push(cs[i]);
            }
            res.send(util.format('<html><body><h1>欢迎使用华成自助编译系统</h1><form action="/startToBuild" enctype="multipart/form-data" method="post"><p>宏定义文件:</p><input type ="file" multiple="mutiple" name="inputFile"><input type="submit" value="上传" /></form><p>宏信息:</p><p>%s</p></body></html>', defines.join("<br/>")
                                )
                    );
            
        });
                
    });
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
                    defines = defines.replace(/(^\s*)|(\s*$)/g, "");
//                    defines = defines.replace('\r', "");
                    var defineLines = defines.split(/[\r\n]+/);
                    var d = " ";
                    var version = defineLines[defineLines.length - 1];
                    defineLines.splice(defineLines.length - 1, 1);
                    for(var i = 0; i < defineLines.length; ++i){
                        if(d.length > 0)
                            d += "-D" + defineLines[i] + " ";
                    }
//                    console.log(defines, d, defineLines)
                    var toReplaceBegin = data.indexOf("Easy6.out: $(OBJS) $(CMD_SRCS) $(LIB_SRCS) $(GEN_CMDS)");
                    var toReplaceEnd = data.indexOf("Easy6.hex", toReplaceBegin) - 1;
                    var header = data.substr(0, toReplaceBegin);
                    var end = data.substr(toReplaceEnd);
                    var toRepaceContent = 'Easy6.out: $(OBJS) $(CMD_SRCS) $(LIB_SRCS) $(GEN_CMDS)\n' +
                                           "\t@echo 'Building target: $@'\n" +
                                           "\t@echo 'Invoking: C2000 Linker'\n" +
            '\t"/opt/ti/ccsv6/tools/compiler/c2000_6.2.7/bin/cl2000" -v28 -ml -mt --float_support=fpu32 -g --diag_warning=225 --display_error_number --diag_wrap=off --c_extension=.C -z -m"Easy6.map" --stack_size=0x300 --warn_sections -i"/opt/ti/ccsv6/tools/compiler/c2000_6.2.7/lib" -i"/opt/ti/ccsv6/tools/compiler/c2000_6.2.7/include" --reread_libs --display_error_number --diag_wrap=off --xml_link_info="Easy6_linkInfo.xml" --entry_point=code_start --rom_model' + d +
                        '-o "Easy6.out" $(ORDERED_OBJS)\n' +
                                           "\t@echo 'Finished building target: $@'\n" +
                                           "\t@echo ' '\n" +
                                           "\t@$(MAKE) --no-print-directory post-build"
//                    console.log(header, toRepaceContent, end);
                    var GEN_OPTS__FLAG = "GEN_OPTS__FLAG+=" + d;
                    fs.writeFile('/home/szhc/workspace_v6_0/Easy6/Debug/makefile', GEN_OPTS__FLAG + header+toRepaceContent+end, function(err){
                        if(!err){
                            exec("cd /home/szhc/workspace_v6_0/Easy6/ && ./compiler.sh " + version, function(err,stdout,stderr){
                                if(!err){
                                    console.log(stdout);
                                    var result;
                                    if(stdout.indexOf("Compilation failure") >= 0 ){
                                        result = util.format('<html><body><p>编译失败</p><p>定义宏:</p><p>%s</p><p>编译信息:</p><p>%s</p></body></html>', d , stdout);
                                    }else{
                                        result = util.format('<html><body><ul><li><a href="/download/%s">%s</a></li><li><a href="/download/%s">%s</a></li></ul><p>定义宏:</p><p>%s</p><p>编译信息:</p><p>%s</p></body></html>',
                                                            "HCRobotHost_" + version + ".zip", "HCRobotHost_" + version + ".zip",
                                                            "HCUpdateHost_5A_" + version + ".zip", "HCUpdateHost_5A_" + version + ".zip",
                                                            d, stdout);
                                    }
                                    res.send(result);
//                                    res.writeHead(200, {
//                                              'Content-Type': 'application/force-download',
//                                              'Content-Disposition': 'attachment; filename=test.rar'
//                                    });
//	                                res.write('received upload:\n\n');
//	                                res.end(util.inspect({fields: fields, files: filesTmp}));
//                                    res.download('./public/files/HCRobotHost_' + version + '.zip', function(err){
//                                        if(err)
//                                            console.log('文件下载：===》'+ './public/files/HCRobotHost_' + version + '.zip' + err);  
//                                    });
//                                    res.download('./public/files/HCUpdateHost_5A_' + version + '.zip', function(err){
//                                        if(err)
//                                            console.log('文件下载：===》'+ './public/files/HCUpdateHost_5A_' + version + '.zip' + err);  
//                                    });
                                }
                            } );
                        }
                    });
                }
            });
        }else{
//            console.log("Defines", err);

        }
    });
    });
});

app.get('/download/*', function(req, res){
//    console.log(req);
    var path = req.path;
    path = path.substr("/download/".length - 1);
    path = './public/files/' + path;
    res.download(path, function(err){
        if(err){
            console.log('文件下载：===》'+ path + err);  
        }
    });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
