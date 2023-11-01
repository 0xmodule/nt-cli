/**
 * Validate ceremony setup command.
 */
declare const validate: (cmd: {
    template: string;
    constraints?: number;
}) => Promise<void>;
export default validate;
