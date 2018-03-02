const fs = require('fs');
const gulp= require('gulp');


//根目录，里面存放发版目录
var targetDir = "targetDir";
//发版目录，命名格式yyyymmdd_hhmmss
var releaseDir;

gulp.task('mkdir',function(){

    var df = require("dateFormat");
    var now = new Date();
    df.masks.hammerTime  = "yyyymmdd_HHMMss";
    releaseDir = df(now,"hammerTime");

    fs.mkdir(targetDir+'/'+releaseDir,function(err){
        if(err) {
            console.log("mkdir false!");
            return console.error(err);
        }else{
            //打包发版文件 区分大小版进行处理
            //判断大小版的凭据 暂缺
            //大版打包 直接将测试环境对应目录文件打包到发版目录下
            

            //小版打包
        }

    });
});




function copyFiles(){ console.log("i m here");}

