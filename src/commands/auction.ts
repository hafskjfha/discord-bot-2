import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonInteraction,
    ModalSubmitInteraction,
    MessageFlags,
    TextBasedChannel,
} from "discord.js";
import type { BotCommand } from "@/types/types.js";

// ─── 타입 정의 ───

interface BidRecord {
    userId: string;
    userName: string;
    amount: number;
    timestamp: number;
}

interface Auction {
    id: string;
    hostId: string;
    hostName: string;
    itemName: string;
    startPrice: number;
    minBidIncrement: number;
    currentPrice: number;
    highestBidderId: string | null;
    highestBidderName: string | null;
    durationMinutes: number;
    endTime: number;
    bidHistory: BidRecord[];
    channelId: string;
    messageId: string | null;
    endTimer: NodeJS.Timeout | null;
    updateInterval: NodeJS.Timeout | null;
    ended: boolean;
}

// ─── 활성 경매 저장소 ───

const activeAuctions = new Map<string, Auction>();

// ─── 다음 최소 입찰가 계산 ───

function getNextMinBid(auction: Auction): number {
    return auction.highestBidderId
        ? auction.currentPrice + auction.minBidIncrement
        : auction.startPrice;
}

// ─── 임베드 생성 ───

function buildAuctionEmbed(auction: Auction): EmbedBuilder {
    const timeLeftMs = Math.max(0, auction.endTime - Date.now());
    const minutes = Math.floor(timeLeftMs / 60_000);
    const seconds = Math.floor((timeLeftMs % 60_000) / 1_000);

    const color = auction.ended
        ? auction.highestBidderId ? 0x57F287 : 0xED4245   // 녹색(낙찰) / 빨강(유찰)
        : 0xFEE75C;                                        // 노란색(진행 중)

    const embed = new EmbedBuilder()
        .setTitle(`🔨  경매: ${auction.itemName}`)
        .setColor(color)
        .addFields(
            { name: "📦 아이템",       value: auction.itemName, inline: true },
            { name: "💰 시작 가격",    value: `${auction.startPrice.toLocaleString()}원`, inline: true },
            { name: "📊 최소 입찰 단위", value: `${auction.minBidIncrement.toLocaleString()}원`, inline: true },
            {
                name: "💵 현재 최고 입찰가",
                value: auction.highestBidderId
                    ? `**${auction.currentPrice.toLocaleString()}원**`
                    : "입찰 없음",
                inline: true,
            },
            {
                name: "👤 최고 입찰자",
                value: auction.highestBidderId ? `<@${auction.highestBidderId}>` : "없음",
                inline: true,
            },
            {
                name: "⏱️ 남은 시간",
                value: auction.ended ? "**종료됨**" : `${minutes}분 ${seconds}초`,
                inline: true,
            },
        )
        .setFooter({ text: `주최자: ${auction.hostName}  •  총 입찰 ${auction.bidHistory.length}회` })
        .setTimestamp();

    // 최근 입찰 내역 (최대 5건)
    if (auction.bidHistory.length > 0) {
        const recent = auction.bidHistory
            .slice(-5)
            .reverse()
            .map((b, i) => `\`${i + 1}.\` **${b.userName}** — ${b.amount.toLocaleString()}원`)
            .join("\n");
        embed.addFields({ name: "📜 최근 입찰 내역", value: recent });
    }

    // 종료 메시지
    if (auction.ended) {
        embed.setDescription(
            auction.highestBidderId
                ? `🎉 **낙찰!** <@${auction.highestBidderId}>님이 **${auction.currentPrice.toLocaleString()}원**에 낙찰받았습니다!`
                : "❌ **유찰!** 입찰자가 없어 경매가 유찰되었습니다.",
        );
    }

    return embed;
}

// ─── 버튼 생성 ───

function buildAuctionButtons(auction: Auction): ActionRowBuilder<ButtonBuilder> {
    const nextBid = getNextMinBid(auction);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`auction_bid_${auction.id}`)
            .setLabel(`입찰 (${nextBid.toLocaleString()}원)`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji("💰")
            .setDisabled(auction.ended),
        new ButtonBuilder()
            .setCustomId(`auction_custom_${auction.id}`)
            .setLabel("금액 직접 입력")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("✏️")
            .setDisabled(auction.ended),
        new ButtonBuilder()
            .setCustomId(`auction_end_${auction.id}`)
            .setLabel("경매 종료")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🛑")
            .setDisabled(auction.ended),
    );
}

// ─── 경매 종료 처리 ───

function finalizeAuction(auction: Auction) {
    auction.ended = true;
    if (auction.endTimer) clearTimeout(auction.endTimer);
    if (auction.updateInterval) clearInterval(auction.updateInterval);
}

function buildResultMessage(auction: Auction): string {
    return auction.highestBidderId
        ? `🎉 **경매 종료!** **${auction.itemName}**이(가) <@${auction.highestBidderId}>님에게 **${auction.currentPrice.toLocaleString()}원**에 낙찰되었습니다!`
        : `❌ **경매 종료!** **${auction.itemName}** 경매가 유찰되었습니다.`;
}

async function fetchAuctionChannel(auction: Auction, client: import("discord.js").Client): Promise<TextBasedChannel | null> {
    try {
        const ch = await client.channels.fetch(auction.channelId);
        if (ch?.isTextBased()) return ch as TextBasedChannel;
    } catch { /* ignore */ }
    return null;
}

async function editAuctionMessage(auction: Auction, channel: TextBasedChannel) {
    if (!auction.messageId) return;
    try {
        const msg = await channel.messages.fetch(auction.messageId);
        await msg.edit({
            embeds: [buildAuctionEmbed(auction)],
            components: auction.ended ? [] : [buildAuctionButtons(auction)],
        });
    } catch (err) {
        console.error("경매 메시지 수정 실패:", err);
    }
}

// ─── 버튼 인터랙션 핸들러 ───

export async function handleAuctionButton(interaction: ButtonInteraction) {
    const { customId } = interaction;

    let action: "bid" | "custom" | "end";
    if (customId.startsWith("auction_bid_")) action = "bid";
    else if (customId.startsWith("auction_custom_")) action = "custom";
    else if (customId.startsWith("auction_end_")) action = "end";
    else return;

    const auctionId = customId.slice(`auction_${action}_`.length);
    const auction = activeAuctions.get(auctionId);

    if (!auction) {
        await interaction.reply({ content: "❌ 해당 경매를 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
        return;
    }
    if (auction.ended) {
        await interaction.reply({ content: "❌ 이미 종료된 경매입니다.", flags: MessageFlags.Ephemeral });
        return;
    }

    // ── 입찰 (최소 단위) ──
    if (action === "bid") {
        if (interaction.user.id === auction.hostId) {
            await interaction.reply({ content: "❌ 주최자는 자신의 경매에 입찰할 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id === auction.highestBidderId) {
            await interaction.reply({ content: "❌ 이미 최고 입찰자입니다!", flags: MessageFlags.Ephemeral });
            return;
        }

        const bidAmount = getNextMinBid(auction);
        
        if (!Number.isSafeInteger(bidAmount)) {
            await interaction.reply({ content: "❌ 더 이상 입찰할 수 없습니다 (최대 금액 도달).", flags: MessageFlags.Ephemeral });
            return;
        }

        auction.currentPrice = bidAmount;
        auction.highestBidderId = interaction.user.id;
        auction.highestBidderName = interaction.user.displayName;
        auction.bidHistory.push({
            userId: interaction.user.id,
            userName: interaction.user.displayName,
            amount: bidAmount,
            timestamp: Date.now(),
        });

        await interaction.update({
            embeds: [buildAuctionEmbed(auction)],
            components: [buildAuctionButtons(auction)],
        });
    }

    // ── 금액 직접 입력 (모달) ──
    else if (action === "custom") {
        if (interaction.user.id === auction.hostId) {
            await interaction.reply({ content: "❌ 주최자는 자신의 경매에 입찰할 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        const minBid = getNextMinBid(auction);

        const modal = new ModalBuilder()
            .setCustomId(`auction_modal_${auctionId}`)
            .setTitle("💰 입찰 금액 입력");

        const input = new TextInputBuilder()
            .setCustomId("bid_amount")
            .setLabel(`입찰 금액을 입력하세요 (최소: ${minBid.toLocaleString()}원)`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(minBid.toString())
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
        await interaction.showModal(modal);
    }

    // ── 경매 종료 (주최자 전용) ──
    else if (action === "end") {
        if (interaction.user.id !== auction.hostId) {
            await interaction.reply({ content: "❌ 경매 주최자만 종료할 수 있습니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        finalizeAuction(auction);

        await interaction.update({
            embeds: [buildAuctionEmbed(auction)],
            components: [],
        });
        await interaction.followUp({ content: buildResultMessage(auction) });

        activeAuctions.delete(auctionId);
    }
}

// ─── 모달 인터랙션 핸들러 ───

export async function handleAuctionModal(interaction: ModalSubmitInteraction) {
    if (!interaction.customId.startsWith("auction_modal_")) return;

    const auctionId = interaction.customId.slice("auction_modal_".length);
    const auction = activeAuctions.get(auctionId);

    if (!auction) {
        await interaction.reply({ content: "❌ 해당 경매를 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
        return;
    }
    if (auction.ended) {
        await interaction.reply({ content: "❌ 이미 종료된 경매입니다.", flags: MessageFlags.Ephemeral });
        return;
    }

    const raw = interaction.fields.getTextInputValue("bid_amount").replace(/,/g, "");
    const bidAmount = parseInt(raw, 10);

    if (isNaN(bidAmount)) {
        await interaction.reply({ content: "❌ 올바른 숫자를 입력해주세요.", flags: MessageFlags.Ephemeral });
        return;
    }

    if (!Number.isSafeInteger(bidAmount)) {
        await interaction.reply({ content: "❌ 입력한 금액이 너무 큽니다! 최대 900경까지 입력가능합니다.", flags: MessageFlags.Ephemeral });
        return;
    }

    const minBid = getNextMinBid(auction);
    if (bidAmount < minBid) {
        await interaction.reply({ content: `❌ 최소 **${minBid.toLocaleString()}원** 이상 입찰해야 합니다.`, flags: MessageFlags.Ephemeral });
        return;
    }
    if (interaction.user.id === auction.highestBidderId) {
        await interaction.reply({ content: "❌ 이미 최고 입찰자입니다!", flags: MessageFlags.Ephemeral });
        return;
    }

    auction.currentPrice = bidAmount;
    auction.highestBidderId = interaction.user.id;
    auction.highestBidderName = interaction.user.displayName;
    auction.bidHistory.push({
        userId: interaction.user.id,
        userName: interaction.user.displayName,
        amount: bidAmount,
        timestamp: Date.now(),
    });

    // 원본 경매 메시지 갱신
    const channel = await fetchAuctionChannel(auction, interaction.client);
    if (channel) await editAuctionMessage(auction, channel);

    await interaction.reply({
        content: `✅ **${bidAmount.toLocaleString()}원**에 입찰 완료!`,
        flags: MessageFlags.Ephemeral,
    });
}

// ─── customId 매칭 유틸 ───

export function isAuctionButtonInteraction(customId: string): boolean {
    return customId.startsWith("auction_bid_")
        || customId.startsWith("auction_custom_")
        || customId.startsWith("auction_end_");
}

export function isAuctionModalInteraction(customId: string): boolean {
    return customId.startsWith("auction_modal_");
}

// ─── 슬래시 커맨드 ───

export const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("경매")
        .setDescription("경매를 시작하는 명령어입니다.")
        .addStringOption(option =>
            option
                .setName("아이템")
                .setDescription("경매할 아이템의 이름을 입력하세요")
                .setRequired(true),
        )
        .addIntegerOption(option =>
            option
                .setName("시작가격")
                .setDescription("경매 시작 가격을 입력하세요 (기본값: 0)")
                .setMinValue(0),
        )
        .addIntegerOption(option =>
            option
                .setName("최소입찰단위")
                .setDescription("최소 입찰 단위를 입력하세요 (기본값: 1)")
                .setMinValue(1),
        )
        .addIntegerOption(option =>
            option
                .setName("경매시간")
                .setDescription("경매 시간(분)을 입력하세요 (기본값: 10, 최소: 1)")
                .setMinValue(1),
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: "❌ 서버 내에서만 사용할 수 있습니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        const itemName        = interaction.options.getString("아이템", true);
        const startPrice      = interaction.options.getInteger("시작가격") ?? 0;
        const minBidIncrement = interaction.options.getInteger("최소입찰단위") ?? 1;
        const durationMinutes = interaction.options.getInteger("경매시간") ?? 10;

        // 같은 채널에서 같은 유저가 이미 진행 중인 경매가 있는지 확인
        for (const a of activeAuctions.values()) {
            if (a.hostId === interaction.user.id && a.channelId === interaction.channelId && !a.ended) {
                await interaction.reply({
                    content: "❌ 이미 이 채널에서 진행 중인 경매가 있습니다. 먼저 종료해주세요.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        }

        const auctionId = `${interaction.guildId}-${Date.now()}`;
        const endTime   = Date.now() + durationMinutes * 60_000;

        const auction: Auction = {
            id: auctionId,
            hostId: interaction.user.id,
            hostName: interaction.user.displayName,
            itemName,
            startPrice,
            minBidIncrement,
            currentPrice: startPrice,
            highestBidderId: null,
            highestBidderName: null,
            durationMinutes,
            endTime,
            bidHistory: [],
            channelId: interaction.channelId,
            messageId: null,
            endTimer: null,
            updateInterval: null,
            ended: false,
        };

        activeAuctions.set(auctionId, auction);

        // 경매 메시지 전송
        await interaction.reply({
            embeds: [buildAuctionEmbed(auction)],
            components: [buildAuctionButtons(auction)],
        });
        const reply = await interaction.fetchReply();
        auction.messageId = reply.id;

        // 주기적으로 남은 시간 갱신 (30초마다)
        auction.updateInterval = setInterval(async () => {
            if (auction.ended) {
                clearInterval(auction.updateInterval!);
                return;
            }
            const channel = await fetchAuctionChannel(auction, interaction.client);
            if (channel) await editAuctionMessage(auction, channel);
        }, 30_000);

        // 자동 종료 타이머
        auction.endTimer = setTimeout(async () => {
            if (auction.ended) return;
            finalizeAuction(auction);

            const channel = await fetchAuctionChannel(auction, interaction.client);
            if (channel && "send" in channel) {
                await editAuctionMessage(auction, channel);
                await channel.send(buildResultMessage(auction));
            }

            activeAuctions.delete(auctionId);
        }, durationMinutes * 60_000);
    },
};