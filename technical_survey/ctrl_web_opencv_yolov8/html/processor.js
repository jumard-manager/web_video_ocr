/** Frame Per Second*/
const FPS = 30;

const ONNX = "yolov8m.onnx";

var _src = null;
var _st0 = null; // for init Mat
var _st1 = null;
var _st2 = null;
var _st3 = null;
var _st4 = null;

var _cap = null;
var _faces = null;
var _contours  = null;
var _hierarchy = null;
var _cascade = null;
var _canvases = null;

var _yoloModel = null

async function videoProcessorInitialize(video, canvases) {

  _canvases = canvases

  try {_src.delete();} catch(e){}
  try {_st0.delete();} catch(e){}
  try {_st1.delete();} catch(e){}
  try {_st2.delete();} catch(e){}
  try {_st3.delete();} catch(e){}
  try {_st4.delete();} catch(e){}

  try {_hierarchy.delete();} catch(e){}

  _src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  _st0 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st1 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st2 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st3 = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  _st4 = new cv.Mat(video.height, video.width, cv.CV_8UC1);

  const sessionOption = { executionProviders: ['webgl'] };
  _yoloModel = await ort.InferenceSession.create("yolov8m.onnx",sessionOption);

  _faces     = new cv.RectVector();
  _contours  = new cv.MatVector();
  _hierarchy = new cv.Mat();
  _cap       = new cv.VideoCapture(video);
}

async function vidioProcessing(canvases) {
  try {
    if (!streaming) {
        // clean and stop.
        _src.delete();
        _st0.delete();
        _st1.delete();
        _st2.delete();
        _st3.delete();
        _st4.delete();
        _hierarchy.delete();
        return;
    }

    let begin = Date.now();
    _cap.read(_src); // start processing.
    
    // step 1 gray
    cv.cvtColor(_src, _st1, cv.COLOR_RGBA2GRAY, 0);
    cv.imshow(_canvases.step1_, _st1);

    let dtcts = await detect_objects_on_image(_canvases.step1_);
    console.log(dtcts);

    _st2.data.set(_st1.data);

    dtcts.forEach(([x1,y1,x2,y2,label]) => {
      let color = new cv.Scalar(255, 0, 255);
      let point1 = new cv.Point(x1, y1);
      let point2 = new cv.Point(x2, y2);
      cv.rectangle(_st2, point1, point2, color, 2);
    });

    cv.imshow(_canvases.step2_, _st2);
    
    let delay = 1000/FPS - (Date.now() - begin);
    setTimeout(vidioProcessing, 2000);

  } catch (err) {
    console.log(err);
  }
}

function capture(destnation) {
  if (cv) cv.imshow(destnation, _src);
}

async function detect_objects_on_image(buf) {
  const [input,img_width,img_height] = await prepare_input(buf);
  const output = await run_model(input);
  return process_output(output,img_width,img_height);
}

async function prepare_input(canvasName) {
  const canvas  = document.getElementById(canvasName);
  const context = await canvas.getContext("2d");
  const imgData = await context.getImageData(0,0,640,640);
  const pixels = imgData.data;
  const red = [], green = [], blue = [];
  for (let index=0; index<pixels.length; index+=4) {
      red.push(pixels[index]/255.0);
      green.push(pixels[index+1]/255.0);
      blue.push(pixels[index+2]/255.0);
  }
  const input = [...red, ...green, ...blue];

  return [input, canvas.width, canvas.height];
}

async function run_model(input) {
  input = new ort.Tensor(Float32Array.from(input),[1, 3, 640, 640]);
  const outputs = await _yoloModel.run({images:input});
  return outputs["output0"].data;
}

function process_output(output, img_width, img_height) {
  let boxes = [];
  for (let index=0;index<8400;index++) {
      const [class_id,prob] = [...Array(80).keys()]
          .map(col => [col, output[8400*(col+4)+index]])
          .reduce((accum, item) => item[1]>accum[1] ? item : accum,[0,0]);
      if (prob < 0.5) {
          continue;
      }
      const label = yolo_classes[class_id];
      const xc = output[index];
      const yc = output[8400+index];
      const w = output[2*8400+index];
      const h = output[3*8400+index];
      const x1 = (xc-w/2)/640*img_width;
      const y1 = (yc-h/2)/640*img_height;
      const x2 = (xc+w/2)/640*img_width;
      const y2 = (yc+h/2)/640*img_height;
      boxes.push([x1,y1,x2,y2,label,prob]);
  }

  boxes = boxes.sort((box1,box2) => box2[5]-box1[5])
  const result = [];
  while (boxes.length>0) {
      result.push(boxes[0]);
      boxes = boxes.filter(box => iou(boxes[0],box)<0.7);
  }
  return result;
}

function iou(box1,box2) {
  return intersection(box1,box2)/union(box1,box2);
}

function intersection(box1,box2) {
  const [box1_x1,box1_y1,box1_x2,box1_y2] = box1;
  const [box2_x1,box2_y1,box2_x2,box2_y2] = box2;
  const x1 = Math.max(box1_x1,box2_x1);
  const y1 = Math.max(box1_y1,box2_y1);
  const x2 = Math.min(box1_x2,box2_x2);
  const y2 = Math.min(box1_y2,box2_y2);
  return (x2-x1)*(y2-y1)
}

function union(box1,box2) {
  const [box1_x1,box1_y1,box1_x2,box1_y2] = box1;
  const [box2_x1,box2_y1,box2_x2,box2_y2] = box2;
  const box1_area = (box1_x2-box1_x1)*(box1_y2-box1_y1)
  const box2_area = (box2_x2-box2_x1)*(box2_y2-box2_y1)
  return box1_area + box2_area - intersection(box1,box2)
}

const yolo_classes = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse',
  'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase',
  'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard',
  'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant',
  'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
  'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];