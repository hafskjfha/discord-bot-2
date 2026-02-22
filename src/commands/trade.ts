import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction,
    MessageFlags,
    ChannelType,
    TextChannel,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from "discord.js";
import type { BotCommand } from "@/types/types.js";
import {
    createMarketplaceListing,
    getMarketListing,
    getActiveMarketListings,
    setMarketListingMessage,
    setMarketListingThread,
    completeMarketTransaction,
    setMarketListingStatus,
    getTransactionHistory,
    getItemPriceStats,
    createExchangeListing,
    getExchangeListing,
    getActiveExchanges,
    setExchangeListingMessage,
    setExchangeListingThread,
    setExchangeListingStatus,
    completeExchangeTransaction,
    type MarketplaceListing,
    type ExchangeListing,
} from "@/lib/trade-db.js";

// ─── 거래소 임베드 ───

function buildMarketListingEmbed(listing: MarketplaceListing): EmbedBuilder {
    const statusEmoji = listing.status === "active" ? "🟢" : listing.status === "sold" ? "🔴" : "⚫";
    const statusText = listing.status === "active" ? "판매 중" : listing.status === "sold" ? "판매 완료" : "취소됨";

    const embed = new EmbedBuilder()
        .setTitle(`🏪 거래소 #${listing.id}`)
        .setColor(listing.status === "active" ? 0x57F287 : listing.status === "sold" ? 0xED4245 : 0x95A5A6)
        .addFields(
            { name: "📦 아이템", value: listing.item_name, inline: true },
            { name: "📊 수량", value: `${listing.quantity}개`, inline: true },
            { name: "💰 가격", value: `${listing.price.toLocaleString()}원`, inline: true },
            { name: `${statusEmoji} 상태`, value: statusText, inline: true },
            { name: "👤 판매자", value: `<@${listing.seller_id}>`, inline: true },
        );

    if (listing.description) {
        embed.addFields({ name: "📝 설명", value: listing.description });
    }

    if (listing.buyer_id) {
        embed.addFields({ name: "🛒 구매 요청자", value: `<@${listing.buyer_id}>`, inline: true });
    }

    embed.setFooter({ text: `등록일: ${new Date(listing.created_at * 1000).toLocaleString("ko-KR")}` });
    embed.setTimestamp();

    return embed;
}

function buildMarketListingButtons(listing: MarketplaceListing): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`trade_buy_${listing.id}`)
            .setLabel("구매 요청")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🛒")
            .setDisabled(listing.status !== "active"),
        new ButtonBuilder()
            .setCustomId(`trade_complete_${listing.id}`)
            .setLabel("거래 완료")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅")
            .setDisabled(listing.status !== "active"),
        new ButtonBuilder()
            .setCustomId(`trade_cancel_${listing.id}`)
            .setLabel("등록 취소")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("❌")
            .setDisabled(listing.status !== "active"),
        new ButtonBuilder()
            .setCustomId(`trade_history_${listing.id}`)
            .setLabel("거래 내역")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("📜"),
    );
}

// ─── 교환소 임베드 ───

function buildExchangeListingEmbed(listing: ExchangeListing): EmbedBuilder {
    const statusEmoji = listing.status === "active" ? "🟢" : listing.status === "completed" ? "🔴" : "⚫";
    const statusText = listing.status === "active" ? "교환 대기 중" : listing.status === "completed" ? "교환 완료" : "취소됨";

    const embed = new EmbedBuilder()
        .setTitle(`🔄 교환소 #${listing.id}`)
        .setColor(listing.status === "active" ? 0x3498DB : listing.status === "completed" ? 0x57F287 : 0x95A5A6)
        .addFields(
            { name: "📦 제공 아이템", value: `${listing.offer_item} x${listing.offer_quantity}`, inline: true },
            { name: "➡️", value: "⇄", inline: true },
            { name: "🎯 원하는 아이템", value: `${listing.want_item} x${listing.want_quantity}`, inline: true },
            { name: `${statusEmoji} 상태`, value: statusText, inline: true },
            { name: "👤 등록자", value: `<@${listing.offerer_id}>`, inline: true },
        );

    if (listing.description) {
        embed.addFields({ name: "📝 설명", value: listing.description });
    }

    if (listing.responder_id) {
        embed.addFields({ name: "🤝 교환 요청자", value: `<@${listing.responder_id}>`, inline: true });
    }

    embed.setFooter({ text: `등록일: ${new Date(listing.created_at * 1000).toLocaleString("ko-KR")}` });
    embed.setTimestamp();

    return embed;
}

function buildExchangeListingButtons(listing: ExchangeListing): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`exchange_request_${listing.id}`)
            .setLabel("교환 요청")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🤝")
            .setDisabled(listing.status !== "active"),
        new ButtonBuilder()
            .setCustomId(`exchange_complete_${listing.id}`)
            .setLabel("교환 완료")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅")
            .setDisabled(listing.status !== "active"),
        new ButtonBuilder()
            .setCustomId(`exchange_cancel_${listing.id}`)
            .setLabel("등록 취소")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("❌")
            .setDisabled(listing.status !== "active"),
    );
}

// ─── 거래 내역 임베드 ───

function buildTransactionHistoryEmbed(guildId: string, itemName: string): EmbedBuilder {
    const transactions = getTransactionHistory(guildId, itemName);
    const stats = getItemPriceStats(guildId, itemName);

    const embed = new EmbedBuilder()
        .setTitle(`📜 "${itemName}" 거래 내역`)
        .setColor(0xF1C40F);

    if (transactions.length === 0) {
        embed.setDescription("이 아이템의 거래 내역이 없습니다.");
    } else {
        const historyLines = transactions.map((t, i) => {
            const date = new Date(t.completed_at * 1000).toLocaleDateString("ko-KR");
            return `\`${i + 1}.\` **${t.price.toLocaleString()}원** (x${t.quantity}) — ${date}\n　　판매자: <@${t.seller_id}> → 구매자: <@${t.buyer_id}>`;
        });

        embed.setDescription(historyLines.join("\n\n"));

        if (stats.avg_price !== null) {
            embed.addFields(
                { name: "📊 평균 거래가", value: `${Math.round(stats.avg_price).toLocaleString()}원`, inline: true },
                { name: "🔢 총 거래 횟수", value: `${stats.count}회`, inline: true },
            );
        }
    }

    embed.setTimestamp();
    return embed;
}

// ─── 거래소 목록 임베드 ───

function buildMarketListEmbed(listings: MarketplaceListing[], page: number, totalPages: number): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle("🏪 거래소 목록")
        .setColor(0x57F287)
        .setFooter({ text: `페이지 ${page}/${totalPages}` })
        .setTimestamp();

    if (listings.length === 0) {
        embed.setDescription("현재 등록된 아이템이 없습니다.");
        return embed;
    }

    const lines = listings.map((l) => {
        return `**#${l.id}** | 📦 **${l.item_name}** x${l.quantity} | 💰 ${l.price.toLocaleString()}원\n　　　판매자: <@${l.seller_id}>${l.description ? ` | 📝 ${l.description}` : ""}`;
    });

    embed.setDescription(lines.join("\n\n"));
    return embed;
}

// ─── 교환소 목록 임베드 ───

function buildExchangeListEmbed(listings: ExchangeListing[], page: number, totalPages: number): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle("🔄 교환소 목록")
        .setColor(0x3498DB)
        .setFooter({ text: `페이지 ${page}/${totalPages}` })
        .setTimestamp();

    if (listings.length === 0) {
        embed.setDescription("현재 등록된 교환 요청이 없습니다.");
        return embed;
    }

    const lines = listings.map((l) => {
        return `**#${l.id}** | 📦 ${l.offer_item} x${l.offer_quantity} ⇄ 🎯 ${l.want_item} x${l.want_quantity}\n　　　등록자: <@${l.offerer_id}>${l.description ? ` | 📝 ${l.description}` : ""}`;
    });

    embed.setDescription(lines.join("\n\n"));
    return embed;
}

// ─── 커맨드 정의 ───

export const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("거래")
        .setDescription("거래 명령어입니다.")
        .addSubcommandGroup((group) =>
            group
                .setName("거래소")
                .setDescription("아이템을 사고 팔 수 있는 거래소입니다.")
                .addSubcommand((sub) =>
                    sub
                        .setName("등록")
                        .setDescription("거래소에 아이템을 등록합니다.")
                        .addStringOption((opt) =>
                            opt.setName("아이템").setDescription("아이템 이름").setRequired(true),
                        )
                        .addIntegerOption((opt) =>
                            opt.setName("가격").setDescription("판매 가격").setRequired(true).setMinValue(1),
                        )
                        .addIntegerOption((opt) =>
                            opt.setName("수량").setDescription("아이템 수량 (기본: 1)").setMinValue(1),
                        )
                        .addStringOption((opt) =>
                            opt.setName("설명").setDescription("아이템에 대한 추가 설명"),
                        ),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("목록")
                        .setDescription("거래소에 등록된 아이템 목록을 봅니다."),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("내역")
                        .setDescription("특정 아이템의 거래 내역을 확인합니다.")
                        .addStringOption((opt) =>
                            opt.setName("아이템").setDescription("조회할 아이템 이름").setRequired(true),
                        ),
                ),
        )
        .addSubcommandGroup((group) =>
            group
                .setName("교환소")
                .setDescription("아이템을 교환할 수 있는 교환소입니다.")
                .addSubcommand((sub) =>
                    sub
                        .setName("등록")
                        .setDescription("교환소에 교환 요청을 등록합니다.")
                        .addStringOption((opt) =>
                            opt.setName("제공아이템").setDescription("내가 제공할 아이템 이름").setRequired(true),
                        )
                        .addStringOption((opt) =>
                            opt.setName("원하는아이템").setDescription("내가 원하는 아이템 이름").setRequired(true),
                        )
                        .addIntegerOption((opt) =>
                            opt.setName("제공수량").setDescription("제공할 아이템 수량 (기본: 1)").setMinValue(1),
                        )
                        .addIntegerOption((opt) =>
                            opt.setName("원하는수량").setDescription("원하는 아이템 수량 (기본: 1)").setMinValue(1),
                        )
                        .addStringOption((opt) =>
                            opt.setName("설명").setDescription("교환에 대한 추가 설명"),
                        ),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("목록")
                        .setDescription("교환소에 등록된 교환 목록을 봅니다."),
                ),
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const group = interaction.options.getSubcommandGroup(true);
        const sub = interaction.options.getSubcommand(true);
        const guildId = interaction.guildId!;

        if (group === "거래소") {
            if (sub === "등록") {
                await handleMarketRegister(interaction, guildId);
            } else if (sub === "목록") {
                await handleMarketList(interaction, guildId);
            } else if (sub === "내역") {
                await handleMarketHistory(interaction, guildId);
            }
        } else if (group === "교환소") {
            if (sub === "등록") {
                await handleExchangeRegister(interaction, guildId);
            } else if (sub === "목록") {
                await handleExchangeList(interaction, guildId);
            }
        }
    },
};

// ─── 거래소 등록 ───

async function handleMarketRegister(interaction: ChatInputCommandInteraction, guildId: string) {
    const itemName = interaction.options.getString("아이템", true);
    const price = interaction.options.getInteger("가격", true);
    const quantity = interaction.options.getInteger("수량") ?? 1;
    const description = interaction.options.getString("설명") ?? null;

    // 아이템 거래 내역 조회
    const stats = getItemPriceStats(guildId, itemName);
    const transactions = getTransactionHistory(guildId, itemName);

    const listingId = createMarketplaceListing(
        guildId,
        interaction.user.id,
        interaction.user.displayName,
        itemName,
        quantity,
        description,
        price,
        interaction.channelId,
    );

    const listing = getMarketListing(listingId)!;
    const embed = buildMarketListingEmbed(listing);
    const buttons = buildMarketListingButtons(listing);

    // 거래 내역이 있으면 참고 정보 추가
    if (stats.count > 0 && stats.avg_price !== null) {
        embed.addFields({
            name: "📊 참고: 이전 거래 정보",
            value: `평균 거래가: **${Math.round(stats.avg_price).toLocaleString()}원** (총 ${stats.count}회 거래)`,
        });

        if (transactions.length > 0) {
            const recentPrices = transactions.slice(0, 3).map((t) => {
                const date = new Date(t.completed_at * 1000).toLocaleDateString("ko-KR");
                return `${t.price.toLocaleString()}원 (${date})`;
            });
            embed.addFields({
                name: "💹 최근 거래가",
                value: recentPrices.join("\n"),
            });
        }
    }

    const reply = await interaction.reply({ embeds: [embed], components: [buttons], withResponse: true });
    setMarketListingMessage(listingId, reply.interaction.id);
}

// ─── 거래소 목록 ───

async function handleMarketList(interaction: ChatInputCommandInteraction, guildId: string) {
    const listings = getActiveMarketListings(guildId);
    const perPage = 5;
    const totalPages = Math.max(1, Math.ceil(listings.length / perPage));
    const page = 1;
    const pageListings = listings.slice((page - 1) * perPage, page * perPage);

    const embed = buildMarketListEmbed(pageListings, page, totalPages);

    if (listings.length === 0) {
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
    }

    // 아이템 선택 메뉴
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("trade_select_listing")
        .setPlaceholder("아이템을 선택하여 상세 정보를 확인하세요")
        .addOptions(
            pageListings.map((l) => ({
                label: `#${l.id} ${l.item_name} x${l.quantity}`,
                description: `${l.price.toLocaleString()}원 | 판매자: ${l.seller_name}`,
                value: l.id.toString(),
            })),
        );

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [selectRow];

    // 페이지네이션 버튼 (2페이지 이상일 때)
    if (totalPages > 1) {
        const pageButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`trade_list_prev_market_${page}`)
                .setLabel("◀ 이전")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId(`trade_list_next_market_${page}`)
                .setLabel("다음 ▶")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages),
        );
        components.push(pageButtons);
    }

    await interaction.reply({ embeds: [embed], components });
}

// ─── 거래소 내역 ───

async function handleMarketHistory(interaction: ChatInputCommandInteraction, guildId: string) {
    const itemName = interaction.options.getString("아이템", true);
    const embed = buildTransactionHistoryEmbed(guildId, itemName);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ─── 교환소 등록 ───

async function handleExchangeRegister(interaction: ChatInputCommandInteraction, guildId: string) {
    const offerItem = interaction.options.getString("제공아이템", true);
    const wantItem = interaction.options.getString("원하는아이템", true);
    const offerQuantity = interaction.options.getInteger("제공수량") ?? 1;
    const wantQuantity = interaction.options.getInteger("원하는수량") ?? 1;
    const description = interaction.options.getString("설명") ?? null;

    const listingId = createExchangeListing(
        guildId,
        interaction.user.id,
        interaction.user.displayName,
        offerItem,
        offerQuantity,
        wantItem,
        wantQuantity,
        description,
        interaction.channelId,
    );

    const listing = getExchangeListing(listingId)!;
    const embed = buildExchangeListingEmbed(listing);
    const buttons = buildExchangeListingButtons(listing);

    const reply = await interaction.reply({ embeds: [embed], components: [buttons], withResponse: true });
    setExchangeListingMessage(listingId, reply.interaction.id);
}

// ─── 교환소 목록 ───

async function handleExchangeList(interaction: ChatInputCommandInteraction, guildId: string) {
    const listings = getActiveExchanges(guildId);
    const perPage = 5;
    const totalPages = Math.max(1, Math.ceil(listings.length / perPage));
    const page = 1;
    const pageListings = listings.slice((page - 1) * perPage, page * perPage);

    const embed = buildExchangeListEmbed(pageListings, page, totalPages);

    if (listings.length === 0) {
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("exchange_select_listing")
        .setPlaceholder("교환 요청을 선택하여 상세 정보를 확인하세요")
        .addOptions(
            pageListings.map((l) => ({
                label: `#${l.id} ${l.offer_item} ⇄ ${l.want_item}`,
                description: `x${l.offer_quantity} ⇄ x${l.want_quantity} | 등록자: ${l.offerer_name}`,
                value: l.id.toString(),
            })),
        );

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [selectRow];

    if (totalPages > 1) {
        const pageButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`trade_list_prev_exchange_${page}`)
                .setLabel("◀ 이전")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId(`trade_list_next_exchange_${page}`)
                .setLabel("다음 ▶")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages),
        );
        components.push(pageButtons);
    }

    await interaction.reply({ embeds: [embed], components });
}

// ─── 버튼 인터랙션 핸들러 ───

export function isTradeButtonInteraction(customId: string): boolean {
    return customId.startsWith("trade_") || customId.startsWith("exchange_");
}

export function isTradeSelectInteraction(customId: string): boolean {
    return customId === "trade_select_listing" || customId === "exchange_select_listing";
}

export async function handleTradeButton(interaction: ButtonInteraction) {
    const { customId } = interaction;

    // ── 거래소: 구매 요청 ──
    if (customId.startsWith("trade_buy_")) {
        const listingId = parseInt(customId.slice("trade_buy_".length), 10);
        const listing = getMarketListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 거래를 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.status !== "active") {
            await interaction.reply({ content: "❌ 이미 종료된 거래입니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id === listing.seller_id) {
            await interaction.reply({ content: "❌ 자신의 아이템은 구매할 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.thread_id) {
            await interaction.reply({
                content: `❌ 이미 구매 요청이 진행 중입니다. <#${listing.thread_id}>에서 확인하세요.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 스레드 생성
        const channel = interaction.channel;
        if (!channel || !("threads" in channel)) {
            await interaction.reply({ content: "❌ 이 채널에서는 스레드를 생성할 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferUpdate();

        try {
            const thread = await (channel as TextChannel).threads.create({
                name: `🛒 거래 #${listing.id}: ${listing.item_name} — ${interaction.user.displayName}`,
                type: ChannelType.PrivateThread,
                reason: `거래소 구매 요청 #${listing.id}`,
            });

            // 판매자와 구매자를 스레드에 추가
            await thread.members.add(listing.seller_id);
            await thread.members.add(interaction.user.id);

            // 스레드에 안내 메시지
            const threadEmbed = new EmbedBuilder()
                .setTitle(`🛒 거래 협상 — ${listing.item_name}`)
                .setColor(0xF1C40F)
                .setDescription(
                    `**구매자** <@${interaction.user.id}>님이 **판매자** <@${listing.seller_id}>님의 아이템에 구매 요청을 했습니다.\n\n` +
                    `이 스레드에서 거래 조건을 조정하거나 질문을 주고받으세요.\n` +
                    `거래가 완료되면 **판매자**가 \`✅ 거래 완료\` 버튼을 눌러주세요.`,
                )
                .addFields(
                    { name: "📦 아이템", value: listing.item_name, inline: true },
                    { name: "📊 수량", value: `${listing.quantity}개`, inline: true },
                    { name: "💰 가격", value: `${listing.price.toLocaleString()}원`, inline: true },
                );

            if (listing.description) {
                threadEmbed.addFields({ name: "📝 설명", value: listing.description });
            }

            const completeButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`trade_thread_complete_${listing.id}`)
                    .setLabel("거래 완료")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("✅"),
                new ButtonBuilder()
                    .setCustomId(`trade_thread_cancel_${listing.id}`)
                    .setLabel("거래 취소")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("❌"),
            );

            await thread.send({ embeds: [threadEmbed], components: [completeButton] });

            // DB 업데이트
            setMarketListingThread(listing.id, thread.id, interaction.user.id, interaction.user.displayName);

            // 원래 메시지 업데이트
            const updatedListing = getMarketListing(listing.id)!;
            await interaction.editReply({
                embeds: [buildMarketListingEmbed(updatedListing)],
                components: [buildMarketListingButtons(updatedListing)],
            });
        } catch (error) {
            console.error("스레드 생성 실패:", error);
            await interaction.followUp({ content: "❌ 스레드 생성에 실패했습니다.", flags: MessageFlags.Ephemeral });
        }
    }

    // ── 거래소: 거래 완료 (원래 메시지 버튼) ──
    else if (customId.startsWith("trade_complete_")) {
        const listingId = parseInt(customId.slice("trade_complete_".length), 10);
        const listing = getMarketListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 거래를 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id !== listing.seller_id) {
            await interaction.reply({ content: "❌ 판매자만 거래를 완료할 수 있습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.status !== "active") {
            await interaction.reply({ content: "❌ 이미 종료된 거래입니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (!listing.buyer_id) {
            await interaction.reply({ content: "❌ 아직 구매 요청자가 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        // 거래 완료 처리
        completeMarketTransaction(listing, listing.buyer_id, listing.buyer_name!);

        const updatedListing = getMarketListing(listingId)!;
        const completedEmbed = buildMarketListingEmbed(updatedListing);
        completedEmbed.setDescription(`🎉 **거래 완료!** <@${listing.buyer_id}>님에게 **${listing.item_name}** x${listing.quantity}이(가) **${listing.price.toLocaleString()}원**에 판매되었습니다!`);

        await interaction.update({
            embeds: [completedEmbed],
            components: [],
        });

        // 스레드에 완료 알림
        if (listing.thread_id) {
            try {
                const thread = await interaction.client.channels.fetch(listing.thread_id);
                if (thread?.isThread()) {
                    const doneEmbed = new EmbedBuilder()
                        .setTitle("✅ 거래 완료")
                        .setColor(0x57F287)
                        .setDescription(`**${listing.item_name}** x${listing.quantity}의 거래가 **${listing.price.toLocaleString()}원**에 완료되었습니다!\n\n이 스레드는 더 이상 사용되지 않습니다.`);
                    await thread.send({ embeds: [doneEmbed] });
                    await thread.setLocked(true);
                    await thread.setArchived(true);
                }
            } catch { /* ignore */ }
        }
    }

    // ── 거래소: 등록 취소 ──
    else if (customId.startsWith("trade_cancel_")) {
        const listingId = parseInt(customId.slice("trade_cancel_".length), 10);
        const listing = getMarketListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 거래를 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id !== listing.seller_id) {
            await interaction.reply({ content: "❌ 판매자만 등록을 취소할 수 있습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.status !== "active") {
            await interaction.reply({ content: "❌ 이미 종료된 거래입니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        setMarketListingStatus(listing.id, "cancelled");

        const updatedListing = getMarketListing(listingId)!;
        const cancelledEmbed = buildMarketListingEmbed(updatedListing);
        cancelledEmbed.setDescription("⚫ **등록 취소됨** — 판매자가 등록을 취소했습니다.");

        await interaction.update({
            embeds: [cancelledEmbed],
            components: [],
        });

        // 스레드 정리
        if (listing.thread_id) {
            try {
                const thread = await interaction.client.channels.fetch(listing.thread_id);
                if (thread?.isThread()) {
                    await thread.send("❌ 판매자가 거래를 취소했습니다. 이 스레드는 아카이브됩니다.");
                    await thread.setArchived(true);
                }
            } catch { /* ignore */ }
        }
    }

    // ── 거래소: 거래 내역 조회 ──
    else if (customId.startsWith("trade_history_")) {
        const listingId = parseInt(customId.slice("trade_history_".length), 10);
        const listing = getMarketListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 거래를 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = buildTransactionHistoryEmbed(listing.guild_id, listing.item_name);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ── 스레드 내 거래 완료 버튼 ──
    else if (customId.startsWith("trade_thread_complete_")) {
        const listingId = parseInt(customId.slice("trade_thread_complete_".length), 10);
        const listing = getMarketListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 거래를 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id !== listing.seller_id) {
            await interaction.reply({ content: "❌ 판매자만 거래를 완료할 수 있습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.status !== "active") {
            await interaction.reply({ content: "❌ 이미 종료된 거래입니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        completeMarketTransaction(listing, listing.buyer_id!, listing.buyer_name!);

        const doneEmbed = new EmbedBuilder()
            .setTitle("✅ 거래 완료")
            .setColor(0x57F287)
            .setDescription(
                `**${listing.item_name}** x${listing.quantity}의 거래가 **${listing.price.toLocaleString()}원**에 완료되었습니다!\n\n` +
                `판매자: <@${listing.seller_id}>\n구매자: <@${listing.buyer_id}>\n\n이 스레드는 아카이브됩니다.`,
            );

        await interaction.update({ embeds: [doneEmbed], components: [] });

        // 원래 메시지도 업데이트
        try {
            if (listing.channel_id && listing.message_id) {
                const channel = await interaction.client.channels.fetch(listing.channel_id);
                if (channel?.isTextBased()) {
                    const msg = await channel.messages.fetch(listing.message_id);
                    const updatedListing = getMarketListing(listingId)!;
                    const completedEmbed = buildMarketListingEmbed(updatedListing);
                    completedEmbed.setDescription(`🎉 **거래 완료!** <@${listing.buyer_id}>님에게 **${listing.item_name}** x${listing.quantity}이(가) **${listing.price.toLocaleString()}원**에 판매되었습니다!`);
                    await msg.edit({ embeds: [completedEmbed], components: [] });
                }
            }
        } catch { /* ignore */ }

        // 스레드 아카이브
        try {
            const thread = interaction.channel;
            if (thread?.isThread()) {
                await thread.setLocked(true);
                await thread.setArchived(true);
            }
        } catch { /* ignore */ }
    }

    // ── 스레드 내 거래 취소 버튼 ──
    else if (customId.startsWith("trade_thread_cancel_")) {
        const listingId = parseInt(customId.slice("trade_thread_cancel_".length), 10);
        const listing = getMarketListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 거래를 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id !== listing.seller_id && interaction.user.id !== listing.buyer_id) {
            await interaction.reply({ content: "❌ 거래 당사자만 취소할 수 있습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.status !== "active") {
            await interaction.reply({ content: "❌ 이미 종료된 거래입니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        // 구매 요청만 취소 (등록은 유지)
        setMarketListingThread(listing.id, "", "", "");

        const cancelEmbed = new EmbedBuilder()
            .setTitle("❌ 구매 요청 취소")
            .setColor(0xED4245)
            .setDescription("구매 요청이 취소되었습니다. 이 스레드는 아카이브됩니다.\n다른 유저가 다시 구매 요청을 할 수 있습니다.");

        await interaction.update({ embeds: [cancelEmbed], components: [] });

        // 원래 메시지 업데이트 (구매 요청자 정보 제거)
        try {
            if (listing.channel_id && listing.message_id) {
                const channel = await interaction.client.channels.fetch(listing.channel_id);
                if (channel?.isTextBased()) {
                    const msg = await channel.messages.fetch(listing.message_id);
                    const updatedListing = getMarketListing(listingId)!;
                    await msg.edit({
                        embeds: [buildMarketListingEmbed(updatedListing)],
                        components: [buildMarketListingButtons(updatedListing)],
                    });
                }
            }
        } catch { /* ignore */ }

        // 스레드 아카이브
        try {
            const thread = interaction.channel;
            if (thread?.isThread()) {
                await thread.setArchived(true);
            }
        } catch { /* ignore */ }
    }

    // ── 교환소: 교환 요청 ──
    else if (customId.startsWith("exchange_request_")) {
        const listingId = parseInt(customId.slice("exchange_request_".length), 10);
        const listing = getExchangeListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 교환을 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.status !== "active") {
            await interaction.reply({ content: "❌ 이미 종료된 교환입니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id === listing.offerer_id) {
            await interaction.reply({ content: "❌ 자신의 교환 요청에 응답할 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.thread_id) {
            await interaction.reply({
                content: `❌ 이미 교환 요청이 진행 중입니다. <#${listing.thread_id}>에서 확인하세요.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const channel = interaction.channel;
        if (!channel || !("threads" in channel)) {
            await interaction.reply({ content: "❌ 이 채널에서는 스레드를 생성할 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferUpdate();

        try {
            const thread = await (channel as TextChannel).threads.create({
                name: `🔄 교환 #${listing.id}: ${listing.offer_item} ⇄ ${listing.want_item}`,
                type: ChannelType.PrivateThread,
                reason: `교환소 교환 요청 #${listing.id}`,
            });

            await thread.members.add(listing.offerer_id);
            await thread.members.add(interaction.user.id);

            const threadEmbed = new EmbedBuilder()
                .setTitle(`🔄 교환 협상 — ${listing.offer_item} ⇄ ${listing.want_item}`)
                .setColor(0x3498DB)
                .setDescription(
                    `**교환 요청자** <@${interaction.user.id}>님이 **등록자** <@${listing.offerer_id}>님의 교환 요청에 응답했습니다.\n\n` +
                    `이 스레드에서 교환 조건을 조정하거나 질문을 주고받으세요.\n` +
                    `교환이 완료되면 **등록자**가 \`✅ 교환 완료\` 버튼을 눌러주세요.`,
                )
                .addFields(
                    { name: "📦 제공 아이템", value: `${listing.offer_item} x${listing.offer_quantity}`, inline: true },
                    { name: "🎯 원하는 아이템", value: `${listing.want_item} x${listing.want_quantity}`, inline: true },
                );

            if (listing.description) {
                threadEmbed.addFields({ name: "📝 설명", value: listing.description });
            }

            const completeButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`exchange_thread_complete_${listing.id}`)
                    .setLabel("교환 완료")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("✅"),
                new ButtonBuilder()
                    .setCustomId(`exchange_thread_cancel_${listing.id}`)
                    .setLabel("교환 취소")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("❌"),
            );

            await thread.send({ embeds: [threadEmbed], components: [completeButton] });

            setExchangeListingThread(listing.id, thread.id, interaction.user.id, interaction.user.displayName);

            const updatedListing = getExchangeListing(listing.id)!;
            await interaction.editReply({
                embeds: [buildExchangeListingEmbed(updatedListing)],
                components: [buildExchangeListingButtons(updatedListing)],
            });
        } catch (error) {
            console.error("스레드 생성 실패:", error);
            await interaction.followUp({ content: "❌ 스레드 생성에 실패했습니다.", flags: MessageFlags.Ephemeral });
        }
    }

    // ── 교환소: 교환 완료 (원래 메시지) ──
    else if (customId.startsWith("exchange_complete_")) {
        const listingId = parseInt(customId.slice("exchange_complete_".length), 10);
        const listing = getExchangeListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 교환을 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id !== listing.offerer_id) {
            await interaction.reply({ content: "❌ 등록자만 교환을 완료할 수 있습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.status !== "active") {
            await interaction.reply({ content: "❌ 이미 종료된 교환입니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (!listing.responder_id) {
            await interaction.reply({ content: "❌ 아직 교환 요청자가 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        completeExchangeTransaction(listing.id);

        const updatedListing = getExchangeListing(listingId)!;
        const completedEmbed = buildExchangeListingEmbed(updatedListing);
        completedEmbed.setDescription(`🎉 **교환 완료!** <@${listing.offerer_id}>님과 <@${listing.responder_id}>님의 교환이 완료되었습니다!`);

        await interaction.update({ embeds: [completedEmbed], components: [] });

        if (listing.thread_id) {
            try {
                const thread = await interaction.client.channels.fetch(listing.thread_id);
                if (thread?.isThread()) {
                    const doneEmbed = new EmbedBuilder()
                        .setTitle("✅ 교환 완료")
                        .setColor(0x57F287)
                        .setDescription(`${listing.offer_item} x${listing.offer_quantity} ⇄ ${listing.want_item} x${listing.want_quantity} 교환이 완료되었습니다!`);
                    await thread.send({ embeds: [doneEmbed] });
                    await thread.setLocked(true);
                    await thread.setArchived(true);
                }
            } catch { /* ignore */ }
        }
    }

    // ── 교환소: 등록 취소 ──
    else if (customId.startsWith("exchange_cancel_")) {
        const listingId = parseInt(customId.slice("exchange_cancel_".length), 10);
        const listing = getExchangeListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 교환을 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id !== listing.offerer_id) {
            await interaction.reply({ content: "❌ 등록자만 취소할 수 있습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.status !== "active") {
            await interaction.reply({ content: "❌ 이미 종료된 교환입니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        setExchangeListingStatus(listing.id, "cancelled");

        const updatedListing = getExchangeListing(listingId)!;
        const cancelledEmbed = buildExchangeListingEmbed(updatedListing);
        cancelledEmbed.setDescription("⚫ **등록 취소됨** — 등록자가 교환을 취소했습니다.");

        await interaction.update({ embeds: [cancelledEmbed], components: [] });

        if (listing.thread_id) {
            try {
                const thread = await interaction.client.channels.fetch(listing.thread_id);
                if (thread?.isThread()) {
                    await thread.send("❌ 등록자가 교환을 취소했습니다. 이 스레드는 아카이브됩니다.");
                    await thread.setArchived(true);
                }
            } catch { /* ignore */ }
        }
    }

    // ── 교환소: 스레드 내 교환 완료 ──
    else if (customId.startsWith("exchange_thread_complete_")) {
        const listingId = parseInt(customId.slice("exchange_thread_complete_".length), 10);
        const listing = getExchangeListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 교환을 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id !== listing.offerer_id) {
            await interaction.reply({ content: "❌ 등록자만 교환을 완료할 수 있습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.status !== "active") {
            await interaction.reply({ content: "❌ 이미 종료된 교환입니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        completeExchangeTransaction(listing.id);

        const doneEmbed = new EmbedBuilder()
            .setTitle("✅ 교환 완료")
            .setColor(0x57F287)
            .setDescription(
                `**${listing.offer_item}** x${listing.offer_quantity} ⇄ **${listing.want_item}** x${listing.want_quantity} 교환이 완료되었습니다!\n\n` +
                `등록자: <@${listing.offerer_id}>\n교환 상대: <@${listing.responder_id}>\n\n이 스레드는 아카이브됩니다.`,
            );

        await interaction.update({ embeds: [doneEmbed], components: [] });

        // 원래 메시지 업데이트
        try {
            if (listing.channel_id && listing.message_id) {
                const channel = await interaction.client.channels.fetch(listing.channel_id);
                if (channel?.isTextBased()) {
                    const msg = await channel.messages.fetch(listing.message_id);
                    const updatedListing = getExchangeListing(listingId)!;
                    const completedEmbed = buildExchangeListingEmbed(updatedListing);
                    completedEmbed.setDescription(`🎉 **교환 완료!** <@${listing.offerer_id}>님과 <@${listing.responder_id}>님의 교환이 완료되었습니다!`);
                    await msg.edit({ embeds: [completedEmbed], components: [] });
                }
            }
        } catch { /* ignore */ }

        try {
            const thread = interaction.channel;
            if (thread?.isThread()) {
                await thread.setLocked(true);
                await thread.setArchived(true);
            }
        } catch { /* ignore */ }
    }

    // ── 교환소: 스레드 내 교환 취소 ──
    else if (customId.startsWith("exchange_thread_cancel_")) {
        const listingId = parseInt(customId.slice("exchange_thread_cancel_".length), 10);
        const listing = getExchangeListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 교환을 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (interaction.user.id !== listing.offerer_id && interaction.user.id !== listing.responder_id) {
            await interaction.reply({ content: "❌ 교환 당사자만 취소할 수 있습니다.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (listing.status !== "active") {
            await interaction.reply({ content: "❌ 이미 종료된 교환입니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        // 교환 요청만 취소 (등록은 유지)
        setExchangeListingThread(listing.id, "", "", "");

        const cancelEmbed = new EmbedBuilder()
            .setTitle("❌ 교환 요청 취소")
            .setColor(0xED4245)
            .setDescription("교환 요청이 취소되었습니다. 이 스레드는 아카이브됩니다.\n다른 유저가 다시 교환 요청을 할 수 있습니다.");

        await interaction.update({ embeds: [cancelEmbed], components: [] });

        // 원래 메시지 업데이트
        try {
            if (listing.channel_id && listing.message_id) {
                const channel = await interaction.client.channels.fetch(listing.channel_id);
                if (channel?.isTextBased()) {
                    const msg = await channel.messages.fetch(listing.message_id);
                    const updatedListing = getExchangeListing(listingId)!;
                    await msg.edit({
                        embeds: [buildExchangeListingEmbed(updatedListing)],
                        components: [buildExchangeListingButtons(updatedListing)],
                    });
                }
            }
        } catch { /* ignore */ }

        try {
            const thread = interaction.channel;
            if (thread?.isThread()) {
                await thread.setArchived(true);
            }
        } catch { /* ignore */ }
    }

    // ── 목록 페이지네이션 ──
    else if (customId.startsWith("trade_list_prev_") || customId.startsWith("trade_list_next_")) {
        const isNext = customId.startsWith("trade_list_next_");
        const parts = customId.split("_");
        const type = parts[3]; // "market" or "exchange"
        const currentPage = parseInt(parts[4], 10);
        const newPage = isNext ? currentPage + 1 : currentPage - 1;
        const guildId = interaction.guildId!;
        const perPage = 5;

        if (type === "market") {
            const listings = getActiveMarketListings(guildId);
            const totalPages = Math.max(1, Math.ceil(listings.length / perPage));
            const pageListings = listings.slice((newPage - 1) * perPage, newPage * perPage);

            const embed = buildMarketListEmbed(pageListings, newPage, totalPages);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("trade_select_listing")
                .setPlaceholder("아이템을 선택하여 상세 정보를 확인하세요")
                .addOptions(
                    pageListings.map((l) => ({
                        label: `#${l.id} ${l.item_name} x${l.quantity}`,
                        description: `${l.price.toLocaleString()}원 | 판매자: ${l.seller_name}`,
                        value: l.id.toString(),
                    })),
                );

            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
            const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [selectRow];

            if (totalPages > 1) {
                const pageButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`trade_list_prev_market_${newPage}`)
                        .setLabel("◀ 이전")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(newPage <= 1),
                    new ButtonBuilder()
                        .setCustomId(`trade_list_next_market_${newPage}`)
                        .setLabel("다음 ▶")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(newPage >= totalPages),
                );
                components.push(pageButtons);
            }

            await interaction.update({ embeds: [embed], components });
        } else if (type === "exchange") {
            const listings = getActiveExchanges(guildId);
            const totalPages = Math.max(1, Math.ceil(listings.length / perPage));
            const pageListings = listings.slice((newPage - 1) * perPage, newPage * perPage);

            const embed = buildExchangeListEmbed(pageListings, newPage, totalPages);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("exchange_select_listing")
                .setPlaceholder("교환 요청을 선택하여 상세 정보를 확인하세요")
                .addOptions(
                    pageListings.map((l) => ({
                        label: `#${l.id} ${l.offer_item} ⇄ ${l.want_item}`,
                        description: `x${l.offer_quantity} ⇄ x${l.want_quantity} | 등록자: ${l.offerer_name}`,
                        value: l.id.toString(),
                    })),
                );

            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
            const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [selectRow];

            if (totalPages > 1) {
                const pageButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`trade_list_prev_exchange_${newPage}`)
                        .setLabel("◀ 이전")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(newPage <= 1),
                    new ButtonBuilder()
                        .setCustomId(`trade_list_next_exchange_${newPage}`)
                        .setLabel("다음 ▶")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(newPage >= totalPages),
                );
                components.push(pageButtons);
            }

            await interaction.update({ embeds: [embed], components });
        }
    }
}

// ─── 셀렉트 메뉴 핸들러 ───

export async function handleTradeSelect(interaction: StringSelectMenuInteraction) {
    const { customId } = interaction;

    if (customId === "trade_select_listing") {
        const listingId = parseInt(interaction.values[0], 10);
        const listing = getMarketListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 거래를 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = buildMarketListingEmbed(listing);
        const buttons = buildMarketListingButtons(listing);

        await interaction.reply({ embeds: [embed], components: [buttons], flags: MessageFlags.Ephemeral });
    } else if (customId === "exchange_select_listing") {
        const listingId = parseInt(interaction.values[0], 10);
        const listing = getExchangeListing(listingId);

        if (!listing) {
            await interaction.reply({ content: "❌ 해당 교환을 찾을 수 없습니다.", flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = buildExchangeListingEmbed(listing);
        const buttons = buildExchangeListingButtons(listing);

        await interaction.reply({ embeds: [embed], components: [buttons], flags: MessageFlags.Ephemeral });
    }
}