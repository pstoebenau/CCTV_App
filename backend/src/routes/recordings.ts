import express from 'express';
import config from '@/config/config';
import fs, { createReadStream } from 'fs';
import path from 'path';
import { checkAndConvertImgSeq, getThumbnail, momentFromFileName } from '@/functions/functions';
import moment from 'moment';
import Recording from '@/models/Recording';

const router = express.Router();

router.get('/list/:camera/:range?', (req, res, next) => {
  try {
    let recordings = fs.readdirSync(path.join(config.dir.recordings, req.params.camera));

    let retval: Recording[] = [];
    for (const recording of recordings) {
      const extension = recording.split('.')[1];
      if (extension == 'txt' || extension == 'jpg')
        continue;

      // Check for corrupt videos
      if (extension == 'mp4' && fs.existsSync(recording.split('.')[0])) {
        fs.unlinkSync(path.join(config.dir.recordings, req.params.camera, recording.split('.')[0]));
        continue;
      }

      const parts = recording.split('.')[0].split('-');
      const start = parts[0];
      const end = parts[1];

      const fullPath = path.join(config.dir.recordings, req.params.camera, recording);
      let imgSrc = '';
      if (fs.statSync(fullPath).isDirectory()) {
        imgSrc = path.join(recording, getThumbnail(fullPath));
      }
      else {
        imgSrc = `${start}-${end}.jpg`;
      }

      retval.push({
        start: start,
        end: end,
        name: recording,
        src: `${config.server.url}/recordings/stream/${req.params.camera}/${recording}`,
        img: `${config.server.url}/assets/${req.params.camera}/${imgSrc}`,
      });
    }

    retval.sort((a, b) => momentFromFileName(b.start).diff(momentFromFileName(a.start)));

    return res.status(200).json({ status: 'success', recordings: retval });
  } catch (error) {
    console.log(error);
  }
});

router.get('/get/:camera/:filename', async (req, res, next) => {
  try {
    let videoDir = path.join(config.dir.recordings, req.params.camera, req.params.filename);
    videoDir = await checkAndConvertImgSeq(videoDir);

    const videoSize = fs.statSync(videoDir).size;

    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': videoSize
    });

    const readStream = fs.createReadStream(videoDir);
    readStream.pipe(res);
  } catch (error) {
    console.log(error);
  }
});

router.get('/stream/:camera/:filename', async (req, res, next) => {
  const options: any = {};
  let videoDir = path.join(config.dir.recordings, req.params.camera, req.params.filename);
  videoDir = await checkAndConvertImgSeq(videoDir);

  let start: any;
  let end: any;

  const range = req.headers.range;
  if (range) {
      const bytesPrefix = "bytes=";
      if (range.startsWith(bytesPrefix)) {
          const bytesRange = range.substring(bytesPrefix.length);
          const parts = bytesRange.split("-");
          if (parts.length === 2) {
              const rangeStart = parts[0] && parts[0].trim();
              if (rangeStart && rangeStart.length > 0) {
                  options.start = start = parseInt(rangeStart);
              }
              const rangeEnd = parts[1] && parts[1].trim();
              if (rangeEnd && rangeEnd.length > 0) {
                  options.end = end = parseInt(rangeEnd);
              }
          }
      }
  }

  res.setHeader("content-type", "video/mp4");

  fs.stat(videoDir, (err, stat) => {
      if (err) {
          console.error(`File stat error for ${videoDir}.`);
          console.error(err);
          res.sendStatus(500);
          return;
      }

      let contentLength = stat.size;

      if (req.method === "HEAD") {
          res.statusCode = 200;
          res.setHeader("accept-ranges", "bytes");
          res.setHeader("content-length", contentLength);
          res.end();
      }
      else {       
          let retrievedLength;
          if (start !== undefined && end !== undefined) {
              retrievedLength = (end+1) - start;
          }
          else if (start !== undefined) {
              retrievedLength = contentLength - start;
          }
          else if (end !== undefined) {
              retrievedLength = (end+1);
          }
          else {
              retrievedLength = contentLength;
          }

          res.statusCode = start !== undefined || end !== undefined ? 206 : 200;

          res.setHeader("content-length", retrievedLength);

          if (range !== undefined) {  
              res.setHeader("content-range", `bytes ${start || 0}-${end || (contentLength-1)}/${contentLength}`);
              res.setHeader("accept-ranges", "bytes");
          }

          const fileStream = fs.createReadStream(videoDir, options);
          fileStream.on("error", error => {
              console.log(`Error reading file ${videoDir}.`);
              console.log(error);
              res.sendStatus(500);
          });


          fileStream.pipe(res);
      }
  });
});

export default router;
