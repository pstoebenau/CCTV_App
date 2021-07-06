import fs from 'fs';
import path from 'path';
import axios from 'axios';
import moment from 'moment';
import MjpegCamera from 'mjpeg-camera';
import FileOnWrite from 'file-on-write';
import config from '@/config/config';
import * as func from './functions/functions';

export default class CamRecord {
  name: string;
  camURL: string;
  verbose: number = 1;
  detectFps: number = 1;
  imageCache: number = 30;
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
    this.recordInterval = setInterval(() => this.detectPeople(), 1000 / this.detectFps);
    this.deleteInterval = setInterval(() => this.removeOldImages(), 1000);
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
    let lastImage = '';
    let lastImageTime = moment(0);
    const images = fs.readdirSync(this.imagePath);
    for (const image of images) {
      if (func.momentFromFileName(image).isAfter(lastImageTime)) {
        lastImage = image;
        lastImageTime = func.momentFromFileName(image);
      }
    }
    const now = lastImageTime;

    if (lastImage == '') {
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
      let start = this.firstDetection.clone();
      let end = this.lastDetection.clone();
      start = start.subtract(this.recordPadding, 's');
      end = end.add(this.recordPadding, 's');

      setTimeout(() => this.saveJPGSeq(start, end), this.recordPadding*1000);
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
      start = start.subtract(this.recordPadding, 's');
      end = end.add(this.recordPadding, 's');
      setTimeout(() => this.saveJPGSeq(start, end), this.recordPadding*1000);
      this.firstDetection = moment(0);
    }

    this.lastDetection = now;
  }

  private async saveJPGSeq(start: moment.Moment, end: moment.Moment) {
    const seqPath = path.join(this.recordingPath, `${start.format('x')}-${end.format('x')}`)
    if (fs.existsSync(seqPath)) {
      return;
    }
    fs.mkdirSync(seqPath);

    const images = fs.readdirSync(this.imagePath);
    for (let image of images) {
      if(func.momentFromFileName(image).isBetween(start, end)) {
        fs.copyFileSync(path.join(this.imagePath, image), path.join(seqPath, image));
      }
    }
  }

  private async downloadVideoStream() {
    try {
      let fileWriter = new FileOnWrite({
        path: this.imagePath,
        ext: '.jpg',
        filename: (frame: any) => moment(frame.time, 'x').format('x'),
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
    const images = fs.readdirSync(this.imagePath);
    const now = moment();
    const cutoffTime = now.subtract(this.imageCache, 's');

    for (const image of images) {
      const imageTime = func.momentFromFileName(image);
      if (imageTime.isBefore(cutoffTime)) {
        fs.unlink(path.join(this.imagePath, image), () => {});
      }
    }
  }
}
