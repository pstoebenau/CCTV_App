import express from 'express';
import config from '@/config/config';
import fs, { createReadStream } from 'fs';
import path from 'path';
import CamRecord from '@/CamRecord';

const router = express.Router();

let cameras: Map<string, CamRecord> = new Map();

router.get('/get-all', (req, res, next) => {
  try {
    let retval: any[] = [];
    cameras.forEach((value, key) => {
      retval.push(value.getData());
    });

    return res.status(200).json({ status: "success", cameras: retval });
  } catch (error) {
    return res.status(200).json({ status: "error", message: error });
  }
});

router.post('/create', (req, res, next) => {
  try {
    const camData = req.body;

    if (cameras.has(camData.name)) {
      return res.status(200).json({ status: "invalid", message: "Camera name already exists" })
    }

    const imgDir = path.join(config.dir.image, camData.name);
    const recordingsDir = path.join(config.dir.recordings, camData.name);

    if (!fs.existsSync(imgDir))
      fs.mkdirSync(imgDir);
    if (!fs.existsSync(recordingsDir))
      fs.mkdirSync(recordingsDir);

    let camera = new CamRecord(camData.name, camData.camUrl);
    cameras.set(camData.name, camera);

    return res.status(200).json({ status: "success", camera: camera.getData() });
  } catch (error) {
    return res.status(200).json({ status: "error", message: error });
  }
});

router.get('/record/:name', (req, res, next) => {
  try {
    const camera = cameras.get(req.body.name)
    if (camera) {
      camera.record();
      return res.status(200).json({ status: "success" });
    }
    else {
      return res.status(200).json({ status: "error", message: "No camera with that name" });
    }
  } catch (error) {
    return res.status(200).json({ status: "error", message: error });
  }
});

router.get('/stop/:name', (req, res, next) => {
  try {
    const camera = cameras.get(req.body.name);
    if (camera) {
      camera.stop();
      return res.status(200).json({ status: "success" });
    }
    else {
      return res.status(200).json({ status: "error", message: "No camera with that name" });
    }
  } catch (error) {
    return res.status(200).json({ status: "error", message: error });
  }
});

router.get('/delete/:name', (req, res, next) => {
  try {
    const camera = cameras.get(req.body.name);
    if (camera) {
      camera.stop();
      cameras.delete(req.body.name);
      return res.status(200).json({ status: "success" });
    }
    else {
      return res.status(200).json({ status: "error", message: "No camera with that name" });
    }
  } catch (error) {
    return res.status(200).json({ status: "error", message: error });
  }
});

export default router;
