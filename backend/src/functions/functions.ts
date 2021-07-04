import moment from "moment";

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