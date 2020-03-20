let nnPolyfill, nnNative;
if (navigator.ml.isPolyfill) {
  nnNative = null;
  nnPolyfill = navigator.ml.getNeuralNetworkContext();
} else {
  nnNative = navigator.ml.getNeuralNetworkContext();
  nnPolyfill = navigator.ml_polyfill.getNeuralNetworkContext();
}

const getOS = () => {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
  let os = null;

  if (macosPlatforms.indexOf(platform) !== -1) {
    os = 'Mac OS';
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    os = 'iOS';
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    os = 'Windows';
  } else if (/Android/.test(userAgent)) {
    os = 'Android';
  } else if (!os && /Linux/.test(platform)) {
    os = 'Linux';
  }

  return os;
};

const currentOS = getOS();

const getNativeAPI = (preferString) => {
  // if you are going to modify the backend name, please change the
  // `backendEnums` in the `getDefaultSupportedOps` below
  const apiMapping = {
    'Android': {
      'sustained': 'NN',
      'fast': 'NN',
      'low': 'NN',
    },
    'Windows': {
      'sustained': 'clDNN',
      'fast': 'mklDNN',
    },
    'Linux': {
      'sustained': 'clDNN',
      'fast': 'mklDNN',
      'low': 'Myriad',
    },
    'Mac OS': {
      'fast': 'BNNS',
      'sustained': 'MPS',
    }
  };
  return apiMapping[currentOS][preferString];
}

const getSupportedOps = (backend, prefer) => {
  if (prefer === 'none' && backend !== 'WebML') {
    // if `prefer` is none, all ops should only run in polyfill
    return new Set();
  }

  // backend enums are defined in the `getNativeAPI` above
  const backendEnums =        { NN: 0,    MPS: 1,  BNNS: 2,  clDNN: 3, mklDNN: 4, DirectML: 5 };
  const supportedTable = {
    ADD:                      [ true,     true,    true,     true,     false,    true  ],
    ATROUS_CONV_2D:           [ false,    false,   false,    true,     true,     true  ],
    ATROUS_DEPTHWISE_CONV_2D: [ false,    false,   false,    true,     true,     true  ],
    AVERAGE_POOL_2D:          [ true,     true,    true,     true,     true,     true  ],
    CONCATENATION:            [ true,     true,    true,     true,     true,     true  ],
    CONV_2D:                  [ true,     true,    true,     true,     true,     true  ],
    DEPTHWISE_CONV_2D:        [ true,     true,    false,    true,     true,     true  ],
    FULLY_CONNECTED:          [ true,     true,    true,     true,     true,     true  ],
    MAX_POOL_2D:              [ true,     true,    true,     true,     true,     true  ],
    MUL:                      [ true,     true,    true,     true,     false,    true  ],
    RESHAPE:                  [ true,     true,    true,     true,     true,     true  ],
    RESIZE_BILINEAR:          [ true,     false,   true,     true,     false,    false ],
    SOFTMAX:                  [ true,     true,    true,     true,     true,     true  ],
    ARGMAX:                   [ false,    true,    false,    true,     false,    true  ]
  };

  const nn = navigator.ml.getNeuralNetworkContext();
  const supportedOps = new Set();
  const backendId = backendEnums[getNativeAPI(prefer)];

  for (const opName in supportedTable) {
    if (supportedTable[opName][backendId]) {
      supportedOps.add(nn[opName]);
    }
  }

  return supportedOps;
};

const operationTypes = {
   // Operation types.
   0: 'ADD',
   1: 'AVERAGE_POOL_2D',
   2: 'CONCATENATION',
   3: 'CONV_2D',
   4: 'DEPTHWISE_CONV_2D',
   5: 'DEPTH_TO_SPACE',
   6: 'DEQUANTIZE',
   7: 'EMBEDDING_LOOKUP',
   8: 'FLOOR',
   9: 'FULLY_CONNECTED',
   10: 'HASHTABLE_LOOKUP',
   11: 'L2_NORMALIZATION',
   12: 'L2_POOL_2D',
   13: 'LOCAL_RESPONSE_NORMALIZATION',
   14: 'LOGISTIC',
   15: 'LSH_PROJECTION',
   16: 'LSTM',
   17: 'MAX_POOL_2D',
   18: 'MUL',
   19: 'RELU',
   20: 'RELU1',
   21: 'RELU6',
   22: 'RESHAPE',
   23: 'RESIZE_BILINEAR',
   24: 'RNN',
   25: 'SOFTMAX',
   26: 'SPACE_TO_DEPTH',
   27: 'SVDF',
   28: 'TANH',
   29: 'BATCH_TO_SPACE_ND',
   37: 'TRANSPOSE',
   39: 'ARGMAX',
   65: 'MAXIMUM',
   10003: 'ATROUS_CONV_2D',
   10004: 'ATROUS_DEPTHWISE_CONV_2D'
};

const preferMap = {
  'MPS': 'sustained',
  'BNNS': 'fast',
  'sustained': 'SUSTAINED_SPEED',
  'fast': 'FAST_SINGLE_ANSWER',
  'low': 'LOW_POWER',
};


const getPreferParam = () => {
  // workaround for using MPS backend on Mac OS by visiting URL with 'prefer=sustained'
  // workaround for using BNNS backend on Mac OS by visiting URL with 'prefer=fast'
  // use 'sustained' as default for Mac OS
  var prefer = 'sustained';
  var parameterStr = window.location.search.substr(1);
  var reg = new RegExp("(^|&)prefer=([^&]*)(&|$)", "i");
  var r = parameterStr.match(reg);
  if (r != null) {
    prefer = unescape(r[2]);
    if (prefer !== 'fast' && prefer !== 'sustained') {
      prefer = 'invalid';
    }
  }

  return prefer;
}

const getPrefer = (backend) => {
  let nn = navigator.ml.getNeuralNetworkContext();
  let prefer = nn.PREFER_FAST_SINGLE_ANSWER;
  if (currentOS === 'Mac OS' && backend === 'WebML') {
    let urlPrefer = getPreferParam();
    if (urlPrefer === 'sustained') {
      prefer = nn.PREFER_SUSTAINED_SPEED;
    } else if (urlPrefer === 'fast') {
      prefer = nn.PREFER_FAST_SINGLE_ANSWER;
    }
  }
  return prefer;
}

const getPreferCode = (backend, prefer) => {
  let preferCode;
  let nn = navigator.ml.getNeuralNetworkContext();
  if (prefer === 'sustained') {
    preferCode = nn.PREFER_SUSTAINED_SPEED;
  } else if (prefer === 'fast') {
    preferCode = nn.PREFER_FAST_SINGLE_ANSWER;
  } else if (prefer === 'low') {
    preferCode = nn.PREFER_LOW_POWER;
  } else {
    preferCode = nn.PREFER_FAST_SINGLE_ANSWER;
  }
  return preferCode;
};

const parseSearchParams = (key) => {
  let searchParams = new URLSearchParams(location.search);
  return searchParams.get(key);
};

const hasSearchParam = (key) => {
  let searchParams = new URLSearchParams(location.search);
  return searchParams.has(key);
};

const getTensorArray = (image, options, layout = 'NHWC') => {
  let tensor = [];

  image.width = image.videoWidth || image.naturalWidth;
  image.height = image.videoHeight || image.naturalHeight;

  const [height, width, channels] = options.inputSize;
  const preOptions = options.preOptions || {};
  const mean = preOptions.mean || [0, 0, 0, 0];
  const std = preOptions.std || [1, 1, 1, 1];
  const normlizationFlag = preOptions.norm || false;
  const channelScheme = preOptions.channelScheme || 'RGB';
  const imageChannels = options.imageChannels || 4; // RGBA
  const drawOptions = options.drawOptions;

  let canvasElement = document.createElement('canvas');
  canvasElement.width = width;
  canvasElement.height = height;
  let canvasContext = canvasElement.getContext('2d');

  if (drawOptions) {
    canvasContext.drawImage(image, drawOptions.sx, drawOptions.sy, drawOptions.sWidth, drawOptions.sHeight,
      0, 0, drawOptions.dWidth, drawOptions.dHeight);
  } else {
    if (options.scaledFlag) {
      const resizeRatio = Math.max(Math.max(image.width, image.height) / width, 1);
      const scaledWidth = Math.floor(image.width / resizeRatio);
      const scaledHeight = Math.floor(image.width / resizeRatio);
      canvasContext.drawImage(image, 0, 0, scaledWidth, scaledHeight);
    } else {
      canvasContext.drawImage(image, 0, 0, width, height);
    }
  }

  let pixels = canvasContext.getImageData(0, 0, width, height).data;

  if (normlizationFlag) {
    pixels = new Float32Array(pixels).map(p => p / 255);
  }

  if (layout === 'NHWC') {
    if (channelScheme === 'RGB') {
      if (channels > 1) {
        for (let h = 0; h < height; ++h) {
          for (let w = 0; w < width; ++w) {
            for (let c = 0; c < channels; ++c) {
              let value = pixels[h * width * imageChannels + w * imageChannels + c];
              tensor[h * width * channels + w * channels + c] = (value - mean[c]) / std[c];
            }
          }
        }
      } else if (channels === 1) {
        for (let h = 0; h < height; ++h) {
          for (let w = 0; w < width; ++w) {
            for (let c = 0; c < channels; ++c) {
              let index = h * width * imageChannels + w * imageChannels + c;
              let value = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
              tensor[h * width * channels + w * channels + c] = (value - mean[c]) / std[c];
            }
          }
        }
      }
    } else if (channelScheme === 'BGR') {
      for (let h = 0; h < height; ++h) {
        for (let w = 0; w < width; ++w) {
          for (let c = 0; c < channels; ++c) {
            let value = pixels[h * width * imageChannels + w * imageChannels + (channels - c - 1)];
            tensor[h * width * channels + w * channels + c] = (value - mean[c]) / std[c];
          }
        }
      }
    } else {
      throw new Error(`Unsupport '${channelScheme}' Color Channel Scheme `);
    }
  } else if (layout === 'NCHW') {
    if (channelScheme === 'RGB') {
      for (let c = 0; c < channels; ++c) {
        for (let h = 0; h < height; ++h) {
          for (let w = 0; w < width; ++w) {
            let value = pixels[h * width * imageChannels + w * imageChannels + c];
            tensor[h * width * channels + w * channels + c] = (value - mean[c]) / std[c];
          }
        }
      }
    } else if (channelScheme === 'BGR') {
      for (let c = 0; c < channels; ++c) {
        for (let h = 0; h < height; ++h) {
          for (let w = 0; w < width; ++w) {
            let value = pixels[h * width * imageChannels + w * imageChannels + (channels - c - 1)];
            tensor[h * width * channels + w * channels + c] = (value - mean[c]) / std[c];
          }
        }
      }
    } else {
      throw new Error(`Unsupport '${channelScheme}' Color Channel Scheme `);
    }
  } else {
    throw new Error(`Unsupport '${channelScheme}' Layout`);
  }

  return tensor;
};

const downsampleAudioBuffer = (buffer, rate, baseRate) => {
  if (rate == baseRate) {
    return buffer;
  }

  if (baseRate > rate) {
    throw "downsampling rate show be smaller than original sample rate";
  }

  const sampleRateRatio = Math.round(rate / baseRate);
  const newLength = Math.round(buffer.length / sampleRateRatio);
  let abuffer = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < abuffer.length) {
    let nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    abuffer[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return abuffer;
};

const getAudioMfccs = (pcm,
                       sampleRate,
                       windowSize,
                       windowStride,
                       upperFrequencyLimit = 4000,
                       lowerFrequencyLimit = 20,
                       filterbankChannelCount = 40,
                       dctCoefficientCount = 13) => {
  let pcmPtr = Module._malloc(8 * pcm.length);
  let lenPtr = Module._malloc(4);

  for (let i = 0; i < pcm.length; i++) {
    Module.HEAPF64[pcmPtr / 8 + i] = pcm[i];
  };

  Module.HEAP32[lenPtr / 4] = pcm.length;
  let tfMfccs = Module.cwrap('tf_mfccs', 'number',
        ['number', 'number', 'number', 'number',
         'number', 'number', 'number', 'number', 'number']);
  let mfccsPtr = tfMfccs(pcmPtr, lenPtr, sampleRate, windowSize,
        windowStride, upperFrequencyLimit, lowerFrequencyLimit,
        filterbankChannelCount, dctCoefficientCount);
  let mfccsLen = Module.HEAP32[lenPtr >> 2];
  let audioMfccs = [mfccsLen];

  for (let i = 0; i < mfccsLen; i++) {
    audioMfccs[i] = Module.HEAPF64[(mfccsPtr >> 3) + i];
  }

  Module._free(pcmPtr, lenPtr, mfccsPtr);
  return audioMfccs;
};

const getTensorArrayByAudioAsync = async (audio, options) => {
  const sampleRate = options.sampleRate;
  const mfccsOptions = options.mfccsOptions;
  const inputSize = options.inputSize.reduce((a, b) => a * b);
  let tensor = new Array(inputSize).fill(0);
  let audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let rate = audioContext.sampleRate;

  let request = new Request(audio.src);
  let response = await fetch(request);
  let audioFileData = await response.arrayBuffer();
  let audioDecodeData = await audioContext.decodeAudioData(audioFileData);
  let audioPCMData = audioDecodeData.getChannelData(0);
  let abuffer = downsampleAudioBuffer(audioPCMData, rate, sampleRate);

  if (typeof mfccsOptions !== 'undefined') {
    abuffer = getAudioMfccs(abuffer,
                           sampleRate,
                           mfccsOptions.windowSize,
                           mfccsOptions.windowStride,
                           mfccsOptions.upperFrequencyLimit,
                           mfccsOptions.lowerFrequencyLimit,
                           mfccsOptions.filterbankChannelCount,
                           mfccsOptions.dctCoefficientCount);
  }

  if (abuffer.length >= inputSize) {
    for (let i = 0; i < inputSize; i++) {
      tensor[i] = abuffer[i];
    }
  } else {
    for (let i = 0; i < abuffer.length; i++) {
      tensor[i] = abuffer[i];
    }
  }

  return tensor;
};

const prepareOutputTensorSSD = (outputBoxTensor, outputClassScoresTensor, options) => {
  const numBoxes = options.numBoxes;
  const boxSize = options.boxSize;
  const numClasses = options.numClasses;
  let outputTensor = [];
  let boxOffset = 0;
  let classOffset = 0;
  let boxTensor;
  let classTensor;

  for (let i = 0; i < numBoxes.length; ++i) {
    boxTensor = outputBoxTensor.subarray(boxOffset, boxOffset + boxSize * numBoxes[i]);
    classTensor = outputClassScoresTensor.subarray(classOffset, classOffset + numClasses * numBoxes[i]);
    outputTensor[2 * i] = boxTensor;
    outputTensor[2 * i + 1] = classTensor;
    boxOffset += boxSize * numBoxes[i];
    classOffset += numClasses * numBoxes[i];
  }

  return outputTensor;
}

const deQuantizeOutputTensor = (outputBoxTensor, outputClassScoresTensor,
        deQuantizedOutputBoxTensor, deQuantizedOutputClassScoresTensor,
        deQuantizeParams, options) => {
  const numBoxes = options.numBoxes;
  const boxSize = options.boxSize;
  const numClasses = options.numClasses;
  let boxOffset = 0;
  let classOffset = 0;
  let dqBoxOffset = 0;
  let dqClassOffset = 0;
  let boxTensor, classTensor;
  let boxScale, boxZeroPoint, classScale, classZeroPoint;

  for (let i = 0; i < numBoxes.length; ++i) {
    boxTensor = outputBoxTensor.subarray(boxOffset, boxOffset + boxSize * numBoxes[i]);
    classTensor = outputClassScoresTensor.subarray(classOffset, classOffset + numClasses * numBoxes[i]);
    boxScale = deQuantizeParams[2 * i].scale;
    boxZeroPoint = deQuantizeParams[2 * i].zeroPoint;
    classScale = deQuantizeParams[2 * i + 1].scale;
    classZeroPoint = deQuantizeParams[2 * i + 1].zeroPoint;
    for (let j = 0; j < boxTensor.length; ++j) {
      deQuantizedOutputBoxTensor[dqBoxOffset] = boxScale* (boxTensor[j] - boxZeroPoint);
      ++dqBoxOffset;
    }
    for (let j = 0; j < classTensor.length; ++j) {
      deQuantizedOutputClassScoresTensor[dqClassOffset] = classScale * (classTensor[j] - classZeroPoint);
      ++dqClassOffset;
    }
    boxOffset += boxSize * numBoxes[i];
    classOffset += numClasses * numBoxes[i];
  }

  return [deQuantizedOutputBoxTensor, deQuantizedOutputClassScoresTensor];
};

const postOutputTensorAudio = (tensor) => {
  const tensorRuduceMax = Math.max.apply(null, tensor);
  const tensorExp = tensor.map((t) => Math.exp(t - tensorRuduceMax));
  const tensorSum = eval(tensorExp.join("+"));
  const outputTensor = tensorExp.map((e) => e / tensorSum )
  return outputTensor;
};

const getTopClasses = (tensor, labels, k = 5, deQuantizeParams = []) => {
  const probs = Array.from(tensor);
  const indexes = probs.map((prob, index) => [prob, index]);
  let sorted = indexes.sort((a, b) => {
    if (a[0] === b[0]) {
      return 0;
    }
    return a[0] < b[0] ? -1 : 1;
  });
  sorted.reverse();
  const classes = [];

  for (let i = 0; i < k; ++i) {
    let prob;
    if (deQuantizeParams.length > 0) {
      prob = deQuantizeParams[0].scale * (sorted[i][0] - deQuantizeParams[0].zeroPoint);
    } else {
      prob = sorted[i][0];
    }
    let index = sorted[i][1];
    let c = {
      label: labels[index],
      prob: (prob * 100).toFixed(2)
    }
    classes.push(c);
  }

  return classes;
};

const drawFaceRectangles = (image, canvas, faceRects, texts, canvasH) => {
  if (typeof canvasH !== 'undefined') {
    canvas.height = canvasH;
  }

  canvas.width = image.width / image.height * canvas.height;
  // draw image
  let ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  // draw face rectangles
  faceRects.forEach((rect, i) => {
    let x = rect[0] / image.height * canvas.height;
    let y = rect[1] / image.height * canvas.height;
    let w = rect[2] / image.height * canvas.height;
    let h = rect[3] / image.height * canvas.height;
    ctx.strokeStyle = "#009bea";
    ctx.fillStyle = "#009bea";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.font = "20px Arial";
    let text = texts[i];
    let width = ctx.measureText(text).width;
    if (x >= 2 && y >= parseInt(ctx.font, 10)) {
      ctx.fillRect(x - 2, y - parseInt(ctx.font, 10), width + 4, parseInt(ctx.font, 10));
      ctx.fillStyle = "white";
      ctx.textAlign = 'start';
      ctx.fillText(text, x, y - 3);
    } else {
      ctx.fillRect(x + 2, y, width + 4, parseInt(ctx.font, 10));
      ctx.fillStyle = "white";
      ctx.textAlign = 'start';
      ctx.fillText(text, x + 2, y + 15);
    }
  });
};

const drawKeyPoints = (image, canvas, keyPoints, rects) => {
  let ctx = canvas.getContext('2d');
  rects.forEach((rect, n) => {
    let keyPoint = keyPoints[n];
    for (let i = 0; i < 136; i = i + 2) {
      // decode keyPoint
      let x = (rect[2] * keyPoint[i] + rect[0]) / image.height * canvas.height;
      let y = (rect[3] * keyPoint[i + 1] + rect[1]) / image.height * canvas.height;
      // draw keyPoint
      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.closePath();
    }
  });
};

const getFRClass = (targetEmbeddings, searchEmbeddings, options) => {
  const euclideanDistance = (embeddings1, embeddings2) => {
    let embeddingSum = 0;

    for (let i = 0; i < embeddings1.length; i++) {
      embeddingSum = embeddingSum + Math.pow((embeddings1[i] - embeddings2[i]), 2);
    }

    return Math.sqrt(embeddingSum);
  };

  const cosineDistance = (embeddings1, embeddings2) => {
    let dotSum = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embeddings1.length; i++) {
      dotSum = dotSum + embeddings1[i] * embeddings2[i];
      norm1 = norm1 + Math.pow(embeddings1[i], 2);
      norm2 = norm2 + Math.pow(embeddings2[i], 2);
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    return 1 - dotSum / (norm1 * norm2);
  };

    // Embeddings L2-Normalization
  const L2Normalization = (embeddings) => {
    // norm(L2) = (|x0|^2 + |x1|^2 + |x2|^2 + |xi|^2)^1/2
    let embeddingSum = 0;

    for (let i = 0; i < embeddings.length; i++) {
      if (embeddings[i] !== 0) {
        embeddingSum = embeddingSum + Math.pow(Math.abs(embeddings[i]), 2);
      }
    }

    let L2 = Math.sqrt(embeddingSum);
    let embeddingsNorm = new Float32Array(embeddings.length);

    for (let i = 0; i < embeddings.length; i++) {
      if (embeddings[i] !== 0) {
        embeddingsNorm[i] = (embeddings[i] / L2).toFixed(10);
      } else {
        embeddingsNorm[i] = 0;
      }
    }

    return embeddingsNorm;
  };

  let results = new Array();
  let distanceMap = new Map();

  for (let i in targetEmbeddings) {
    for (let j in searchEmbeddings) {
      // Set default status 'unknown' as 'X'
      results[j] = 'X';
      let distance;
      if (options.distanceMetric === "euclidean") {
        let [...targetEmbeddingsTmp] = Float32Array.from(L2Normalization(targetEmbeddings[i]));
        let [...searchEmbeddingsTmp] = Float32Array.from(L2Normalization(searchEmbeddings[j]));
        distance = euclideanDistance(targetEmbeddingsTmp, searchEmbeddingsTmp);
      } else if (options.distanceMetric === "cosine") {
        distance = cosineDistance(targetEmbeddings[i], searchEmbeddings[j]);
      }
      if (!distanceMap.has(j)) distanceMap.set(j, new Map());
      distanceMap.get(j).set(i, distance);
    }
  }

  console.dir(distanceMap);

  for (let key1 of distanceMap.keys()) {
    let num = null;
    let minDis = null;
    for (let [key2, value2] of distanceMap.get(key1).entries()) {
      if (minDis == null) {
        num = key2;
        minDis = value2;
      } else {
        if (minDis > value2) {
          num = key2;
          minDis = value2;
        }
      }
    }

    if (results[key1] === 'X' && minDis < options.threshold) {
      results[key1] = parseInt(num) + 1;
    }
  }

  return results;
};
