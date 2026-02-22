import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    EmbedBuilder, 
    ComponentType, 
    MessageFlags
} from "discord.js";
import type { BotCommand } from "@/types/types.js";
import { recipes } from "@/data/recipe.js";

export const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("요리레시피")
        .setDescription("요리 레시피를 검색하고 상세 정보를 확인합니다.")
        .addStringOption(option => 
            option.setName('검색어')
                .setDescription('검색할 레시피 이름의 일부를 입력하세요.')
                .setRequired(false)
        ),
    
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const searchQuery = interaction.options.getString('검색어');

        let filteredRecipes = recipes;
        if (searchQuery) {
            filteredRecipes = recipes.filter(r => r.name.includes(searchQuery));
        }

        if (filteredRecipes.length === 0) {
            await interaction.editReply({
                content: `검색어 "${searchQuery}"에 해당하는 레시피를 찾을 수 없습니다.`,
            });
            return;
        }

        // Limit to 25 options (Discord select menu limit)
        if (filteredRecipes.length > 25) {
            await interaction.editReply({
                content: `검색 결과가 너무 많습니다 (${filteredRecipes.length}개). 더 구체적인 검색어를 입력해주세요.`,
            });
            return;
        }

        const options = filteredRecipes.map(recipe => 
            new StringSelectMenuOptionBuilder()
                .setLabel(recipe.name)
                .setValue(recipe.name)
                .setDescription(`${recipe.result} 제작 (시간: ${recipe.time}분)`)
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('recipe_select')
            .setPlaceholder('레시피를 선택하세요')
            .addOptions(options);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(selectMenu);

        const response = await interaction.editReply({
            content: searchQuery ? `"${searchQuery}" 검색 결과:` : '레시피 목록:',
            components: [row]
        });

        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect, 
            time: 60000 // 1 minute timeout
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: '이 명령어를 실행한 사용자만 선택할 수 있습니다.', flags: MessageFlags.Ephemeral });
                return;
            }

            const selectedRecipeName = i.values[0];
            const selectedRecipe = recipes.find(r => r.name === selectedRecipeName);

            if (!selectedRecipe) {
                await i.reply({ content: '선택한 레시피 정보를 찾을 수 없습니다.', flags: MessageFlags.Ephemeral });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(`🍳 ${selectedRecipe.name}`)
                .setColor(0x00FF00) // Green color
                .setDescription(`**결과물:** ${selectedRecipe.result}`)
                .addFields(
                    { 
                        name: '⏱️ 소요 시간', 
                        value: selectedRecipe.time === 0 ? '즉시 제작 가능' : `${selectedRecipe.time}분`, 
                        inline: true 
                    },
                    { 
                        name: '📦 분류', 
                        value: selectedRecipe.group === 'ingredient' ? '재료' : 
                               (selectedRecipe.group === 'advanced' ? '고급' : '일반'), 
                        inline: true 
                    },
                    { 
                        name: '📜 재료', 
                        value: selectedRecipe.materials.map(m => `- ${m.name}: ${m.amount}개`).join('\n') || '없음' 
                    }
                );

            if (selectedRecipe.usedIn && selectedRecipe.usedIn.length > 0) {
                embed.addFields({ 
                    name: '🔄 사용처', 
                    value: selectedRecipe.usedIn.join(', ') 
                });
            }

            await i.update({ 
                content: null, 
                embeds: [embed], 
                components: [row] // Keep the dropdown to allow selecting another recipe
            });
        });

        collector.on('end', () => {
             // Disable the select menu after timeout
            const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(selectMenu.setDisabled(true));
            
            interaction.editReply({ 
                components: [disabledRow] 
            }).catch(() => {}); // Ignore error if message was deleted
        });
    }
}