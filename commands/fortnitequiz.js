const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const { createQuizImage } = require('../services/quizImage');

const QUESTIONS_FILE = path.join(
    __dirname,
    '..',
    'data',
    'quizQuestions.json'
);

const activeQuizzes = new Map();

function loadQuestions() {
    try {
        const data = fs.readFileSync(
            QUESTIONS_FILE,
            'utf8'
        );

        const questions = JSON.parse(data);

        if (!Array.isArray(questions)) {
            throw new Error(
                'Quiz question file must contain an array.'
            );
        }

        return questions;
    } catch (error) {
        console.error(
            '❌ Failed to load quiz questions:',
            error
        );

        return [];
    }
}

function shuffle(array) {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [copy[i], copy[j]] =
            [copy[j], copy[i]];
    }

    return copy;
}

function createAnswerButtons(
    quizId,
    answers,
    disabled = false,
    selectedIndex = null,
    correctIndex = null
) {
    const letters = ['A', 'B', 'C', 'D'];

    const buttons = answers.map(
        (answer, index) => {
            let style = ButtonStyle.Primary;

            if (disabled) {
                if (index === selectedIndex) {
                    style =
                        selectedIndex === correctIndex
                            ? ButtonStyle.Success
                            : ButtonStyle.Danger;
                } else {
                    style = ButtonStyle.Secondary;
                }
            }

            return new ButtonBuilder()
                .setCustomId(
                    `quiz_${quizId}_${index}`
                )
                .setLabel(
                    `${letters[index]} • ${answer}`
                )
                .setStyle(style)
                .setDisabled(disabled);
        }
    );

    return [
        new ActionRowBuilder()
            .addComponents(
                buttons.slice(0, 2)
            ),

        new ActionRowBuilder()
            .addComponents(
                buttons.slice(2, 4)
            )
    ];
}

function createQuizContainer(
    question,
    imageName = 'quiz-current.png',
    result = null
) {
    const container =
        new ContainerBuilder();

    if (!result) {
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '# 💙 __Fortnite Quiz__\n' +
                        '**TEST YOUR FORTNITE KNOWLEDGE**\n\n' +
                        '▌ Choose the answer you think is correct below.'
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(
                            `attachment://${imageName}`
                        )
                        .setDescription(
                            'Fortnite Quiz Question'
                        )
                )
        );

        container
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(
                        SeparatorSpacingSize.Small
                    )
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '🧠 **Question**\n\n' +
                    `▌ ${question.question}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(
                        SeparatorSpacingSize.Small
                    )
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '🎯 **Your Answer**\n\n' +
                    '▌ Pick one of the four choices below.\n\n' +
                    '-# AMYFN • FORTNITE QUIZ'
                )
            );
    } else {
        const correct =
            result.selectedAnswer ===
            question.correctAnswer;

        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        correct
                            ? '# 💙 __Correct!__\n**NICE ONE, YOU KNOW YOUR FORTNITE.**'
                            : '# 💙 __Not Quite!__\n**BETTER LUCK ON THE NEXT ONE.**'
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(
                            `attachment://${imageName}`
                        )
                        .setDescription(
                            'Fortnite Quiz Result'
                        )
                )
        );

        container
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(
                        SeparatorSpacingSize.Small
                    )
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '🧠 **Question**\n\n' +
                    `▌ ${question.question}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(
                        SeparatorSpacingSize.Small
                    )
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    correct
                        ? `✅ **Your Answer**\n\n▌ ${result.selectedAnswer}\n\n` +
                          '🎉 **Correct answer!**'
                        : `❌ **Your Answer**\n\n▌ ${result.selectedAnswer}\n\n` +
                          `💡 **Correct Answer**\n\n▌ ${question.correctAnswer}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(
                        SeparatorSpacingSize.Small
                    )
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '🔄 **Want another?**\n\n' +
                    '▌ Run `/fortnitequiz` to start a new question.\n\n' +
                    '-# AMYFN • FORTNITE QUIZ'
                )
            );
    }

    return container;
}

async function createQuizMessage(
    interaction
) {
    await interaction.deferReply();

    const questions = loadQuestions();

    if (!questions.length) {
        return interaction.editReply({
            content:
                '❌ The Fortnite Quiz question bank is empty or could not be loaded.'
        });
    }

    const question =
        questions[
            Math.floor(
                Math.random() *
                questions.length
            )
        ];

    const answers = shuffle([
        question.correctAnswer,
        ...question.wrongAnswers
    ]);

    const quizId =
        `${interaction.user.id}_${Date.now()}`;

    const quiz = {
        id: quizId,
        userId: interaction.user.id,
        question,
        answers,
        answered: false
    };

    activeQuizzes.set(
        quizId,
        quiz
    );

    const imagePath =
        await createQuizImage(
            question.question
        );

    const attachment =
        new AttachmentBuilder(
            imagePath
        ).setName(
            'quiz-current.png'
        );

    const container =
        createQuizContainer(
            question
        );

    const components = [
        container,
        ...createAnswerButtons(
            quizId,
            answers
        )
    ];

    return interaction.editReply({
        components,
        files: [attachment],
        flags: MessageFlags.IsComponentsV2
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fortnitequiz')
        .setDescription(
            'Test your Fortnite knowledge.'
        ),

    createQuizContainer,

    async execute(interaction) {
        try {
            await createQuizMessage(
                interaction
            );
        } catch (error) {
            console.error(
                '❌ Fortnite Quiz error:',
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                return interaction.editReply({
                    content:
                        '❌ Something went wrong while creating the Fortnite Quiz.'
                });
            }

            return interaction.reply({
                content:
                    '❌ Something went wrong while creating the Fortnite Quiz.',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async handleButton(interaction) {
        const parts =
            interaction.customId.split('_');

        if (
            parts[0] !== 'quiz' ||
            parts.length < 3
        ) {
            return false;
        }

        const quizId =
            parts.slice(1, -1).join('_');

        const answerIndex =
            Number(
                parts[parts.length - 1]
            );

        const quiz =
            activeQuizzes.get(
                quizId
            );

        if (!quiz) {
            await interaction.reply({
                content:
                    '❌ This quiz has expired. Start a new one with `/fortnitequiz`.',
                flags: MessageFlags.Ephemeral
            });

            return true;
        }

        if (
            interaction.user.id !==
            quiz.userId
        ) {
            await interaction.reply({
                content:
                    '❌ This quiz belongs to another player.',
                flags: MessageFlags.Ephemeral
            });

            return true;
        }

        if (quiz.answered) {
            await interaction.reply({
                content:
                    '❌ You already answered this question.',
                flags: MessageFlags.Ephemeral
            });

            return true;
        }

        const selectedAnswer =
            quiz.answers[answerIndex];

        if (
            typeof selectedAnswer !==
            'string'
        ) {
            await interaction.reply({
                content:
                    '❌ Invalid quiz answer.',
                flags: MessageFlags.Ephemeral
            });

            return true;
        }

        quiz.answered = true;

        const correct =
            selectedAnswer ===
            quiz.question.correctAnswer;

        activeQuizzes.delete(
            quizId
        );

        const correctIndex =
            quiz.answers.findIndex(
                answer =>
                    answer ===
                    quiz.question.correctAnswer
            );

        const resultContainer =
            createQuizContainer(
                quiz.question,
                'quiz-current.png',
                {
                    selectedAnswer,
                    correct
                }
            );

        const disabledRows =
            createAnswerButtons(
                quizId,
                quiz.answers,
                true,
                answerIndex,
                correctIndex
            );

        await interaction.update({
            components: [
                resultContainer,
                ...disabledRows
            ],
            flags:
                MessageFlags.IsComponentsV2
        });

        return true;
    }
};
