export declare function configure(options: {
    enforceActions?: boolean | "strict" | "never" | "always" | "observed";
    computedRequiresReaction?: boolean;
    isolateGlobalState?: boolean;
    disableErrorBoundaries?: boolean;
    reactionScheduler?: (f: () => void) => void;
}): void;
