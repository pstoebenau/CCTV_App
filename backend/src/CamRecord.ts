import fs, { readdirSync, write } from 'fs';
import path from 'path';
import axios from 'axios';
import moment from 'moment';
import MjpegCamera from 'mjpeg-camera';
import FileOnWrite from 'file-on-write';
import ffmpeg from 'fluent-ffmpeg';
import config from '@/config/config';
import * as func from './functions/functions';

export default class CamRecord {
  name: string;
  camURL: string;
  verbose: number = 1;
  detectFps: number = 1;
  imageCache: number = 60;
  recordPadding: number = 5;

  recordInterval: NodeJS.Timeout;
  deleteInterval: NodeJS.Timeout;
  firstDetection: moment.Moment = moment(0);
  lastDetection: moment.Moment = moment(0);
  camera: any;
  imagePath: string;
  recordingPath: string;

  constructor(name: string, camURL: string) {
    this.name = name;
    this.camURL = camURL;
    this.recordInterval = setInterval(() => {});
    this.deleteInterval = setInterval(() => {});
    this.imagePath = path.join(config.dir.image, this.name);
    if (!fs.existsSync(this.imagePath)) fs.mkdirSync(this.imagePath);
    this.recordingPath = path.join(config.dir.recordings, this.name);
    if (!fs.existsSync(this.recordingPath)) fs.mkdirSync(this.recordingPath);
  }

  async record() {
    if (!this.camera) this.downloadVideoStream();
    this.deleteInterval = setInterval(() => this.removeOldImages(), 1000);
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

  getData() {
    return {
      name: this.name,
      camUrl: this.camURL,
    };
  }

  private streamError() {
    if (this.camera.connection == null) return;

    if (this.verbose > 0) console.log('Stream broken');
    this.stop();
    setTimeout(() => this.record(), 5000);
  }

  private async detectPeople() {
    let lastImage = '0';
    const images = readdirSync(this.imagePath);
    for (const image of images) {
      if (func.momentFromFileName(image).isAfter(func.momentFromFileName(lastImage))) {
        lastImage = image;
      }
    }
    const now = func.momentFromFileName(lastImage);

    if (lastImage == '0') {
      if (this.verbose >= 1) console.log('No images in buffer!');
      return;
    }
    
    // Person detection
    try {
      const imagePath = path.join(this.imagePath, lastImage);
      const response = await axios.post(`${config.server.jetsonApi}/detect`, { image: imagePath });
      const detections = response.data;

      for (let detection of detections) {
        if (detection.class == 'person') {
          if (this.verbose > 0) console.log('Person Detected!');
          this.saveVideo(now);
          break;
        }
      }
    } catch (error) {
      console.log(error);
      return;
    }


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
      const timeA = func.momentFromFileName(a);
      const timeB = func.momentFromFileName(b);
      return timeA.diff(timeB);
    });

    const imageInputsFile = path.join(this.recordingPath, `${start.format('x')}-input.txt`);
    let imageTime;
    let prevImageTime = start;
    let numInputs = 0;
    let str = '';
    images.map((image, i) => {
      imageTime = func.momentFromFileName(image);
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
        url: `${this.camURL}?action=stream`,
      });

      this.camera.pipe(fileWriter);
      this.camera.start();

      if (this.verbose > 0) console.log(`Recording ${this.camURL}?action=stream!`);
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
