import http from 'http';
import express from 'express';
import config from '@/config/config';
import CamRecord from '@/CamRecord';
import recordingsRoutes from '@/routes/recordings';
import cameraRoutes from '@/routes/camera';
import { exec } from 'child_process';

const router = express();

// JSON parser
router.use(express.urlencoded({ extended: false }));
router.use(express.json());

// Server headers
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method == 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({});
  }

  next();
});

// Routes
router.use('/recordings', recordingsRoutes);
router.use('/camera', cameraRoutes);

// Error Handling
router.use((req, res, next) => {
  const error = new Error('not found');

  return res.status(404).json({
    message: error.message,
  });
});

// Create server
const httpServer = http.createServer(router);
httpServer.listen(config.server.port, () =>
  console.log(`Server is running on ${config.server.hostname}:${config.server.port}`)
);
