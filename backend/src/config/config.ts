import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const SERVER = {
  hostname: process.env.SERVER_HOSTNAME || 'localhost',
  port: process.env.SERVER_PORT || '3000',
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
