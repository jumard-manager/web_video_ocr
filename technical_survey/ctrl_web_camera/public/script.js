window.addEventListener("load", (event) => {
  if (!("mediaDevices" in navigator)) return;
  navigator.mediaDevices.enumerateDevices().then((mediaDevices) => {
    while (cameraSelect.options.length > 0) {
      cameraSelect.remove(0);
    }
    const defaultOption = document.createElement("option");
    defaultOption.id = "default";
    defaultOption.textContent = "(default camera) ";
    cameraSelect.appendChild(defaultOption);

    const videoInputDevices = mediaDevices.filter(
      (mediaDevice) => mediaDevice.kind == "videoinput"
    );
    if (videoInputDevices.length > 0) {
      cameraSelect.disabled = false;
    }
    videoInputDevices.forEach((videoInputDevice, index) => {
      if (!videoInputDevice.deviceId) {
        return;
      }
      const option = document.createElement("option");
      option.id = videoInputDevice.deviceId;
      option.textContent = videoInputDevice.label || `Camera ${index + 1}`;
      option.selected = deviceId == option.id;
      cameraSelect.appendChild(option);
    });
  });
});

let deviceId = "default";
cameraSelect.onchange = (_) => {
  let selectedCam = cameraSelect.selectedOptions[0];
  deviceId = selectedCam.id;
  console.log(selectedCam.value);
};

getUserMediaVideoButton.onclick = (_) => getUserMedia({ video: { pan: true, zoom: 200, tilt: true} });

async function getUserMedia(constraints) {
  const sanitizedConstraints = { ...constraints };
  if (deviceId != "default" && deviceId != "") {
    constraints.video = {
      ...constraints.video,
      ...{ deviceId: { exact: deviceId } },
    };
    sanitizedConstraints.video = {
      ...constraints.video,
      ...{ deviceId: { exact: `${deviceId.substring(0, 4)}...` } },
    };
  }

  const prefix = `navigator.mediaDevices.getUserMedia(${JSON.stringify(
    sanitizedConstraints
  )})`;

  try {
    if (getUserMediaVideoButton.innerText=="Start") {
      if (video.srcObject) {
        video.srcObject.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
      if (isDebug()) log(`> Calling ${prefix}`);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const [videoTrack] = stream.getVideoTracks();
      log(`${prefix} -> "${videoTrack.label}"`);

      videoTrack.onmute = (_) => {
        log(`videoTrack.onmute -> source is temporarily unable to provide data.`);
      };
      videoTrack.onunmute = (_) => {
        log(`videoTrack.onunmute -> source is live again.`);
      };

      video.srcObject = stream;
      updateButtons();
      getUserMediaVideoButton.innerText="Stop";
    } else {
      if (video.srcObject) {
        video.srcObject.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
      getUserMediaVideoButton.innerText="Start";
    }
  } catch (error) {
    log(
      `⚠️ ${prefix} -> ${error.name}${
        error.message ? ' "' + error.message + '"' : ""
      }`
    );
  }
}

function updateButtons() {
  const stream = video.srcObject;
  if (!stream) {
    document
      .querySelectorAll(`[data-name]`)
      .forEach((item) => (item.disabled = true));
    return;
  }
  const [videoTrack] = stream.getVideoTracks();
  const capabilities =
    "getCapabilities" in videoTrack ? videoTrack.getCapabilities() : {};
  const settings = videoTrack.getSettings();

  log(
    `videoTrack.getConstraints() -> ${JSON.stringify(
      videoTrack.getConstraints()
    )}`
  );

  if ("getCapabilities" in videoTrack) {
    log(`videoTrack.getCapabilities() -> ${JSON.stringify(capabilities)}`);
  } else {
    log(`⚠️ "getCapabilities" in videoTrack -> false`);
  }

  log(`videoTrack.getSettings() -> ${JSON.stringify(settings)}`);

  ["pan", "tilt", "zoom"].forEach((name) => {
    if (name in capabilities) {
      log(
        `videoTrack.getCapabilities().${name} -> { min: ${capabilities[name].min}, max: ${capabilities[name].max}, step: ${capabilities[name].step} }`
      );
      log(`videoTrack.getSettings().${name} -> ${settings[name]}`);
    } else {
      log(`⚠️ "${name}" in videoTrack.getCapabilities() -> false`);
    }

    const ranges = Array.from(
      document.querySelectorAll(`input[data-name="${name}"]`)
    );
    ranges.forEach((range) => {
      range.disabled = !(name in capabilities);
    });

    if (name in capabilities) {
      ranges.forEach((range) => {
        range.oninput = onRangeChange;
      });
      if (name == "pan") {
        panRange.min = capabilities.pan.min;
        panRange.max = capabilities.pan.max;
        panRange.step = capabilities.pan.step;
        panRange.value = settings.pan;
      } else if (name == "tilt") {
        tiltRange.min = capabilities.tilt.min;
        tiltRange.max = capabilities.tilt.max;
        tiltRange.step = capabilities.tilt.step;
        tiltRange.value = settings.tilt;
      } else if (name == "zoom") {
        zoomRange.min = capabilities.zoom.min;
        zoomRange.max = capabilities.zoom.max;
        zoomRange.step = capabilities.zoom.step;
        zoomRange.value = settings.zoom;
      }
    }
  });

  async function onRangeChange(event) {
    const name = event.target.dataset.name;
    const constraint = parseFloat(event.target.value);
    const constraints = { advanced: [{}] };
    constraints.advanced[0][name] = constraint.toFixed(1);
    const applyConstraints = `videoTrack.applyConstraints : {"advanced": [{"${name}": ${constraint.toFixed(
      1
    )}}]}`;
    try {
      console.log(constraints);
      await videoTrack.applyConstraints(constraints);
      log(`${applyConstraints} -> success`);
    } catch (error) {
      log(`⚠️ ${applyConstraints} -> ${error.message}`);
    }
  }
}

/* picture-in-picture */
video.onclick = async (event) => {
  if (!document.pictureInPictureEnabled) return;
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture();
  } else {
    video.requestPictureInPicture();
  }
};


/* utils */
function log(text) {
  logs.scrollTop = 0;
  const pre = document.createElement("pre");
  pre.textContent = `${maybeAddTimestamp()}${text}`;
  logs.insertBefore(pre, logs.firstChild);
}

function isDebug() {
  const params = new URLSearchParams(location.search);
  return params.has("debug");
}

function maybeAddTimestamp() {
  if (isDebug()) {
    return `${new Date().toISOString().slice(11, -1)} | `;
  }
  return "";
}
