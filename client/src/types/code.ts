export interface CodeExecutionRequest {
  language: string;
  version: string;
  files: { content: string }[];
}
export interface CodeExecutionResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}
