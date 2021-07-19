import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const SERVER = {
  httpSchema: 'http',
  hostname: process.env.SERVER_HOSTNAME || 'apollo',
  port: process.env.SERVER_PORT || '3000',
  get url() { return `${this.httpSchema}://${this.hostname}:${this.port}` },
  jetsonApi: process.env.JESTON_API || 'http://localhost:5000',
};

const DIR = {
  image: path.join(__dirname, '../../image-buffer'),
  recordings: path.join(__dirname, '../../recordings'),
};

const config = {
  server: SERVER,
  dir: DIR,
};

export default config;
