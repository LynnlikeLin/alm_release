const fs = require('fs');
const gulp= require('gulp');
const cpro = require('child_process');
const path = require('path');
const through2 = require('through2');


//发版目录，命名格式yyyymmdd_hhmmss
var releaseDir;
//发版目录路径
var targetPath;
//需注意,files中的文件必须都在base目录下，如不在其下，则文件只会拷到todeploy目录
var basePath = {base:"../test"};
var fileList = 'fileList.txt';
var files = new Array();

var watcher = gulp.watch(fileList,['cpSubclass']);

watcher.on('change',function(event){
    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
});

gulp.task('mkdir',function(cb){

    var moment = require("moment");

    releaseDir = moment().format('YYYYMMDD_HHmmss');
    targetPath = path.join('./toDeploy',releaseDir);

    fs.mkdir(targetPath,function(err){
        if(err) {
            console.log("***************mkdir false!***************");
            return console.error(err);
        }else{
            console.log("***************mkdir succeeded!***************");
            cb.call();
        }
    });
});

gulp.task('default',function(){});
gulp.task('copy',['mkdir'],function(cb){

    //打包发版文件 区分大小版进行处理
    //判断大小版的凭据 暂缺
    if( 1==0) {
        //大版打包 直接将测试环境对应目录文件打包到发版目录下
        cpro.exec('tar cfP ./test/foo.tar foo','/home/server/alm-ext/configs','/bin/sh');
    }else {
        //小版打包
        var data = fs.readFileSync(fileList, 'utf-8');
        files = data.toString().split('\n');
        gulp.src(files)
            .pipe(through2.obj(function(ck,enc,cbt){
                copyFile(ck.path,cbt);
            }))
            .on('data', function (data) {
                console.log("on-data", data)
            })
            .on('end',cb);


    }

});

gulp.task("cpSubclass", ['mkdir','copy'], function (tcb) {
    var count = 0;//file sum

    gulp.src(files)
        .pipe(through2.obj(function (chunk, enc, callback) {
            if(fs.statSync(chunk.path).isDirectory()){
                //如果是目录，就不用检查内部类了。
                callback();
            }else{
                //如果文件后缀是.class才检查是否有内部类
                if(path.extname(chunk.path) == '.class'){
                    var curPath = path.dirname(chunk.path);
                    var curFiles = fs.readdirSync(curPath);
                    var len = curFiles.length;
                    return gulp.src(curPath + "/*.*", basePath)
                        .pipe(through2.obj(function (ch, en, ca) {
                            if (len > 1) {
                                if (path.basename(ch.path).match(path.basename(chunk.path, ".class") + "\\$")) {
                                    count ++;
                                    gulp.src(ch.path, basePath).pipe(gulp.dest(targetPath)).on("end", ca);
                                } else {
                                    ca();
                                }
                                len -= 1;
                            } else {
                                ca.apply();
                                callback();
                            }
                        }))
                }else{
                    callback();
                }
            }


        }))
        .on('data', function (data) {
            //这个没有.on('data'会导致.on("end"不执行
            //看官方文档--加了这个-
            //然而并不知道为什么~~
            console.log("on-data", data)
        })
        .on("end", tcb);
});

function copyFile(myPath,cb){
    fs.stat(myPath,function(err,stat){
        if(err){
            if(err.code === 'ENOENT'){
                console.error("No such file or directory:"+myPath);
                return;
            }else{
                throw err;
            }
        }else{
            gulp.src(myPath)
                .pipe(through2.obj(function(chunk,enc,callback){
                    if(fs.statSync(chunk.path).isDirectory()){
                        console.log("copy directory:"+chunk.path);
                        gulp.src(path.join(chunk.path,'**/*'),basePath)
                            .pipe(gulp.dest(targetPath))
                            .on('end',callback);
                    }else if(fs.statSync(chunk.path).isFile()){
                        console.log("copy file:"+chunk.path);
                        gulp.src(chunk.path, basePath)
                            .pipe(gulp.dest(targetPath))
                            .on('end', callback);
                    }else{
                        console.log('neither file nor directory!');
                        callback();
                    }
                }))
                .on('data', function (data) {
                    console.log("on-data", data)
                })
                .on('end',cb);
        }

    });
}

