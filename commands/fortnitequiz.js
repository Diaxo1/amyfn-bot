const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    MessageFlags
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
    answers
) {
    const letters = ['A', 'B', 'C', 'D'];

    const buttons = answers.map(
        (answer, index) => {
            return new ButtonBuilder()
                .setCustomId(
                    `quiz_${quizId}_${index}`
                )
                .setLabel(
                    `${letters[index]} • ${answer}`
                )
                .setStyle(
                    ButtonStyle.Primary
                );
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

function createResultEmbed(
    question,
    selectedAnswer,
    correct
) {
    const embed = new EmbedBuilder()
        .setColor(
            correct
                ? 0x2ecc71
                : 0xe74c3c
        )
        .setTitle(
            correct
                ? '✅ Correct!'
                : '❌ Not quite!'
        )
        .setDescription(
            correct
                ? `**${selectedAnswer}** was the correct answer!`
                : `You chose **${selectedAnswer}**.\n\nThe correct answer was **${question.correctAnswer}**.`
        )
        .setFooter({
            text: 'AMYFN • Fortnite Quiz'
        })
        .setTimestamp();

    return embed;
}

async function createQuizMessage(
    interaction
) {
    // Tell Discord immediately that we're processing the quiz.
    // This prevents the interaction from expiring while Sharp
    // generates the quiz image.
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

    const embed =
        new EmbedBuilder()
            .setColor(0x1493ff)
            .setImage(
                'attachment://quiz-current.png'
            )
            .setFooter({
                text:
                    'AMYFN • Fortnite Quiz • Medium'
            });

    const components =
        createAnswerButtons(
            quizId,
            answers
        );

    return interaction.editReply({
        embeds: [embed],
        files: [attachment],
        components
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fortnitequiz')
        .setDescription(
            'Test your Fortnite knowledge.'
        ),

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

        const resultEmbed =
            createResultEmbed(
                quiz.question,
                selectedAnswer,
                correct
            );

        const disabledRows =
            interaction.message.components.map(
                row => {
                    return new ActionRowBuilder()
                        .addComponents(
                            row.components.map(
                                button => {
                                    const isSelected =
                                        button.customId.endsWith(
                                            `_${answerIndex}`
                                        );

                                    return ButtonBuilder
                                        .from(button)
                                        .setDisabled(true)
                                        .setStyle(
                                            isSelected
                                                ? (
                                                    correct
                                                        ? ButtonStyle.Success
                                                        : ButtonStyle.Danger
                                                )
                                                : ButtonStyle.Secondary
                                        );
                                }
                            )
                        );
                }
            );

        await interaction.update({
            embeds: [
                interaction.message.embeds[0],
                resultEmbed
            ],
            components:
                disabledRows
        });

        return true;
    }
};