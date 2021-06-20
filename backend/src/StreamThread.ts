import CamRecord from "@/CamRecord";
import { Worker, isMainThread } from "worker_threads";

if (isMainThread) {
  
}
else {
  // let fileWriter = new FileOnWrite({
  //   path: this.imagePath,
  //   ext: '.jpg',
  //   filename: (frame: any) => frame.time,
  //   transform: (frame: any) => frame.data,
  // });

  // this.camera = new MjpegCamera({
  //   url: `${this.camURL}/?action=stream`,
  // });

  // this.camera.pipe(fileWriter);
  // this.camera.start();
}