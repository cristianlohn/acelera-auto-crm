import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve("public/vehicles");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const vehicles = [
  {
    name: "civic.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bf/HONDA_CIVIC_SEDAN_%28FC%2CFK%29_China.jpg",
  },
  {
    name: "corolla.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/61/2020_Toyota_Corolla_Sedan_XSE_%28NA%29%2C_Cleveland_Auto_Show.jpg",
  },
  {
    name: "compass.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Jeep_Compass_Limited_front_20080517.jpg",
  },
  {
    name: "tcross.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f0/2019_Volkswagen_T-Cross_R-Line_1.0_Front.jpg",
  },
  {
    name: "pulse.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a6/2022_Fiat_Pulse_Impetus_T200_%28Brazil%29_front_view.png",
  },
  {
    name: "onix.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/2021_Chevrolet_Onix_Sedan_1.0_Premier_Turbo_%28Colombia%29_front_view.png",
  },
  {
    name: "creta.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0a/2018_HYUNDAI_Creta_facelift_1.6_Brunei_%28front_shot_view%29.jpg",
  },
  {
    name: "hrv.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b9/2015_Honda_HR-V_%28front%29%2C_West_Surabaya.jpg",
  },
  {
    name: "corolla-cross.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/4c/2020_Toyota_Corolla_Cross_-_Front.jpg",
  },
  {
    name: "commander.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2d/Jeep_Commander_Front.jpg",
  },
  {
    name: "nivus.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Volkswagen_Nivus_Highline_%28Brazil%29_front_view_01.png",
  },
  {
    name: "tracker.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/2021_Chevrolet_Onix_Sedan_1.0_Premier_Turbo_%28Colombia%29_front_view.png",
  },
  {
    name: "fastback.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a6/2022_Fiat_Pulse_Impetus_T200_%28Brazil%29_front_view.png",
  },
  {
    name: "kicks.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/21/2018_Nissan_Kicks_SV_front_3.30.19.jpg",
  },
  {
    name: "bmw320i.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bf/HONDA_CIVIC_SEDAN_%28FC%2CFK%29_China.jpg",
  },
  {
    name: "kwid.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/85/Renault_-_Kwid_-_Kolkata_2016-01-31_9478.JPG",
  },
];

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "AceleraAutoCRM/1.0 (contato@aceleraautocrm.com.br) Node/fetch",
    },
  });
  if (!res.ok) {
    throw new Error(`Falha HTTP ${res.status} ao baixar ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(dest, buffer);
}

async function run() {
  for (const v of vehicles) {
    const filePath = path.join(targetDir, v.name);
    console.log(`Baixando ${v.name}...`);
    try {
      await download(v.url, filePath);
      const stats = fs.statSync(filePath);
      console.log(`✓ ${v.name} salvo com sucesso (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`✗ Erro ao baixar ${v.name}:`, err.message);
    }
  }
  console.log("✅ Todos os veículos reais foram salvos em /public/vehicles/ com sucesso!");
}

run().catch(console.error);
