const fs = require('fs');
const gulp= require('gulp');


//��Ŀ¼�������ŷ���Ŀ¼
var targetDir = "targetDir";
//����Ŀ¼��������ʽyyyymmdd_hhmmss
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
            //��������ļ� ���ִ�С����д���
            //�жϴ�С���ƾ�� ��ȱ
            //����� ֱ�ӽ����Ի�����ӦĿ¼�ļ����������Ŀ¼��
            

            //С����
        }

    });
});




function copyFiles(){ console.log("i m here");}

