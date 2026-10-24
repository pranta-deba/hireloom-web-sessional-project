/**
 * TensorFlow Lite in the browser (tfjs-tflite, WASM).
 * Runtime scripts are loaded on demand from jsDelivr so they never bloat the main bundle.
 */
const CDN = {
  core: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.9.0/dist/tf-core.min.js',
  cpu: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-cpu@4.9.0/dist/tf-backend-cpu.min.js',
  tflite: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/tf-tflite.min.js',
};

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });

let runtime = null;
export async function loadRuntime(wasmPath) {
  if (runtime) return runtime;
  await loadScript(CDN.core);
  await loadScript(CDN.cpu);
  await loadScript(CDN.tflite);
  const { tf, tflite } = window;
  if (!tf || !tflite) throw new Error('TensorFlow Lite runtime unavailable.');
  if (wasmPath) tflite.setWasmPath(wasmPath);
  await tf.ready();
  runtime = { tf, tflite };
  return runtime;
}

export async function loadLabels(url) {
  try {
    const txt = await (await fetch(url)).text();
    return txt.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Builds a classifier around any image-classification .tflite model.
 * Adapts to the model's input size / dtype and to 1000 vs 1001-class outputs.
 */
export async function createClassifier({ modelUrl, labelsUrl, wasmPath }) {
  const { tf, tflite } = await loadRuntime(wasmPath);
  const [model, labels] = await Promise.all([tflite.loadTFLiteModel(modelUrl), loadLabels(labelsUrl)]);
  const input = model.inputs[0];
  const [, h = 224, w = 224] = input.shape || [];
  const dtype = input.dtype || 'float32';

  function classify(source, topK = 5) {
    const t0 = performance.now();
    const out = tf.tidy(() => {
      let img = tf.browser.fromPixels(source);
      img = tf.image.resizeBilinear(img, [h, w]);
      img = dtype === 'float32' ? tf.div(tf.sub(img, 127.5), 127.5) : tf.cast(img, 'int32');
      const res = model.predict(tf.expandDims(img, 0));
      const tensor = Array.isArray(res) ? res[0] : res.dataSync ? res : Object.values(res)[0];
      let probs = tf.squeeze(tensor);
      if (probs.dtype !== 'float32') probs = tf.div(tf.cast(probs, 'float32'), 255);
      const max = probs.max().dataSync()[0];
      const min = probs.min().dataSync()[0];
      if (max > 1 || min < 0) probs = tf.softmax(probs);
      return probs.dataSync();
    });
    const offset = labels.length === out.length + 1 ? 1 : 0;
    const ranked = Array.from(out)
      .map((p, i) => ({ label: labels[i + offset] || `class ${i}`, p }))
      .sort((a, b) => b.p - a.p)
      .slice(0, topK);
    return { ranked, ms: Math.round(performance.now() - t0) };
  }

  return { classify, inputSize: [w, h], dtype };
}
