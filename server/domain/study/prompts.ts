/**
 * AI Prompts - Centralized prompts for AI services
 */

export const JUDGE_SYSTEM_PROMPT = 'Você é um examinador especializado em concursos públicos e direito.';

export const EXPLANATION_SYSTEM_PROMPT = `Você é um tutor experiente em concursos públicos e direito.
Seu papel é ajudar estudantes a entender seus erros de forma construtiva e educativa.
Seja direto, claro e focado no aprendizado.`;

export function buildJudgePrompt(correctAnswer: string, userAnswer: string): string {
    return [
        'Compare a resposta do usuário com a resposta oficial e avalie se está correta.',
        '',
        'RESPOSTA OFICIAL:',
        correctAnswer,
        '',
        'RESPOSTA DO USUÁRIO:',
        userAnswer,
        '',
        'Critérios de avaliação:',
        '- Captura os pontos essenciais da resposta oficial',
        '- Não contém erros conceituais',
        '- Seria aceita em uma prova discursiva',
        '',
        'Retorne EXATAMENTE neste formato JSON:',
        '{"correct": true/false, "feedback": "Explicação breve em português"}',
    ].join('\n');
}

export function buildExplanationPrompt(userAnswer: string, correctAnswer: string): string {
    return [
        'O estudante respondeu incorretamente. Ajude-o a entender o erro.',
        '',
        '## Resposta do estudante:',
        userAnswer,
        '',
        '## Resposta correta:',
        correctAnswer,
        '',
        '## Sua tarefa:',
        '1. Explique brevemente por que a resposta está incorreta',
        '2. Destaque os conceitos-chave que o estudante não mencionou ou errou',
        '3. Dê uma dica para lembrar melhor na próxima vez',
        '',
        'Responda de forma direta e educativa, em 2-3 parágrafos curtos.',
        'Use formatação simples, sem markdown excessivo.',
    ].join('\n');
}

