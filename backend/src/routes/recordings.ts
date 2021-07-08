import express from 'express';
import config from '@/config/config';
import fs, { createReadStream } from 'fs';
import path from 'path';
import * as func from '@/functions/functions';

const router = express.Router();

router.get('/list/:camera', (req, res, next) => {
  try {
    const recordings = fs.readdirSync(path.join(config.dir.recordings, req.params.camera));
    let retval: any = [];
    recordings.forEach((recording) => {
      const extension = recording.split('.')[1];
      if (extension == 'txt')
        return;
      
      const parts = recording.split('.')[0].split('-');
      const start = parts[0];
      const end = parts[1];
      retval.push({
        start: start,
        end: end,
        name: recording,
      });
    });

    return res.status(200).json({ status: 'success', recordings: retval });
  } catch (error) {
    console.log(error);
  }
});

router.get('/get/:camera/:filename', async (req, res, next) => {
  try {
    let videoDir = path.join(config.dir.recordings, req.params.camera, req.params.filename);
    videoDir = await func.checkAndConvertImgSeq(videoDir);

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
  try {
    const range = req.headers.range;
    if (!range) {
      return res.status(400).json({ error: 'Requires range header!' });
    }

    let videoDir = path.join(config.dir.recordings, req.params.camera, req.params.filename);
    videoDir = await func.checkAndConvertImgSeq(videoDir);

    const videoSize = fs.statSync(videoDir).size;

    // Parse range
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    const contentLength = end - start + 1;
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, headers);

    const videoStream = fs.createReadStream(videoDir, { start, end });
    videoStream.pipe(res);
  } catch (error) {
    console.log(error);
  }
});

export default router;
