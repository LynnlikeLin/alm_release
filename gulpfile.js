//发小版工具
//读取updateFile.txt中的文件、目录路径
//检查所给的文件在c盘是否存在
//将c盘的目录copy到临时文件夹中
//打包成对应站点tar并生成md5文件
//在ftp上新建目录，并将打包好的文件传到ftp上
var fs = require("fs");
var gulp = require("gulp");
var tar = require("gulp-tar");
var gzip = require("gulp-gzip");
var glob = require('glob');
var folders = require('gulp-folders');
var path = require('path');
var crypto = require('crypto');
var through2 = require('through2');
var ftp = require('vinyl-ftp');
var gutil = require('gulp-util');
var moment = require('moment');

var data = fs.readFileSync('updateFile.txt', 'utf-8');
var filesToUp = new Array();
//临时文件夹名与ftp上的文件夹名保持一致
var remoteDir=moment().format('YYYYMMDD_HHmmss');
var tmpFolder=path.join('./toDeploy',remoteDir);

var bs = {base: '/home/site'};
var ftpHost = 'ftp.bt';
var userName = 'rd/linchengxiang';
var pwd = '010101';

filesToUp = data.split("\n");

/*
	建立临时文件夹，用于存放要更新的文件与之后生成的tar包
*/
gulp.task("mkdir", function (cb) {
	fs.mkdir(tmpFolder,function(err){
		if(err){
			console.log('failed to create directory', err);
		}else{
			console.log('create directory succeeded');
			cb.call();
		}
	});
});

/*
	将待更文件从c盘拷贝到临时文件夹
*/
/*
gulp.task("copy", ['mkdir'], function (cb) {
    gulp.src(filesToUp, {base: 'E:/workspaces/'})
        .pipe(gulp.dest(tmpFolder))
        .on('end', cb);
});
*/

gulp.task('copy',['mkdir'],function(cb){
	gulp.src(filesToUp)
		.pipe(through2.obj(function(ck,enc,cbt){
			copyFile(ck.path,cbt);
		}))
		.on('data', function (data) {
			console.log("on-data", data)
		})
		.on('end',cb);
	
		
});



/*
	如果待更的classes文件有内部类，将内部类拷到临时文件夹
	ps：暂时不考虑处理文件名的包含情况，稍后在正则中加^匹配解决
*/
gulp.task("cpSubclass", ['mkdir','copy'], function (tcb) {
    var count = 0;//file sum

    gulp.src(filesToUp)
        .pipe(through2.obj(function (chunk, enc, callback) {
			if(fs.statSync(chunk.path).isDirectory()){
				//如果是目录，就不用检查内部类了。
				callback();
			}else{
				//如果文件后缀是.class才检查是否有内部类
				if(path.extname(chunk.path) == '.class'){
					var curPath = path.dirname(chunk.path);
					var files = fs.readdirSync(curPath);
					var len = files.length;
					return gulp.src(curPath + "/*.*", bs)
							   .pipe(through2.obj(function (ch, en, ca) {
									if (len > 1) {
										if (path.basename(ch.path).match(path.basename(chunk.path, ".class") + "\\$")) {
											count ++;
											gulp.src(ch.path, bs).pipe(gulp.dest(tmpFolder)).on("end", ca);
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

/*
	将待更文件打包为对应站点的tar包并生成md5文件
*/
gulp.task('tar', ['copy', 'cpSubclass'], function (cb) {
    //wait tmp
    var f = folders(tmpFolder, function (folder) {
        return gulp.src(path.join(tmpFolder, folder, '**/*'), {base: tmpFolder})
            .pipe(tar(folder + '.tar'))
            .pipe(gulp.dest(tmpFolder))
            .pipe(through2.obj(function (chunk, enc, callback) {
                callback()
            }))
			.on('end',cb);
    });
    f();
});

/*
	将tar文件传到ftp上
*/
gulp.task('deploy',['tar'],function(){
	var conn = ftp.create({
		host:ftpHost,
		user:userName,
		password:pwd,
		parallel: 1,
		log:gutil.log
	});
	var globs = [
		path.join(tmpFolder,'*.tar'),
		path.join(tmpFolder,'md5.txt')
	];
	
	return gulp.src(globs,{base:tmpFolder,buffer:false})
	.pipe(conn.dest('pja/'+remoteDir))
	.pipe(through2.obj(function (chunk, enc, callback) {
                console.log('ftp://ftp.bt/pja/'+remoteDir+'/'+path.basename(chunk.path));
                callback()
            }));
});



function getMd5(path, tar) {
    var md5Obj = crypto.createHash('md5');
    var md5Str = tar + '=' + md5Obj.update(fs.readFileSync(path + '/' + tar, 'utf8'))
            .digest('hex');
    fs.appendFileSync(path + '/md5.txt', md5Str);
}


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
						gulp.src(path.join(chunk.path,'**/*'),bs)
							.pipe(gulp.dest(tmpFolder))
							.on('end',callback);
					}else if(fs.statSync(chunk.path).isFile()){
						console.log("copy file:"+chunk.path);
						gulp.src(chunk.path, bs)
							.pipe(gulp.dest(tmpFolder))
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


