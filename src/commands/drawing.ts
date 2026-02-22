import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "@/types/types.js";

export const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("추첨")
        .setDescription("추첨 명령어입니다.")
        .addIntegerOption(option => 
            option.setName('인원')
                .setDescription('추첨할 인원수를 입력하세요 (기본값: 1)')
                .setMinValue(1)),
    
    async execute(interaction: ChatInputCommandInteraction) {

        await interaction.deferReply();

        if (!interaction.guild) return;


        const count = interaction.options.getInteger('인원') || 1;

        let allMembers = interaction.guild.members.cache;

        if (allMembers.size === 0) {
            allMembers = await interaction.guild.members.fetch({ time: 10000 });
        }

        if (!allMembers) {
            await interaction.editReply( "멤버 정보를 불러오는 데 실패했습니다." );
            return;
        }

        const humanMembers = allMembers.filter(member => !member.user.bot);

        if (humanMembers.size < count) {
            await interaction.editReply(`현재 서버의 일반 유저(${humanMembers.size}명)보다 많은 인원을 추첨할 수 없습니다!`);
            return;
        }

        const winners = humanMembers.random(count);

        const winnerMentions = winners.map(m => `<@${m.id}>`).join(', ');

        await interaction.editReply({
            content: `🎉 **추첨 결과 (${count}명):**\n${winnerMentions}\n축하드립니다! 🎊`
        });
    }
}