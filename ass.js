// TO-DO: инициализировать плагин только после загрузки этих двух скриптов

Lampa.Utils.putScriptAsync([
  "https://thaunknown.github.io/jassub/jassub/assets/jassub.umd.js",
]);

let currentSubs = [];

let wfURL;
// костыль потому что Worker нужен CORS
fetch("https://thaunknown.github.io/jassub/jassub/assets/jassub-worker.js").then((res) => res.text()).then((text) => {
  const functionStr = `function workerFunction() { ${text} }`;
  wfURL = URL.createObjectURL(
    new Blob(["(" + functionStr + ")()"], {
      type: "text/javascript",
    })
  );
})

const oldSetSubs = Lampa.PlayerPanel.setSubs;
let currentInstance;

function destroyAss() {
  if (currentInstance) {
    currentInstance.destroy();
    currentInstance = null;
  }
}

function runAss() {
  let url;
  let shouldSkip = false;
  currentSubs.forEach((subs) => {
    if (shouldSkip) {
      return;
    }
    if (subs.selected && subs?.url?.includes(".ass")) {
      url = subs.url;
      shouldSkip = true;
    } else {
      destroyAss();
    }
  });
  if (typeof url === "string") {
    Lampa.PlayerVideo.subsview(false);
    // TO-DO: конфигурация через настройки и разные настройки для разных телевизоров
    const renderer = new JASSUB({
      video: document.querySelector(".player-video__video"),
      subUrl: url,
      workerUrl: wfURL,
      offscreenRender: false,
      blendMode: "js",
      dropAllAnimations: true,
      dropAllBlur: true,
      onDemandRender: false,
      modernWasmUrl:
        "https://thaunknown.github.io/jassub/jassub/assets/jassub-worker-modern.wasm",
      wasmUrl:
        "https://thaunknown.github.io/jassub/jassub/assets/jassub-worker.wasm",
      availableFonts: {
        "liberation sans":
          "https://thaunknown.github.io/jassub/fonts/default.woff2",
      },
    });
    currentInstance = renderer;
    // временный костыль
    setTimeout(() => {
      Lampa.PlayerVideo.subsview(false);
    }, 1000);
  }
}

Lampa.PlayerPanel.setSubs = (subs) => {
  currentSubs = subs;
  runAss();
  return oldSetSubs(currentSubs);
};

Lampa.PlayerPanel.listener.follow("subsview", (e) => {
  runAss();
});

Lampa.Player.listener.follow("destroy", (e) => {
  destroyAss();
});
