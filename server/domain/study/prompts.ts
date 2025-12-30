/**
 * AI Prompts - Centralized prompts for AI services
 */

export const JUDGE_SYSTEM_PROMPT = 'Você é um examinador especializado em concursos públicos e direito.';

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
