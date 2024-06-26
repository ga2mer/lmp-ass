const JASSUB_PRELOAD_URL =
  "https://thaunknown.github.io/jassub/jassub/assets/jassub.umd.js";
const JASSUB_WORKER_URL =
  "https://gist.githubusercontent.com/ga2mer/694690297895f6641fb1a56e350cd8a2/raw/a10894004beaaddd35a958c3002e5931c0034436/jassub-worker.js";

const OCTOPUS_PRELOAD_URL =
  "https://libass.github.io/JavascriptSubtitlesOctopus/assets/js/subtitles-octopus.js";
const OCTOPUS_WORKER_URL =
  "https://gist.githubusercontent.com/ga2mer/694690297895f6641fb1a56e350cd8a2/raw/a10894004beaaddd35a958c3002e5931c0034436/octopus-worker.js";

let isJassub = false;

let preloadScriptUrl = OCTOPUS_PRELOAD_URL;
let preloadWorkerUrl = OCTOPUS_WORKER_URL;
try {
  const chromeVersion = /Chrome\/([0-9]+)/.exec(navigator.userAgent)[1];
  if (
    Lampa.Storage.get("ass_engine") !== "octopus" &&
    Number(chromeVersion) >= 80
  ) {
    preloadScriptUrl = JASSUB_PRELOAD_URL;
    preloadWorkerUrl = JASSUB_WORKER_URL;
    isJassub = true;
  }
} catch (e) {}

let currentSubs = [];
let currentInstance;
const forceDisableDemandRender =
  Lampa.Platform.is("tizen") ||
  Lampa.Platform.is("webos") ||
  /web0s|webos/i.test(window.navigator.userAgent);

const defaultSettingsValues = {
  demandRender: !forceDisableDemandRender,
};
let wfURL;

function destroyAss() {
  if (currentInstance) {
    if (isJassub) {
      currentInstance.destroy();
    } else {
      try {
        currentInstance.dispose();
      } catch (e) {}
    }
    currentInstance = null;
  }
}
// не опираемся на метод лампы, т.к. ловим гонку и лампа открывает свои сабы
function hideLampaSubs(hide) {
  document.querySelector(".player-video__subtitles").style.display = hide
    ? "none"
    : "";
}

function runAss() {
  let url;
  currentSubs.forEach((subs) => {
    if (url) {
      return;
    }
    if (
      subs.selected &&
      typeof subs.url === "string" &&
      subs.url.includes(".ass")
    ) {
      url = subs.url;
    } else {
      destroyAss();
    }
  });
  const currentPlayer = window.localStorage.getItem("player");
  const videoElement = document.querySelector(".player-video__video");
  if (
    videoElement &&
    (!currentPlayer || currentPlayer === "inner") &&
    typeof url === "string"
  ) {
    hideLampaSubs(true);
    if (isJassub) {
      // TO-DO: разные настройки для разных телевизоров
      const renderer = new JASSUB({
        video: videoElement,
        subUrl: url,
        workerUrl: wfURL,
        offscreenRender: false,
        blendMode: Lampa.Storage.get("ass_blend_mode", "js"),
        asyncRender: Lampa.Storage.get("ass_async_render", true),
        dropAllAnimations: Lampa.Storage.get("ass_drop_animation", true),
        dropAllBlur: Lampa.Storage.get("ass_drop_blur", true),
        onDemandRender: Lampa.Storage.get(
          "ass_demand_render",
          defaultSettingsValues.demandRender
        ),
        prescaleFactor: Number(Lampa.Storage.get("ass_prescale_factor", 0.8)),
        prescaleHeightLimit: Number(
          Lampa.Storage.get("ass_prescale_height", 1080)
        ),
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
    } else {
      const blendMode = Lampa.Storage.get("ass_blend_mode", "js");
      const renderMode = blendMode === "wasm" ? "wasm-blend" : "js-blend";
      var options = {
        video: videoElement,
        subUrl: url,
        renderMode,
        fallbackFont: "https://thaunknown.github.io/jassub/fonts/default.woff2",
        workerUrl: wfURL,
        prescaleFactor: Number(Lampa.Storage.get("ass_prescale_factor", 0.8)),
        prescaleHeightLimit: Number(
          Lampa.Storage.get("ass_prescale_height", 1080)
        ),
        dropAllAnimations: Lampa.Storage.get("ass_drop_animation", true),
      };
      const instance = new SubtitlesOctopus(options);
      currentInstance = instance;
    }
  } else {
    hideLampaSubs(false);
  }
}

function initPlugin() {
  const oldSetSubs = Lampa.PlayerPanel.setSubs;
  Lampa.PlayerPanel.setSubs = (subs) => {
    currentSubs = subs;
    oldSetSubs(currentSubs);
    runAss();
  };

  Lampa.PlayerPanel.listener.follow("subsview", (e) => {
    runAss();
  });

  Lampa.Player.listener.follow("destroy", (e) => {
    destroyAss();
  });
}

Lampa.Utils.putScriptAsync([preloadScriptUrl], async () => {
  // костыль потому что Worker работает только если скрипт находится на том же origin
  const source = await fetch(preloadWorkerUrl).then((res) => res.text());
  const functionStr = `function workerFunction() { ${source} }`;
  wfURL = URL.createObjectURL(
    new Blob(["(" + functionStr + ")()"], {
      type: "text/javascript",
    })
  );
  initPlugin();
});

(() => {
  const svgIcon = `<?xml version="1.0" encoding="utf-8"?>
  <svg fill="#ffffff" width="800px" height="800px" viewBox="0 0 32 32" id="icon" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:none;}</style></defs><title>closed-caption--alt</title><rect x="19" y="17" width="6" height="2"/><rect x="11" y="17" width="6" height="2"/><rect x="6" y="17" width="3" height="2"/><rect x="22" y="13" width="4" height="2"/><rect x="13" y="13" width="7" height="2"/><rect x="6" y="13" width="5" height="2"/><path d="M17.7358,30,16,29l4-7h6a1.9966,1.9966,0,0,0,2-2V8a1.9966,1.9966,0,0,0-2-2H6A1.9966,1.9966,0,0,0,4,8V20a1.9966,1.9966,0,0,0,2,2h9v2H6a3.9993,3.9993,0,0,1-4-4V8A3.9988,3.9988,0,0,1,6,4H26a3.9988,3.9988,0,0,1,4,4V20a3.9993,3.9993,0,0,1-4,4H21.1646Z"/><rect id="_Transparent_Rectangle_" data-name="&lt;Transparent Rectangle&gt;" class="cls-1" width="32" height="32"/></svg>`;

  Lampa.SettingsApi.addComponent({
    component: "ass",
    icon: svgIcon,
    name: "Субтитры ASS",
  });
  Lampa.SettingsApi.addParam({
    component: "ass",
    param: {
      name: "ass_engine",
      type: "select",
      values: {
        jassub: "JASSUB",
        octopus: "Octopus",
      },
      default: isJassub ? "jassub" : "octopus",
    },
    onChange: () => {
      Lampa.Noty.show("Требуется перезапуск для применения изменений");
    },
    field: {
      name: "Движок рендера",
      description:
        "JASSUB - современный движок рендера субтитров, лучше всего использовать на современных телевизорах. Octopus - более старый движок рендера, можно использовать если по какой-то причине JASSUB не работает",
    },
  });
  Lampa.SettingsApi.addParam({
    component: "ass",
    param: {
      name: "ass_blend_mode",
      type: "select",
      values: {
        js: "JS",
        wasm: "WASM",
      },
      default: "js",
    },
    field: {
      name: "Метод наложения",
      description:
        "WASM будет работать лучше на слабых устройствах, JS будет работать лучше, если устройство и браузер поддерживают аппаратное ускорение",
    },
  });
  Lampa.SettingsApi.addParam({
    component: "ass",
    param: {
      name: "ass_prescale_factor",
      type: "select",
      values: {
        0.1: "0.1",
        0.2: "0.2",
        0.3: "0.3",
        0.4: "0.4",
        0.5: "0.5",
        0.6: "0.6",
        0.7: "0.7",
        0.8: "0.8",
        0.9: "0.9",
        1.0: "1.0",
      },
      default: 0.8,
    },
    field: {
      name: "Масштабирование",
      description:
        "Уменьшите масштаб холста субтитров, чтобы повысить производительность за счет качества",
    },
  });
  Lampa.SettingsApi.addParam({
    component: "ass",
    param: {
      name: "ass_prescale_height",
      type: "select",
      values: {
        144: "144",
        240: "240",
        360: "360",
        480: "480",
        560: "560",
        720: "720",
        960: "960",
        1080: "1080",
      },
      default: 1080,
    },
    field: {
      name: "Масштабирование по высоте",
      description:
        "Высота в пикселях, после которой холст субтитров не будет масштабироваться.",
    },
  });
  Lampa.SettingsApi.addParam({
    component: "ass",
    param: {
      name: "ass_drop_animation",
      type: "trigger",
      default: true,
    },
    field: {
      name: "Отключить теги анимации",
      description:
        "Удаление анимированных тегов для увеличения производительности",
    },
  });
  if (isJassub) {
    Lampa.SettingsApi.addParam({
      component: "ass",
      param: {
        name: "ass_async_render",
        type: "trigger",
        default: true,
      },
      field: {
        name: "Отложенный рендер",
        description: "Разгружает CPU, создавая растровые изображения на GPU",
      },
    });
    Lampa.SettingsApi.addParam({
      component: "ass",
      param: {
        name: "ass_demand_render",
        type: "trigger",
        default: defaultSettingsValues.demandRender,
      },
      field: {
        name: "Рендер по запросу (DEV)",
        description:
          "Нужно ли отображать субтитры по мере того, как видеоплеер отображает кадры, а не предсказывать, на каком кадре находится плеер, используя события (отключено на WebOS и Tizen из-за плохой реализации необходимых API в ОС)",
      },
    });
    // добавить фпс
    Lampa.SettingsApi.addParam({
      component: "ass",
      param: {
        name: "ass_drop_blur",
        type: "trigger",
        default: true,
      },
      field: {
        name: "Отключить теги размытия",
        description: "Удаление тега размытия для увеличения производительности",
      },
    });
  }
})();
