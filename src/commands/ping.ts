import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import type { BotCommand } from "@/types/types.js";

export const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("핑 명렁어 입니다."),

    async execute(interaction: CommandInteraction) {
        const start = Date.now();

        await interaction.deferReply();

        const latency = Date.now() - start;
        const apiLatency = Math.round(interaction.client.ws.ping);

        await interaction.editReply(`🏓 Pong! 처리 시간: ${latency}ms | API 지연: ${apiLatency}ms`);
    },
};