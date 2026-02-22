import { type Interaction } from 'discord.js';
import botClient from './client.js';
import 'dotenv/config';
import {
    pingCommand,
    drawingCommand,
    auctionCommand,
    handleAuctionButton,
    handleAuctionModal,
    isAuctionButtonInteraction,
    isAuctionModalInteraction,
    tradeCommand,
    handleTradeButton,
    handleTradeSelect,
    isTradeButtonInteraction,
    isTradeSelectInteraction,
} from '@/commands/index.js';

botClient.on('clientReady', async () => {
    console.log(`Logged in as ${botClient.user?.tag}!`);

    for (const guild of botClient.guilds.cache.values()) {
        await guild.members.fetch().catch(console.error);
    }
    console.log('✅ All guild members have been cached.');
});


botClient.on("interactionCreate", async (interaction: Interaction) => {
    // 경매 버튼 인터랙션 처리
    if (interaction.isButton() && isAuctionButtonInteraction(interaction.customId)) {
        try {
            await handleAuctionButton(interaction);
        } catch (error) {
            console.error("경매 버튼 처리 오류:", error);
        }
        return;
    }

    // 경매 모달 인터랙션 처리
    if (interaction.isModalSubmit() && isAuctionModalInteraction(interaction.customId)) {
        try {
            await handleAuctionModal(interaction);
        } catch (error) {
            console.error("경매 모달 처리 오류:", error);
        }
        return;
    }

    // 거래소/교환소 버튼 인터랙션 처리
    if (interaction.isButton() && isTradeButtonInteraction(interaction.customId)) {
        try {
            await handleTradeButton(interaction);
        } catch (error) {
            console.error("거래 버튼 처리 오류:", error);
        }
        return;
    }

    // 거래소/교환소 셀렉트 메뉴 인터랙션 처리
    if (interaction.isStringSelectMenu() && isTradeSelectInteraction(interaction.customId)) {
        try {
            await handleTradeSelect(interaction);
        } catch (error) {
            console.error("거래 셀렉트 처리 오류:", error);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    console.log(`Received command: ${interaction.commandName} from ${interaction.user.tag}`);

    try {
        if (interaction.commandName === pingCommand.data.name) {
            await pingCommand.execute(interaction);
        } else if (interaction.commandName === drawingCommand.data.name) {
            await drawingCommand.execute(interaction);
        } else if (interaction.commandName === auctionCommand.data.name) {
            await auctionCommand.execute(interaction);
        } else if (interaction.commandName === tradeCommand.data.name) {
            await tradeCommand.execute(interaction);
        } else {
            console.warn(`No handler found for command: ${interaction.commandName}`);
            await interaction.reply({ content: "❌ 이 명령어는 아직 구현되지 않았습니다.", ephemeral: true });
        }
    } catch (error) {
        console.error(error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "명령어 실행 중 오류가 발생했습니다.", ephemeral: true });
            } else {
                await interaction.reply({ content: "명령어 실행 중 오류가 발생했습니다.", ephemeral: true });
            }
        } catch (sendErr) {
            console.error("❌ 오류 응답 전송 실패:", sendErr);
        }
    }
});


botClient.login(process.env.DISCORD_TOKEN!);