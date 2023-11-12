/** using opencv.js version 4.8 */
const OPENCV_URL = 'opencv_480.js';

/**  function to load ai file */
const loadFileOnBrower = function(path, url, callback) {
  let request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = function(ev) {
    if (request.readyState === 4) {
      if (request.status === 200) {
        let data = new Uint8Array(request.response);
        cv.FS_createDataFile('/', path, data, true, false, false);
        callback();
      } else {
        self.printError('Failed to load ' + url + ' status: ' + request.status);
      }
    }
  }
  request.send();
}

/**  function to load opencv */
const loadOpenCv = function(onloadCallback) {
  let script = document.createElement('script');
  script.setAttribute('async', '');
  script.setAttribute('type', 'text/javascript');
  script.addEventListener('load', async()=>{
      if (cv.getBuildInformation) {
          console.log(cv.getBuildInformation());
          onloadCallback();
      } else {
          if (cv instanceof Promise) {
              cv = await cv;
              console.log(cv.getBuildInformation());
              onloadCallback();
          } else {
              cv['onRuntimeInitialized'] = ()=>{
                  console.log(cv.getBuildInformation());
                  onloadCallback();
              }
          }
      }
  }
  );
  script.addEventListener('error', ()=>{
      consoloe.log('Failed to load ' + OPENCV_URL);
  }
  );
  script.src = OPENCV_URL;
  let node = document.getElementsByTagName('script')[0];
  node.parentNode.insertBefore(script, node);
}

/** ai model file : for face recognition  */
var faceCascadeFile = 'haarcascade_frontalface_default.xml';

/** load opencv lib and ai model  */
loadOpenCv(()=>{
  console.log('LOADED OPENCV');
  loadFileOnBrower(faceCascadeFile, faceCascadeFile, ()=>{
    console.log('LOADED AI MODEL FILE : ' + faceCascadeFile);
  });
});