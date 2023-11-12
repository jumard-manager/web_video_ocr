/** Frame Per Second*/
const FPS = 30;

var _src = null;
var _st0 = null; // for init Mat
var _st1 = null;
var _st2 = null;
var _st3 = null;
var _st4 = null;
var _st5 = null;
var _st6 = null;
var _st7 = null;
var _st8 = null; 
var _st9 = null;

var _cap = null;
var _faces = null;
var _contours  = null;
var _hierarchy = null;
var _cascade = null;
var _canvases = null;

function videoProcessorInitialize(video, canvases) {

  _canvases = canvases

  try {_src.delete();} catch(e){}
  try {_st0.delete();} catch(e){}
  try {_st1.delete();} catch(e){}
  try {_st2.delete();} catch(e){}
  try {_st3.delete();} catch(e){}
  try {_st4.delete();} catch(e){}
  try {_st5.delete();} catch(e){}
  try {_st6.delete();} catch(e){}
  try {_st7.delete();} catch(e){}
  try {_st8.delete();} catch(e){}
  try {_st9.delete();} catch(e){}

  try {_hierarchy.delete();} catch(e){}
  try {_cap.delete();} catch(e){}

  _src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  _st0 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st1 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st2 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st3 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st4 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st5 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st6 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st7 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st8 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st9 = new cv.Mat(video.height, video.width, cv.CV_8UC1);

  _cascade = new cv.CascadeClassifier();
  console.log('AI Model loaded : ' + _cascade.load('./haarcascade_frontalface_default.xml'));

  _faces     = new cv.RectVector();
  _contours  = new cv.MatVector();
  _hierarchy = new cv.Mat();
  _cap   = new cv.VideoCapture(video);
}

function vidioProcessing(canvases) {
  try {
    if (!streaming) {
        // clean and stop.
        _src.delete();
        _st0.delete();
        _st1.delete();
        _st2.delete();
        _st3.delete();
        _st4.delete();
        _st5.delete();
        _st6.delete();
        _st7.delete();
        _st8.delete();
        _st9.delete();
        _hierarchy.delete();
        _cap.delete();
        return;
    }

    let begin = Date.now();
    _cap.read(_src); // start processing.
    
    // step 1 gray
    cv.cvtColor(_src, _st1, cv.COLOR_RGBA2GRAY, 0);
    cv.imshow(_canvases.step1_, _st1);
    
    // step 2 GaussianBlur
    cv.GaussianBlur(_st1, _st2, new cv.Size(5,5,), 0, 0);
    cv.imshow(_canvases.step2_, _st2);

    // step 3 AdaptiveThreshold
    cv.adaptiveThreshold(
      _st2, 
      _st3, 
      255.0, 
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      19,
      9)
    cv.imshow(_canvases.step3_, _st3);

    // step 4 Find Contours
    cv.findContours(
      _st3,
      _contours, 
      _hierarchy,
      cv.RETR_LIST, 
      cv.CHAIN_APPROX_SIMPLE, 
      {x: 0,y: 0});

    _st4.data.set(_st0.data);
    cv.drawContours(
      _st4, 
      _contours, 
      -1, 
      new cv.Scalar(255, 255, 255));
    cv.imshow(_canvases.step4_, _st4);

    // step 5 Bounding Rect
    _st5.data.set(_st0.data);
    let wlimit = _st0.cols / 64;
    let hlimit = _st0.rows / 64;
    let _rectangles = [];
    for (let i=0; i < _contours.size(); ++i) {
      let rect = cv.boundingRect(_contours.get(i));
      let color = new cv.Scalar(255, 255, 255);
      if (rect.width > wlimit && rect.height > hlimit) {
        let point1 = new cv.Point(rect.x, rect.y);
        let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
        cv.rectangle(_st5, point1, point2, color, 2);
        _rectangles.push({
          'contour':_contours[i], 
          'x':rect.x,
          'y':rect.y,
          'w':rect.width,
          'h':rect.height,
          'cx': rect.x + (rect.width / 2),
          'cy': rect.y + (rect.height / 2)
        });
      }
    }
    cv.imshow(_canvases.step5_, _st5);


    
    let delay = 1000/FPS - (Date.now() - begin);
    setTimeout(vidioProcessing, delay);
  } catch (err) {
    console.log(err);
  }
}

function capture(destnation) {
  if (cv) cv.imshow(destnation, _src);
}