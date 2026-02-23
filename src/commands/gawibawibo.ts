import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ComponentType,
    MessageFlags,
} from "discord.js";
import type { BotCommand } from "@/types/types.js";

type Choice = "가위" | "바위" | "보";

const CHOICES: { label: Choice; emoji: string }[] = [
    { label: "가위", emoji: "✌️" },
    { label: "바위", emoji: "✊" },
    { label: "보", emoji: "🖐️" },
];

function getResult(a: Choice, b: Choice): "win" | "lose" | "draw" {
    if (a === b) return "draw";
    if (
        (a === "가위" && b === "보") ||
        (a === "바위" && b === "가위") ||
        (a === "보" && b === "바위")
    ) return "win";
    return "lose";
}

function choiceEmoji(c: Choice): string {
    return CHOICES.find(x => x.label === c)!.emoji;
}

export const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("가위바위보")
        .setDescription("상대방과 가위바위보 게임을 합니다.")
        .addUserOption(option =>
            option
                .setName("상대")
                .setDescription("가위바위보를 할 상대를 선택하세요.")
                .setRequired(true),
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const challenger = interaction.user;
        const opponent = interaction.options.getUser("상대", true);

        if (opponent.id === challenger.id) {
            await interaction.reply({ content: "❌ 자기 자신과는 대결할 수 없습니다!", flags: MessageFlags.Ephemeral });
            return;
        }
        if (opponent.bot) {
            await interaction.reply({ content: "❌ 봇과는 대결할 수 없습니다!", flags: MessageFlags.Ephemeral });
            return;
        }

        const gameId = `rps_${interaction.id}`;

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            CHOICES.map((c, i) =>
                new ButtonBuilder()
                    .setCustomId(`${gameId}_${c.label}`)
                    .setLabel(c.label)
                    .setEmoji(c.emoji)
                    .setStyle(ButtonStyle.Primary),
            ),
        );

        const embed = new EmbedBuilder()
            .setTitle("✊ 가위바위보! ✌️")
            .setDescription(
                `${challenger} **VS** ${opponent}\n\n아래 버튼을 눌러 선택하세요!\n⏱️ **10초** 안에 선택해주세요.`,
            )
            .setColor(0x5865f2)
            .setFooter({ text: "두 사람 모두 선택해야 결과가 나옵니다." });

        const reply = await interaction.reply({
            embeds: [embed],
            components: [buttons],
        });
        const message = await reply.fetch();

        const picks = new Map<string, Choice>();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 10_000,
            filter: (i) => {
                if (i.user.id !== challenger.id && i.user.id !== opponent.id) {
                    i.reply({ content: "❌ 이 게임의 참가자가 아닙니다!", flags: MessageFlags.Ephemeral });
                    return false;
                }
                if (!i.customId.startsWith(gameId)) return false;
                return true;
            },
        });

        collector.on("collect", async (i) => {
            const choice = i.customId.replace(`${gameId}_`, "") as Choice;

            if (picks.has(i.user.id)) {
                await i.reply({ content: "이미 선택하셨습니다!", flags: MessageFlags.Ephemeral });
                return;
            }

            picks.set(i.user.id, choice);
            await i.reply({ content: `${choiceEmoji(choice)} **${choice}** 선택 완료!`, flags: MessageFlags.Ephemeral });

            if (picks.size === 2) {
                collector.stop("done");
            }
        });

        collector.on("end", async (_collected, reason) => {
            if (picks.size < 2) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle("⏱️ 시간 초과!")
                    .setDescription("10초 안에 두 사람 모두 선택하지 않아 게임이 취소되었습니다.")
                    .setColor(0xed4245);

                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                return;
            }

            const challengerPick = picks.get(challenger.id)!;
            const opponentPick = picks.get(opponent.id)!;
            const result = getResult(challengerPick, opponentPick);

            let resultEmbed: EmbedBuilder;

            if (result === "draw") {
                resultEmbed = new EmbedBuilder()
                    .setTitle("🤝 무승부!")
                    .setDescription(
                        `${challenger} ${choiceEmoji(challengerPick)} **${challengerPick}** vs **${opponentPick}** ${choiceEmoji(opponentPick)} ${opponent}`,
                    )
                    .setColor(0xfee75c);
            } else {
                const winner = result === "win" ? challenger : opponent;
                const loser = result === "win" ? opponent : challenger;
                const winnerPick = result === "win" ? challengerPick : opponentPick;
                const loserPick = result === "win" ? opponentPick : challengerPick;

                resultEmbed = new EmbedBuilder()
                    .setTitle("🎉 승부 결과!")
                    .setDescription(
                        `🏆 **승자:** ${winner}\n💀 **패자:** ${loser}`,
                    )
                    .addFields({
                        name: "선택",
                        value: `${winner} ${choiceEmoji(winnerPick)} **${winnerPick}** vs **${loserPick}** ${choiceEmoji(loserPick)} ${loser}`,
                    })
                    .setColor(0x57f287);
            }

            await interaction.editReply({ embeds: [resultEmbed], components: [] });
        });
    },
};