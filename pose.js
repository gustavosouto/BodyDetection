import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10";

function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * (180 / Math.PI));
    if (angle > 180) angle = 360 - angle;
    return angle;
}

function drawAngle(ctx, angle, center) {
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`${angle.toFixed(1)}°`, 0, 0);
    ctx.restore();
}

testSupport([{ client: 'Chrome' }]);

function testSupport(supportedDevices) {
    const deviceDetector = new DeviceDetector();
    const detectedDevice = deviceDetector.parse(navigator.userAgent);
    let isSupported = false;
    for (const device of supportedDevices) {
        if (device.client !== undefined) {
            const re = new RegExp(`^${device.client}$`);
            if (!re.test(detectedDevice.client.name)) continue;
        }
        if (device.os !== undefined) {
            const re = new RegExp(`^${device.os}$`);
            if (!re.test(detectedDevice.os.name)) continue;
        }
        isSupported = true;
        break;
    }
    if (!isSupported) {
        alert(`This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, is not well supported at this time.`);
    }
}

const controls = window;
const LandmarkGrid = window.LandmarkGrid;
const drawingUtils = window;
const mpPose = window;

const options = {
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${mpPose.VERSION}/${file}`;
    }
};

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');
const fpsControl = new controls.FPS();
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

const landmarkContainer = document.getElementsByClassName('landmark-grid-container')[0];
const grid = new LandmarkGrid(landmarkContainer, {
    connectionColor: 0xCCCCCC,
    definedColors: [{ name: 'LEFT', value: 0xffa500 }, { name: 'RIGHT', value: 0x00ffff }],
    range: 2,
    fitToGrid: true,
    labelSuffix: 'm',
    landmarkSize: 2,
    numCellsPerAxis: 4,
    showHidden: false,
    centered: true,
});

let activeEffect = 'mask';

function onResults(results) {
    document.body.classList.add('loaded');
    fpsControl.tick();
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.segmentationMask) {
        canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
        if (activeEffect === 'mask' || activeEffect === 'both') {
            canvasCtx.globalCompositeOperation = 'source-in';
            canvasCtx.fillStyle = '#00FF007F';
            canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        } else {
            canvasCtx.globalCompositeOperation = 'source-out';
            canvasCtx.fillStyle = '#0000FF7F';
            canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }
        canvasCtx.globalCompositeOperation = 'destination-atop';
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.globalCompositeOperation = 'source-over';
    } else {
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }

    if (results.poseLandmarks) {
        // Desenhar landmarks e conexões
        drawingUtils.drawConnectors(canvasCtx, results.poseLandmarks, mpPose.POSE_CONNECTIONS, { visibilityMin: 0.65, color: 'white' });
        drawingUtils.drawLandmarks(canvasCtx, Object.values(mpPose.POSE_LANDMARKS_LEFT)
            .map(index => results.poseLandmarks[index]), { visibilityMin: 0.65, color: 'white', fillColor: 'rgb(255,138,0)' });
        drawingUtils.drawLandmarks(canvasCtx, Object.values(mpPose.POSE_LANDMARKS_RIGHT)
            .map(index => results.poseLandmarks[index]), { visibilityMin: 0.65, color: 'white', fillColor: 'rgb(0,217,231)' });
        drawingUtils.drawLandmarks(canvasCtx, Object.values(mpPose.POSE_LANDMARKS_NEUTRAL)
            .map(index => results.poseLandmarks[index]), { visibilityMin: 0.65, color: 'white', fillColor: 'white' });

        // Cálculo do ângulo do ombro esquerdo
        const leftShoulder = results.poseLandmarks[mpPose.POSE_LANDMARKS.LEFT_SHOULDER];
        const leftElbow = results.poseLandmarks[mpPose.POSE_LANDMARKS.LEFT_ELBOW];
        const leftHip = results.poseLandmarks[mpPose.POSE_LANDMARKS.LEFT_HIP];
        const shoulderAngleLeft = calculateAngle(leftShoulder, leftElbow, leftHip);

        // Desenhar o ângulo do ombro esquerdo no canvas
        const centerLeft = { x: leftShoulder.x * canvasElement.width, y: leftShoulder.y * canvasElement.height };
        drawAngle(canvasCtx, shoulderAngleLeft, centerLeft);

        // Cálculo do ângulo do ombro direito
        const rightShoulder = results.poseLandmarks[mpPose.POSE_LANDMARKS.RIGHT_SHOULDER];
        const rightElbow = results.poseLandmarks[mpPose.POSE_LANDMARKS.RIGHT_ELBOW];
        const rightHip = results.poseLandmarks[mpPose.POSE_LANDMARKS.RIGHT_HIP];
        const shoulderAngleRight = calculateAngle(rightShoulder, rightElbow, rightHip);

        // Desenhar o ângulo do ombro direito no canvas
        const centerRight = { x: rightShoulder.x * canvasElement.width, y: rightShoulder.y * canvasElement.height };
        drawAngle(canvasCtx, shoulderAngleRight, centerRight);

        // Cálculo e exibição dos ângulos dos cotovelos
        const leftWrist = results.poseLandmarks[mpPose.POSE_LANDMARKS.LEFT_WRIST];
        const rightWrist = results.poseLandmarks[mpPose.POSE_LANDMARKS.RIGHT_WRIST];

        // Cotovelo esquerdo
        const elbowAngleLeft = calculateAngle(leftElbow, leftShoulder, leftWrist);
        const centerElbowLeft = { x: leftElbow.x * canvasElement.width, y: leftElbow.y * canvasElement.height };
        drawAngle(canvasCtx, elbowAngleLeft, centerElbowLeft);

        // Cotovelo direito
        const elbowAngleRight = calculateAngle(rightElbow, rightShoulder, rightWrist);
        const centerElbowRight = { x: rightElbow.x * canvasElement.width, y: rightElbow.y * canvasElement.height };
        drawAngle(canvasCtx, elbowAngleRight, centerElbowRight);

        // Cálculo e exibição dos ângulos do quadril
        const leftKnee = results.poseLandmarks[mpPose.POSE_LANDMARKS.LEFT_KNEE];
        const rightKnee = results.poseLandmarks[mpPose.POSE_LANDMARKS.RIGHT_KNEE];

        // Quadril esquerdo
        const hipAngleLeft = calculateAngle(leftHip, leftShoulder, leftKnee);
        const centerHipLeft = { x: leftHip.x * canvasElement.width, y: leftHip.y * canvasElement.height };
        drawAngle(canvasCtx, hipAngleLeft, centerHipLeft);

        // Quadril direito
        const hipAngleRight = calculateAngle(rightHip, rightShoulder, rightKnee);
        const centerHipRight = { x: rightHip.x * canvasElement.width, y: rightHip.y * canvasElement.height };
        drawAngle(canvasCtx, hipAngleRight, centerHipRight);

        // Cálculo e exibição dos ângulos dos tornozelos
        const leftAnkle = results.poseLandmarks[mpPose.POSE_LANDMARKS.LEFT_ANKLE];
        const rightAnkle = results.poseLandmarks[mpPose.POSE_LANDMARKS.RIGHT_ANKLE];

        // Tornozelo esquerdo
        const ankleAngleLeft = calculateAngle(leftKnee, leftHip, leftAnkle);
        const centerAnkleLeft = { x: leftAnkle.x * canvasElement.width, y: leftAnkle.y * canvasElement.height };
        drawAngle(canvasCtx, ankleAngleLeft, centerAnkleLeft);

        // Tornozelo direito
        const ankleAngleRight = calculateAngle(rightKnee, rightHip, rightAnkle);
        const centerAnkleRight = { x: rightAnkle.x * canvasElement.width, y: rightAnkle.y * canvasElement.height };
        drawAngle(canvasCtx, ankleAngleRight, centerAnkleRight);

        // Cálculo e exibição dos ângulos dos punhos
        const leftMiddleFinger = results.poseLandmarks[mpPose.POSE_LANDMARKS.LEFT_INDEX];
        const rightMiddleFinger = results.poseLandmarks[mpPose.POSE_LANDMARKS.RIGHT_INDEX];

        // Punho esquerdo
        const wristAngleLeft = calculateAngle(leftElbow, leftWrist, leftMiddleFinger);
        const centerWristLeft = { x: leftWrist.x * canvasElement.width, y: leftWrist.y * canvasElement.height };
        drawAngle(canvasCtx, wristAngleLeft, centerWristLeft);

        // Punho direito
        const wristAngleRight = calculateAngle(rightElbow, rightWrist, rightMiddleFinger);
        const centerWristRight = { x: rightWrist.x * canvasElement.width, y: rightWrist.y * canvasElement.height };
        drawAngle(canvasCtx, wristAngleRight, centerWristRight);

    }

    canvasCtx.restore();

    if (results.poseWorldLandmarks) {
        grid.updateLandmarks(results.poseWorldLandmarks, mpPose.POSE_CONNECTIONS, [
            { list: Object.values(mpPose.POSE_LANDMARKS_LEFT), color: 'LEFT' },
            { list: Object.values(mpPose.POSE_LANDMARKS_RIGHT), color: 'RIGHT' },
        ]);
    } else {
        grid.updateLandmarks([]);
    }
}

const pose = new mpPose.Pose(options);
pose.onResults(onResults);

new controls
    .ControlPanel(controlsElement, {
    selfieMode: true,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    effect: 'background',
})
    .add([
    new controls.StaticText({ title: 'Análise Corporal' }),
    fpsControl,
    new controls.Toggle({ title: 'Modo Selfie', field: 'selfieMode' }),
    new controls.SourcePicker({
        onSourceChanged: () => {
            pose.reset();
        },
        onFrame: async (input, size) => {
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
            } else {
                width = window.innerWidth;
                height = width * aspect;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            await pose.send({ image: input });
        },
    }),
    new controls.Slider({
        title: 'Complexidade do Modelo',
        field: 'modelComplexity',
        discrete: ['Leve', 'Completo', 'Pesado'],
    }),
    new controls.Toggle({ title: 'Pontos Corporais Suaves', field: 'smoothLandmarks' }),
    new controls.Toggle({ title: 'Ativar segmentação', field: 'enableSegmentation' }),
    new controls.Toggle({ title: 'Segmentação Suave', field: 'smoothSegmentation' }),
    new controls.Slider({
        title: 'Confiança Mín de Detecção',
        field: 'minDetectionConfidence',
        range: [0, 1],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Confiança Mín de Rastreamento',
        field: 'minTrackingConfidence',
        range: [0, 1],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Efeito',
        field: 'effect',
        discrete: { 'background': 'Fundo', 'mask': 'Primeiro Plano' },
    }),
])
    .on(x => {
    const options = x;
    videoElement.classList.toggle('selfie', options.selfieMode);
    activeEffect = x['effect'];
    pose.setOptions(options);
});
