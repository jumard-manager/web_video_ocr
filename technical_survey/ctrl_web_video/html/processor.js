/** Frame Per Second*/
const FPS = 30;

var _src = null;
var _gry = null;
var _bws = null;
var _dst = null; 
var _cap = null;
var _faces = null;
var _cascade = null;
var _canvases = null;

function videoProcessorInitialize(video, canvases) {

  _canvases = canvases

  try {_src.delete();} catch(e){}
  try {_gry.delete();} catch(e){}
  try {_bws.delete();} catch(e){}
  try {_fcd.delete();} catch(e){}
  try {_fcm.delete();} catch(e){}
  try {_dst.delete();} catch(e){}

  _src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  _gry = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _bws = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _fcd = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _fcm = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);

  _cascade = new cv.CascadeClassifier();
  console.log('AI Model loaded : ' + _cascade.load('./haarcascade_frontalface_default.xml'));

  _faces = new cv.RectVector();
  _cap   = new cv.VideoCapture(video);
}

function vidioProcessing(canvases) {
  try {
    if (!streaming) {
        // clean and stop.
        _src.delete();
        _gry.delete();
        _bws.delete();
        _fcd.delete();
        _fcm.delete();
        _dst.delete();
        return;
    }

    let begin = Date.now();
    _cap.read(_src); // start processing.
    
    // gray
    cv.cvtColor(_src, _gry, cv.COLOR_RGBA2GRAY, 0);
    cv.imshow(_canvases.rgbGrayOutput, _gry);
    
    // convert to bitwise_not
    cv.bitwise_not(_gry, _bws);
    cv.imshow(_canvases.bitwiseNotOutput, _bws);

    // face
    _src.copyTo(_fcd); // detacting
    _src.copyTo(_fcm); // mosaic
    let msize = new cv.Size(0, 0);
    _cascade.detectMultiScale(_gry, _faces, 1.1, 3, 0, msize, msize);
    
    for (let i = 0; i < _faces.size(); ++i) {
        let x = _faces.get(i).x;
        let y = _faces.get(i).y;
        let w = _faces.get(i).width;
        let h = _faces.get(i).height;
        
        let leftTop     = new cv.Point(x, y);
        let RightBottom = new cv.Point(x+w, y+h);
        cv.rectangle(_fcd, leftTop, RightBottom, [255, 255, 0, 255]);
        
        let faceRoi = _fcm.roi(_faces.get(i));
        
        let tmpMats =  new cv.Mat();
        cv.resize(faceRoi, tmpMats, new cv.Size(5, 5), 0, 0, cv.INTER_AREA);  // reduction
        
        let tmpMatb =  new cv.Mat();
        cv.resize(tmpMats, tmpMatb, new cv.Size(w, h), 0, 0, cv.INTER_CUBIC); //expansion
        tmpMatb.copyTo(_fcm.roi(new cv.Rect(x, y, w, h)));
        
        tmpMats.delete();
        tmpMatb.delete();
        faceRoi.delete();
    }
    cv.imshow(_canvases.faceDetectOutput, _fcd);
    cv.imshow(_canvases.faceMosaicOutput, _fcm);
    
    let delay = 1000/FPS - (Date.now() - begin);
    setTimeout(vidioProcessing, delay);
  } catch (err) {
    console.log(err);
  }
}

function capture(destnation) {
  if (cv) cv.imshow(destnation, _src);
}