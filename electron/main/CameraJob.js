'use strict';
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const http = require('http');

function getParam(url, key) {
    var param = new Object();
    var item = new Array();
    var urlList = url.split("?");
    var req;
    if (urlList.length == 1) {
        req = urlList[0];
    } else {
        req = urlList[1];
    }
    var list = req.split('&');
    for (var i = 0; i < list.length; i++) {
        item = list[i].split('=');
        param[item[0]] = item[1];
    }
    return param[key] ? param[key] : null;
}

class CameraJob {

    constructor(saveVideoPath,camera_name,port,size) {
        this._ffmpegCommand;
        this._videoServer;
        this._saveVideoPath = saveVideoPath;
        this._camera_name = camera_name;
        this._port = port
        this._video_size = size
        this.is_run = true
    }

    stopFFmpegCommand() {
        if (this.is_run == false) {
            console.log("second run, skipped");
            return
        }
        this.is_run = false
        if (this._ffmpegCommand) {
            this._ffmpegCommand.ffmpegProc.stdin.write("q\n");
            // this._ffmpegCommand.kill()
            console.log("kill ffmpeg")
            process.exit()
        }


 
        this._videoServer.shutdown(function(err) {
            if (err) {
                return console.log('shutdown failed', err.message);
            }
            console.log('Everything is cleanly shutdown.');
            // process.exit()

        });
      
        console.log("stopFFMPEG")
    }
    createCameraServer() {
        // top camera misc
        let fs = require('fs')
        let stream = require('stream')
        console.log("camera start", this._saveVideoPath)
        if (!this._videoServer) {
            let videoCodec = 'libx264'
            console.log(" camera start")
            let bufferStream = new stream.PassThrough();
            this._ffmpegCommand = ffmpeg()
                .input('video='+this._camera_name)
                .inputOptions(['-f dshow', '-s ' + this._video_size])
                .output(this._saveVideoPath)
                .videoCodec('copy')
                .output(bufferStream)
                .videoCodec(videoCodec)
                .format('mp4')
                .fps(30)
                .outputOptions(
                    '-movflags', 'frag_keyframe+empty_moov+faststart',
                    '-g', '18')
                .on('progress', function(progress) {
                    console.log('time: ' + progress.timemark);
                })
                .on('error', function(err) {
                    console.log('An error occurred: ' + err.message);
                })
                .on('end', function() {
                    console.log('Processing finished !');
                })
            
            this._ffmpegCommand.run()
            this._videoServer = http.createServer((request, response) => {
                bufferStream.pipe(response);
            })
            this._videoServer = require('http-shutdown')(this._videoServer);

            this._videoServer.listen(this._port);
        }
    }
}
console.log('args',process.argv)
let cameraJob = new CameraJob(process.argv[2],process.argv[3],process.argv[4],process.argv[5])
cameraJob.createCameraServer()

process.on("message", (e)=>{
    if (e == 'stop') {
        cameraJob.stopFFmpegCommand()
        
    }
})