//��С�湤��
//��ȡupdateFile.txt�е��ļ���Ŀ¼·��
//����������ļ���c���Ƿ����
//��c�̵�Ŀ¼copy����ʱ�ļ�����
//����ɶ�Ӧվ��tar������md5�ļ�
//��ftp���½�Ŀ¼����������õ��ļ�����ftp��
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
//��ʱ�ļ�������ftp�ϵ��ļ���������һ��
var remoteDir=moment().format('YYYYMMDD_HHmmss');
var tmpFolder=path.join('./toDeploy',remoteDir);

var bs = {base: '/home/site'};
var ftpHost = 'ftp.bt';
var userName = 'rd/linchengxiang';
var pwd = '010101';

filesToUp = data.split("\n");

/*
	������ʱ�ļ��У����ڴ��Ҫ���µ��ļ���֮�����ɵ�tar��
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
	�������ļ���c�̿�������ʱ�ļ���
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
	���������classes�ļ����ڲ��࣬���ڲ��࿽����ʱ�ļ���
	ps����ʱ�����Ǵ����ļ����İ���������Ժ��������м�^ƥ����
*/
gulp.task("cpSubclass", ['mkdir','copy'], function (tcb) {
    var count = 0;//file sum

    gulp.src(filesToUp)
        .pipe(through2.obj(function (chunk, enc, callback) {
			if(fs.statSync(chunk.path).isDirectory()){
				//�����Ŀ¼���Ͳ��ü���ڲ����ˡ�
				callback();
			}else{
				//����ļ���׺��.class�ż���Ƿ����ڲ���
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
			//���û��.on('data'�ᵼ��.on("end"��ִ��
			//���ٷ��ĵ�--�������-
			//Ȼ������֪��Ϊʲô~~
			console.log("on-data", data)
		})
		.on("end", tcb);
});

/*
	�������ļ����Ϊ��Ӧվ���tar��������md5�ļ�
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
	��tar�ļ�����ftp��
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


