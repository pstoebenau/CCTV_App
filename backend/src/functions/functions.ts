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

export async function checkAndConvertImgSeq(path: string) {
  if (fs.lstatSync(path).isFile())
    return path;
  
  return await convertJPG2MP4(path);
}

export async function convertJPG2MP4(imagePath: string) {
  const savePath = imagePath.replace(path.basename(imagePath), '');
  const outName = `${path.basename(imagePath)}.mp4`;

  const images = fs.readdirSync(imagePath);

  // Sort in chronological order
  images.sort((a: string, b: string) => {
    const timeA = momentFromFileName(a);
    const timeB = momentFromFileName(b);
    return timeA.diff(timeB);
  });

  const imageInputsFile = path.join(imagePath, 'input.txt');
  let imageTime;
  let numInputs = 0;
  let str = '';
  let prevImageTime = momentFromFileName(images[0]);
  images.map((image, i) => {
    imageTime = momentFromFileName(image);
    if (numInputs !== 0) {
      str += 'duration ' + imageTime.diff(prevImageTime, 'ms') / 1000 + '\n';
    }
    str += `file ${path.join(imagePath, image)}\n`;
    prevImageTime = imageTime;
    numInputs++;
  });
  fs.writeFileSync(imageInputsFile, str);

  const videoPath = path.join(savePath, outName);
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
    .addInput(imageInputsFile)
    .inputFormat('concat')
    .inputOptions('-safe 0')
    .output(videoPath)
    .on('start', (commandLine) => {
      console.log(commandLine);
    })
    .on('error', (err, stdout, stderr) => {
    })
    .on('end', (stdout, stderr) => {
      fs.rmSync(imagePath, { recursive: true, force: true });
      resolve();
    })
    .run()
  });

  return path.join(savePath, outName);
}
