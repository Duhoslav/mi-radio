'use strict';
const path = require('path');
const rootFolder = path.resolve(__dirname);
const cp = require('child_process');
const fs = require('fs');
const config = require('../config');
const {spawn} = cp;
const mediaFile = path.join(rootFolder,'../tmp', 'pl.m3u8');
const pidFile = path.join(rootFolder,'../tmp', 'radio.pid');
const radioUrl = 'http://hls-01-retro.emgsound.ru/12/128/playlist.m3u8';
let ffmpeg;
let currentStream;


let page = config.page;
const radios = config.radios;

if (!radioUrl) {
    throw new Error('You must specify the radio url!');
}

const mediaStream = streamUrl => {
    // kill previous process
    if (!ffmpeg || currentStream !== streamUrl) {
        currentStream = streamUrl;
        if (ffmpeg) {
            ffmpeg.kill();
        }
        const args = [
            '-i', streamUrl,
            '-c:a', 'libfdk_aac',
            '-b:a', '64k',
            '-f', 'ssegment',
            '-hls_list_size', 3,
            '-segment_list', mediaFile,
            '-segment_time', 27,
            '-segment_list_size', 3,
            '-segment_wrap', 10,
            // '-segment_list_entry_prefix', 'http://localhost:8080/',
            '-segment_list_entry_prefix', 'http://api.ximalaya.com/uploads/playing/0/',
            path.join(rootFolder,'../tmp', '64%03d.aac')];
        console.log(args.join(' '));
        ffmpeg = spawn(path.join(rootFolder, '../ffmpeg/bin/ffmpeg.exe'), args);

        ffmpeg.stdout.on('exit', code => {
            ffmpeg.kill();
            ffmpeg = false;
        });

        fs.writeFileSync(pidFile, ffmpeg.pid, 'utf8');
    }

};

module.exports = function (router) {
    router
        .route(/.*\.m3u8$/)
        .get((req, res, next) => {
            console.log('playlist:', req.url);
            let id = req.url.match(/[0-9]+/i);
            if (id.length > 0 && Array.isArray(id)) {
                id = id[0];
            }
            const radio = radios.find(x => x.id === parseInt(id));
            let realUrl = 'C:/radio/music/1.mp3'; //radio.real_url;
            mediaStream(realUrl);

            setTimeout(() => {
                res.header({'Content-Type': 'application/vnd.apple.mpegurl'});
                res.end(fs.readFileSync(mediaFile, 'utf8'));
            }, 2500);
        });

    router
        .route(/.*\.aac$/)
        .get((req, res, next) => {
            console.log('audio file:', req.url);
            const aacFile = 'C:/radio/music/3.aac'; // path.join(rootFolder, '../tmp', path.basename(req.url));
            const stat = fs.statSync(aacFile);
            const readStream = fs.createReadStream(aacFile);

            res.header({
                'Content-Type': 'audio/aac',
                'Content-Length': stat.size
            });

            readStream.pipe(res);
        });
    router
        .route(/.*live\/radios.*$/)
        .get((req, res, next) => {
            const id = req.query.ids;
            console.log('ids:', id);
            const headers = {
                'Content-Type': 'application/json'
            };
            page.radios = radios;

            setTimeout(() => {
                res.header(headers);
                res.end(JSON.stringify(page));
            }, 2500);
        });

    router
        .route(/.*\/get_radios_by_ids.*$/)
        .get((req, res, next) => {
            // const id = req.query.ids;
            // console.log('ids:', id);
            const headers = {
                'Content-Type': 'application/json'
            };
            const data = {
                "radios": radios.filter(x => req.query.ids.includes(x.id))
            };

            setTimeout(() => {
                res.header(headers);
                res.end(JSON.stringify(data));
            }, 2500);
        });
};
