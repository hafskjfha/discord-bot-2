import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from "discord.js";
import type { BotCommand } from "@/types/types.js";
import { setWelcomeChannel } from "@/lib/welcome-db.js";

export const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName('환영채널설정')
        .setDescription('신규 유저 환영 메시지를 보낼 채널을 설정합니다.')
        .addChannelOption(option => 
            option.setName('채널')
                .setDescription('환영 인사를 보낼 채널을 선택하세요.')
                .addChannelTypes(ChannelType.GuildText) // 텍스트 채널만 선택 가능하게
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: '이 명령어는 서버에서만 사용할 수 있습니다.', ephemeral: true });
            return;
        }

        const channel = interaction.options.getChannel('채널');

        if (!channel || channel.type !== ChannelType.GuildText) {
             await interaction.reply({ content: '텍스트 채널을 선택해주세요.', ephemeral: true });
             return;
        }

        try {
            setWelcomeChannel(interaction.guildId, channel.id);
            await interaction.reply({ content: `✅ 환영 메시지가 <#${channel.id}> 채널로 설정되었습니다.`, ephemeral: true });
        } catch (error) {
            console.error('환영 메시지 설정 오류:', error);
            await interaction.reply({ content: '환영 메시지 설정 중 오류가 발생했습니다.', ephemeral: true });
        }
    }
}