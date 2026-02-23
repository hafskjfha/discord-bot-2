import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "@/types/types.js";

export const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("주사위")
        .setDescription("주사위를 굴리는 명령어입니다."),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const roll = Math.floor(Math.random() * 6) + 1;

        await interaction.editReply(`🎲 주사위를 굴렸습니다! 결과: **${roll}**`);
    }
}