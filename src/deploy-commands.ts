// deploy-commands.ts
import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import "dotenv/config";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import type { BotCommand } from "@/types/types.js";
import { fileURLToPath, pathToFileURL } from "url";

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

// 📂 commands 폴더 안의 모든 파일을 읽어서 commands 배열에 추가
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => (file.endsWith(".js") || file.endsWith(".ts")) && !file.endsWith(".test.ts") && !file.startsWith("index"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const { command } = await import(pathToFileURL(filePath).href) as { command: BotCommand };

  if (command.data) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.warn(`⚠️ Skipped file: ${file}`);
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log("🔄 Registering application (/) commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commands }
    );

    console.log("✅ Successfully registered application commands.");
  } catch (error) {
    console.error(error);
  }
})();