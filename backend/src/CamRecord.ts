import fs, { readdirSync, write } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { Canvas, Image } from 'canvas';
// import * as faceapi from 'face-api.js';
import moment from 'moment';
import MjpegCamera from 'mjpeg-camera';
import FileOnWrite from 'file-on-write';
import ffmpeg from 'fluent-ffmpeg';
import config from '@/config/config';
import { timeoutPromise } from './functions/functions';

export default class CamRecord {
  name: string;
  camURL: string;
  verbose: number = 1;
  detectFps: number = 0.2;
  imageCache: number = 30;
  recordPadding: number = 5;

  recordInterval: NodeJS.Timeout;
  deleteInterval: NodeJS.Timeout;
  firstDetection: moment.Moment = moment(0);
  lastDetection: moment.Moment = moment(0);
  model: cocoSsd.ObjectDetection | null = null;
  camera: any;
  imagePath: string;
  recordingPath: string;

  constructor(name: string, camURL: string) {
    this.name = name;
    this.camURL = camURL;
    this.recordInterval = setInterval(() => {});
    this.deleteInterval = setInterval(() => {});
    this.imagePath = path.join(config.dir.image, this.name);
    this.recordingPath = path.join(config.dir.recordings, this.name);
    if (!fs.existsSync(this.recordingPath)) fs.mkdirSync(this.recordingPath);
  }

  async record() {
    if (!this.camera) this.downloadVideoStream();
    this.deleteInterval = setInterval(() => this.removeOldImages(), 1000);
    if (!this.model) this.model = await cocoSsd.load();
    this.recordInterval = setInterval(() => this.detectPeople(), 1000 / this.detectFps);
  }

  stop() {
    clearInterval(this.recordInterval);
    clearInterval(this.deleteInterval);
    // if (this.camera.connection) this.camera.stop();
  }

  setVerbose(verbose: number) {
    this.verbose = verbose;
  }

  private streamError() {
    if (this.camera.connection == null) return;

    if (this.verbose > 0) console.log('Stream broken');
    this.stop();
    setTimeout(() => this.record(), 5000);
  }

  private async detectPeople() {
    if (!this.model) {
      return;
    }

    const now = moment();
    let response, buffer;
    try {
      response = await timeoutPromise(1000, fetch(`${this.camURL}/?action=snapshot`));
      buffer = await response.buffer();
    } catch (error) {
      if (this.verbose > 1) console.log(error);
      this.streamError();
      return;
    }

    const img = new Image();
    img.src = buffer;
    const canvas = new Canvas(img.naturalWidth, img.naturalHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    if (this.verbose > 0) console.log('Trigger!');
    this.saveVideo(now);
    // Person detection
    // const detections = await this.model.detect(canvas as any);

    // for (let object of detections) {
    //   if (object.class == 'person') {
    //     if (this.verbose > 0) console.log('Person Detected!');
    //     this.saveVideo(now);
    //     break;
    //   }
    // }

    // Save video if it's been a while since last detection
    if (
      !this.firstDetection.isSame(moment(0)) &&
      now.diff(this.lastDetection, 's') > this.recordPadding
    ) {
      // if (this.verbose > 0) console.log(`first:\t${this.firstDetection.format('h:mm:ss')}\tlast:\t${this.lastDetection.format('h:mm:ss')}`);

      let start = this.firstDetection.clone();
      let end = this.lastDetection.clone();
      start.subtract(this.recordPadding, 's');
      end.add(this.recordPadding, 's');

      // if (this.verbose > 0) console.log(`start:\t${start.format('h:mm:ss')}\tend:\t${end.format('h:mm:ss')}`);

      this.convertJPG2MJPG(start, end);
      this.firstDetection = moment(0);
    }
  }

  private async saveVideo(now: moment.Moment) {
    if (this.firstDetection.isSame(moment(0))) {
      this.firstDetection = now;
      this.lastDetection = now;
    }

    if (this.verbose > 0)
      console.log(`${now.diff(this.firstDetection, 's')} : ${now.diff(this.lastDetection, 's')}`);
    if (
      now.diff(this.lastDetection, 'seconds') > this.recordPadding ||
      now.diff(this.firstDetection, 'seconds') > this.imageCache / 2
    ) {
      let start = this.firstDetection.clone();
      let end = this.lastDetection.clone();
      start.subtract(this.recordPadding, 's');
      end.add(this.recordPadding, 's');
      this.convertJPG2MJPG(start, end);
      this.firstDetection = moment(0);
    }

    this.lastDetection = now;
  }

  private async convertJPG2MJPG(start: moment.Moment, end: moment.Moment) {
    if (this.verbose > 0) console.log('Length of video: ' + end.diff(start, 's'));

    const images = readdirSync(this.imagePath);

    // Sort in chronological order
    images.sort((a: string, b: string) => {
      const timeA = parseInt(a.replace('.jpg', ''));
      const timeB = parseInt(b.replace('.jpg', ''));
      return timeA - timeB;
    });

    const imageInputsFile = path.join(this.recordingPath, `${start.format('x')}-input.txt`);
    let imageTime;
    let prevImageTime = start;
    let numInputs = 0;
    let str = '';
    images.map((image, i) => {
      imageTime = moment(image.replace('.jpg', ''), 'x');
      if (imageTime.isAfter(start) && imageTime.isBefore(end)) {
        if (numInputs !== 0) {
          str += 'duration ' + imageTime.diff(prevImageTime, 'ms') / 1000 + '\n';
        }
        str += `file ${path.join(this.imagePath, image)}\n`;
        prevImageTime = imageTime;
        numInputs++;
      }
    });
    fs.writeFileSync(imageInputsFile, str);

    // if (this.verbose > 0) console.log('Input file content: ' + str);

    const videoPath = path.join(
      config.dir.recordings,
      this.name,
      `${start.format('x')}-${end.format('x')}.mp4`
    );
    let command = ffmpeg()
      .addInput(imageInputsFile)
      .inputFormat('concat')
      .inputOptions('-safe 0')
      .output(videoPath)
      .on('start', (commandLine) => {
        if (this.verbose > 0) console.log('Spawned Ffmpeg!');
      })
      .on('error', (err, stdout, stderr) => {
        if (this.verbose > 0) console.log('Cannot process video: ' + err.message);
      })
      .on('end', (stdout, stderr) => {
        if (this.verbose > 0) console.log('Transcoding succeeded!');
        fs.unlink(imageInputsFile, () => {});
      })
      .run();
  }

  private async downloadVideoStream() {
    try {
      let fileWriter = new FileOnWrite({
        path: this.imagePath,
        ext: '.jpg',
        filename: (frame: any) => frame.time,
        transform: (frame: any) => frame.data,
      });

      this.camera = new MjpegCamera({
        url: `${this.camURL}/?action=stream`,
      });

      this.camera.pipe(fileWriter);
      this.camera.start();

      if (this.verbose > 0) console.log('Recording!');
    } catch (error) {
      if (this.verbose > 1) console.log(error);
      return;
    }
  }

  private async removeOldImages() {
    const images = readdirSync(this.imagePath);
    const now = moment();
    const cutoffTime = now.subtract(this.imageCache, 's');

    for (const image of images) {
      const timestamp = image.replace('.jpg', '');
      const imageTime = moment(timestamp, 'x');
      if (imageTime.isBefore(cutoffTime)) {
        fs.unlink(path.join(this.imagePath, image), () => {});
      }
    }
  }
}
