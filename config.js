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
  
  gateway: {
    apikey: "dDTLWx3AKrXdDeZ71Wcgr5cnmY3V0qm6oRmcNKR0pRD9FPAOaSWSlg5nylHQYLUb",
    apiId: "Xl24K1LojQEaSMtO",
    secretKey: "Arifzyn19",
  },

  msg: {
    owner: "Features can only be accessed owner!",
    group: "Features only accessible in group!",
    private: "Features only accessible private chat!",
    admin: "Features can only be accessed by group admin!",
    botAdmin: "Bot is not admin, can't use the features!",
    bot: "Features only accessible by me",
    premium: "Features only accessible by premium users",
    media: "Reply media...",
    query: "No Query?",
    error:
      "Seems to have encountered an unexpected error, please repeat your command for a while again",
    quoted: "Reply message...",
    wait: "Wait a minute...",
    urlInvalid: "Url Invalid",
    notFound: "Result Not Found!",
  },
};

export default config;

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(`Update ${__filename}`);
  import(__filename);
});
