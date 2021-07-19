import fs from "fs";
import moment from "moment";
import path from "path";
import ffmpeg from 'fluent-ffmpeg';
import { resolve } from "path/posix";

export function timeoutPromise<Type>(ms: number, promise: Promise<Type>) {
  return new Promise<Type>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("promise timeout"))
    }, ms);
    promise.then(
      (res) => {
        clearTimeout(timeoutId);
        resolve(res);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      }
    );
  })
}

export function momentFromFileName(fileName: string) {
  return moment(fileName.split('.')[0], 'x');
}

export async function checkAndConvertImgSeq(imgSeqPath: string) {
  if (!fs.existsSync(imgSeqPath))
    imgSeqPath = imgSeqPath + '.mp4';

  if (fs.lstatSync(imgSeqPath).isFile())
    return imgSeqPath;

  const thumbnail = getThumbnail(imgSeqPath);
  fs.copyFileSync(
    path.join(imgSeqPath, thumbnail),
    path.join(imgSeqPath, '..', path.basename(imgSeqPath) + '.jpg')
  );
  
  return await convertJPG2MP4(imgSeqPath);
}

export async function convertJPG2MP4(imageSeqPath: string) {
  const savePath = imageSeqPath.replace(path.basename(imageSeqPath), '');
  const outName = `${path.basename(imageSeqPath)}.mp4`;

  const images = fs.readdirSync(imageSeqPath);

  // Sort in chronological order
  images.sort((a: string, b: string) => {
    const timeA = momentFromFileName(a);
    const timeB = momentFromFileName(b);
    return timeA.diff(timeB);
  });

  const imageInputsFile = path.join(imageSeqPath, 'input.txt');
  let imageTime;
  let numInputs = 0;
  let str = '';
  let prevImageTime = momentFromFileName(images[0]);
  images.map((image, i) => {
    if (image == 'input.txt')
      return;

    imageTime = momentFromFileName(image);
    if (numInputs !== 0) {
      str += 'duration ' + imageTime.diff(prevImageTime, 'ms') / 1000 + '\n';
    }
    str += `file ${path.join(imageSeqPath, image)}\n`;
    prevImageTime = imageTime;
    numInputs++;
  });
  fs.writeFileSync(imageInputsFile, str);

  const videoPath = path.join(savePath, outName);
  console.log(videoPath);
  
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
    .addInput(imageInputsFile)
    .inputFormat('concat')
    .inputOptions('-safe 0')
    .outputOptions('-c:v h264_nvmpi')
    .output(videoPath)
    .on('start', (commandLine) => {
      console.log(commandLine);
    })
    .on('error', (err, stdout, stderr) => {
    })
    .on('end', (stdout, stderr) => {
      fs.rmSync(imageSeqPath, { recursive: true, force: true });
      resolve();
    })
    .run()
  });

  return path.join(savePath, outName);
}

export function getThumbnail(imgSeqPath: string) {
  const recordings = fs.readdirSync(imgSeqPath);

  const recordingsData = recordings.map((val) => { return {
    start: momentFromFileName(val.split('.')[0].split('-')[0]),
    name: val,
  }});

  recordingsData.sort((a: any, b: any) => a.start.diff(b.start))
  const thumbnail = recordingsData[Math.floor(recordingsData.length / 2)].name;

  return thumbnail;
}