/**
 * Deck Status State Machine
 * 
 * Define as transições válidas de status para um Deck.
 * Segue o padrão Rich Domain Model - a lógica de negócio fica no domain layer.
 */

export const DeckStatus = {
    PROCESSING: 'processing',
    READY: 'ready',
    FAILED: 'failed',
} as const;

export type DeckStatusType = typeof DeckStatus[keyof typeof DeckStatus];

const validTransitions: Record<DeckStatusType, DeckStatusType[]> = {
    [DeckStatus.PROCESSING]: [DeckStatus.READY, DeckStatus.FAILED],
    [DeckStatus.READY]: [],
    [DeckStatus.FAILED]: [DeckStatus.PROCESSING],
};

export function canTransition(from: DeckStatusType, to: DeckStatusType): boolean {
    return validTransitions[from].includes(to);
}

/**
 * Executa a transição de status, lançando erro se inválida
 * @throws Error se a transição não for permitida
 */
export function transition(from: DeckStatusType, to: DeckStatusType): DeckStatusType {
    if (!canTransition(from, to)) {
        throw new Error(
            `Transição de status inválida: "${from}" → "${to}". ` +
            `Transições permitidas: [${validTransitions[from].join(', ') || 'nenhuma'}]`
        );
    }
    return to;
}

export function getNextPossibleStatuses(current: DeckStatusType): DeckStatusType[] {
    return validTransitions[current];
}


export function isFinalStatus(status: DeckStatusType): boolean {
    return validTransitions[status].length === 0;
}
