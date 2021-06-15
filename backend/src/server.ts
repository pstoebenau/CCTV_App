import http from 'http';
import express from 'express';
import config from '@/config/config';
import CamRecord from '@/CamRecord';
import recordingsRoutes from '@/routes/recordings';

const router = express();

// JSON parser
router.use(express.urlencoded({ extended: false }));
router.use(express.json());

router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  if (req.method == 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET PATCH DELETE POST PUT');
    return res.status(200).json({});
  }

  next();
});

// Routes
router.use('/recordings', recordingsRoutes);

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

// Run background app
const camRecord = new CamRecord('room', 'http://192.168.1.13:8080');
camRecord.record();