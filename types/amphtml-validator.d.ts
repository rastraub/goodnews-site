declare module "amphtml-validator" {
  export type AmpValidationError = {
    severity: string;
    line: number;
    col: number;
    message: string;
    specUrl: string | null;
  };

  export type AmpValidationResult = {
    status: "PASS" | "FAIL" | "UNKNOWN";
    errors: AmpValidationError[];
  };

  export type AmpValidatorInstance = {
    validateString(html: string, format?: string): AmpValidationResult;
  };

  export function getInstance(validatorUrl?: string, userAgent?: string): Promise<AmpValidatorInstance>;

  const amphtmlValidator: {
    getInstance: typeof getInstance;
  };

  export default amphtmlValidator;
}
