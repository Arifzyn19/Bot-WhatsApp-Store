import { fileURLToPath } from "url";
import path, { dirname, join } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  pairing: "628195107972",

  owner: ["6288213503541", "6287891540792"],
  wm: "Fairy Moon © 2023",

  self: false,
};

export default config;

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(`Update ${__filename}`);
  import(__filename);
});
