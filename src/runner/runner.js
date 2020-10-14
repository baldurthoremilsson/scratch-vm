class LoadingMiddleware {
    constructor () {
        this.middleware = [];
        this.host = null;
        this.original = null;
    }

    install (host, original) {
        this.host = host;
        this.original = original;
        const {middleware} = this;
        return function (...args) {
            let i = 0;
            const next = function (_args) {
                if (i >= middleware.length) {
                    return original.call(host, ..._args);
                }
                return middleware[i++](_args, next);
            };
            return next(args);
        };
    }

    push (middleware) {
        this.middleware.push(middleware);
    }
}

const importLoadCostume = require('../import/load-costume');
const costumeMiddleware = new LoadingMiddleware();
importLoadCostume.loadCostume = costumeMiddleware.install(importLoadCostume, importLoadCostume.loadCostume);

const importLoadSound = require('../import/load-sound');
const soundMiddleware = new LoadingMiddleware();
importLoadSound.loadSound = soundMiddleware.install(importLoadSound, importLoadSound.loadSound);

const VirtualMachine = require('..');
const ScratchStorage = require('scratch-storage');
const ScratchRender = require('scratch-render');
const AudioEngine = require('scratch-audio');
const ScratchSVGRenderer = require('scratch-svg-renderer');

window.addEventListener('DOMContentLoaded', event => {
  const startButton = document.querySelector('#start-button');
  const stopButton = document.querySelector('#stop-button');
  const canvas = document.querySelector('#scratch-stage');

  // Instantiate the VM.
  const vm = new VirtualMachine();
  window.vm = vm; // for debugging
  vm.setCompatibilityMode(true);
  vm.attachStorage(new ScratchStorage());
  vm.attachRenderer(new ScratchRender(canvas));
  vm.attachAudioEngine(new AudioEngine());
  vm.attachV2SVGAdapter(new ScratchSVGRenderer.SVGRenderer());
  vm.attachV2BitmapAdapter(new ScratchSVGRenderer.BitmapAdapter());

  startButton.addEventListener('click', e => {
    vm.greenFlag();
  });

  stopButton.addEventListener('click', e => {
    vm.stopAll();
  });

  document.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const coordinates = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height
    };
    vm.postIOData('mouse', coordinates);
  });

  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const data = {
      isDown: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height
    };
    vm.postIOData('mouse', data);
    e.preventDefault();
  });

  canvas.addEventListener('mouseup', e => {
    const rect = canvas.getBoundingClientRect();
    const data = {
      isDown: false,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height
    };
    vm.postIOData('mouse', data);
    e.preventDefault();
  });

  document.addEventListener('keydown', e => {
    if (e.target !== document && e.target !== document.body) {
      return;
    }
    const key = (!e.key || e.key === 'Dead') ? e.keyCode : e.key;
    vm.postIOData('keyboard', {
      key: key,
      isDown: true
    });
    e.preventDefault();
  });

  document.addEventListener('keyup', e => {
    // Always capture up events,
    // even those that have switched to other targets.
    const key = (!e.key || e.key === 'Dead') ? e.keyCode : e.key;
    vm.postIOData('keyboard', {
      key: key,
      isDown: false
    });
    // E.g., prevent scroll.
    if (e.target !== document && e.target !== document.body) {
      e.preventDefault();
    }
  });

  fetch('./hlaupoghopp.sb3')
    .then(response => response.arrayBuffer())
    .then(project => {
      vm.loadProject(project);
      vm.start();
      startButton.disabled = false;
      stopButton.disabled = false;
    });
});
