// 版权声明和许可证信息
import { GestureRecognizer, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";  // 导入所需的模块
const demosSection = document.getElementById("demos");  // 获取 DOM 中的演示部分元素

// 声明变量
let gestureRecognizer;  // 手势识别器
let runningMode = "IMAGE";  // 手势识别器的默认运行模式为图像
let enableWebcamButton;  // 启用网络摄像头按钮
let webcamRunning = false;  // 网络摄像头运行状态

// 视频显示尺寸
const videoHeight = "360px";
const videoWidth = "480px";

// 创建手势识别器的异步函数
const createGestureRecognizer = async () => {
    // 解析视觉任务所需的文件
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    
    // 根据选项创建手势识别器
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
        },
        runningMode: runningMode
    });
    demosSection.classList.remove("invisible");  // 显示演示部分
};
createGestureRecognizer();  // 调用创建手势识别器的函数

/********************************************************************
// Demo 1: 检测图像中的手势
********************************************************************/
const imageContainers = document.getElementsByClassName("detectOnClick");  // 获取包含 detectOnClick 类的元素
for (let i = 0; i < imageContainers.length; i++) {
    // 为每个元素添加点击事件处理程序
    imageContainers[i].children[0].addEventListener("click", handleClick);
}
async function handleClick(event) {
    // 检查手势识别器是否已加载
    if (!gestureRecognizer) {
        alert("请等待手势识别器加载完毕");
        return;
    }
    // 切换到图像模式
    if (runningMode === "VIDEO") {
        runningMode = "IMAGE";
        await gestureRecognizer.setOptions({ runningMode: "IMAGE" });
    }
    // 移除先前的所有标记点
    const allCanvas = event.target.parentNode.getElementsByClassName("canvas");
    for (var i = allCanvas.length - 1; i >= 0; i--) {
        const n = allCanvas[i];
        n.parentNode.removeChild(n);
    }
    // 进行手势识别
    const results = gestureRecognizer.recognize(event.target);
    // 在控制台查看结果以查看其格式
    console.log(results);
    if (results.gestures.length > 0) {
        // 更新结果信息
        const p = event.target.parentNode.childNodes[3];
        p.setAttribute("class", "info");
        const categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(results.gestures[0][0].score * 100).toFixed(2);
        const handedness = results.handednesses[0][0].displayName;
        p.innerText = `手势识别器：${categoryName}\n 置信度：${categoryScore}%\n 手性：${handedness}`;
        p.style =
            "left: 0px;" +
            "top: " +
            event.target.height +
            "px; " +
            "width: " +
            (event.target.width - 10) +
            "px;";
        // 创建画布并绘制标记点
        const canvas = document.createElement("canvas");
        canvas.setAttribute("class", "canvas");
        canvas.setAttribute("width", event.target.naturalWidth + "px");
        canvas.setAttribute("height", event.target.naturalHeight + "px");
        canvas.style =
            "left: 0px;" +
            "top: 0px;" +
            "width: " +
            event.target.width +
            "px;" +
            "height: " +
            event.target.height +
            "px;";
        event.target.parentNode.appendChild(canvas);
        const canvasCtx = canvas.getContext("2d");
        const drawingUtils = new DrawingUtils(canvasCtx);
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 1
            });
        }
    }
}

/********************************************************************
// Demo 2: 连续从网络摄像头流中获取图像并进行检测。
********************************************************************/
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput = document.getElementById("gesture_output");

// 检查浏览器是否支持获取用户媒体
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// 如果浏览器支持网络摄像头，则为用户激活按钮添加事件侦听器
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
}
else {
    console.warn("您的浏览器不支持 getUserMedia()");
}

// 启用实时网络摄像头视图并开始检测。
function enableCam(event) {
    // 检查手势识别器是否已加载
    if (!gestureRecognizer) {
        alert("请等待手势识别器加载完毕");
        return;
    }
    // 切换预测状态
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "启用预测";
    }
    else {
        webcamRunning = true;
        enableWebcamButton.innerText = "停用预测";
    }
    // 获取用户媒体的参数
    const constraints = {
        video: true
    };
    // 激活网络摄像头流
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
}

let lastVideoTime = -1;
let results = undefined;

// 预

测网络摄像头
async function predictWebcam() {
    const webcamElement = document.getElementById("webcam");
    // 开始检测视频流
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }
    let nowInMs = Date.now();
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        results = gestureRecognizer.recognizeForVideo(video, nowInMs);
    }
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);
    canvasElement.style.height = videoHeight;
    webcamElement.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    webcamElement.style.width = videoWidth;
    if (results.landmarks) {
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
            });
        }
    }
    canvasCtx.restore();
    if (results.gestures.length > 0) {
        gestureOutput.style.display = "block";
        gestureOutput.style.width = videoWidth;
        const categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(results.gestures[0][0].score * 100).toFixed(2);
        const handedness = results.handednesses[0][0].displayName;
        gestureOutput.innerText = `手势识别器：${categoryName}\n 置信度：${categoryScore} %\n 手性：${handedness}`;
    }
    else {
        gestureOutput.style.display = "none";
    }
    // 当浏览器准备好时再次调用此函数以继续预测。
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}