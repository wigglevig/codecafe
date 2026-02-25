import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  memo,
} from "react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import "react-resizable/css/styles.css";
import { FitAddon } from "xterm-addon-fit";
import { TerminalComponentProps } from "../types/props";
import { ANSI_COLORS } from "../constants/terminal";
import { TerminalHandle } from "../types/editor";
import "./Terminal.css";

const TerminalComponent = forwardRef<TerminalHandle, TerminalComponentProps>(
  (_, ref) => {
    // REFS
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminalInstance = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const currentLineRef = useRef<string>("");

    // EFFECTS
    useEffect(() => {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "monospace",
        scrollback: 1000,
        theme: {
          background: "rgba(0,0,0,0)",
          foreground: "#ffffff",
        },
        allowTransparency: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      if (terminalRef.current) {
        term.open(terminalRef.current);
        fitAddon.fit();

        terminalInstance.current = term;
        fitAddonRef.current = fitAddon;

        term.write("Welcome to CodeCafe!\r\n");
        writePrompt(term);

        // Handle user input
        term.onData((data) => {
          if (data === "\r") {
            const command = currentLineRef.current;
            currentLineRef.current = "";

            term.write("\r\n");

            if (command === "clear") {
              term.clear();
            } else if (command === "help") {
              term.write(
                `${ANSI_COLORS.OUTPUT_COLOR}Available commands: clear, help, echo, date\r\n`
              );
            } else if (command.startsWith("echo ")) {
              term.write(
                `${ANSI_COLORS.OUTPUT_COLOR}${command.substring(5)}\r\n`
              );
            } else if (command === "date") {
              term.write(
                `${ANSI_COLORS.OUTPUT_COLOR}${new Date().toLocaleString()}\r\n`
              );
            } else if (command === "codecafe") {
              term.write("\r\n");
              term.write(
                `${ANSI_COLORS.OUTPUT_COLOR}   ______            __       ______        ____    \r\n`
              );
              term.write(
                `${ANSI_COLORS.OUTPUT_COLOR}  / ____/____   ____/ /___   / ____/____ _ / __/___ \r\n`
              );
              term.write(
                `${ANSI_COLORS.OUTPUT_COLOR} / /    / __ \\ / __  // _ \\ / /    / __ \`// /_ / _ \\\r\n`
              );
              term.write(
                `${ANSI_COLORS.OUTPUT_COLOR}/ /___ / /_/ // /_/ //  __// /___ / /_/ // __//  __/\r\n`
              );
              term.write(
                `${ANSI_COLORS.OUTPUT_COLOR}\\____/ \\____/ \\__,_/ \\___/ \\____/ \\__,_//_/   \\___/\r\n`
              );
              term.write("\r\n");
            } else if (command.length > 0) {
              term.write(
                `${ANSI_COLORS.OUTPUT_COLOR}Command not found: ${command}\r\n`
              );
              term.write(
                `${ANSI_COLORS.OUTPUT_COLOR}Type 'help' to see available commands.\r\n`
              );
            }

            writePrompt(term);
          } else if (data === "\x7f") {
            if (currentLineRef.current.length > 0) {
              currentLineRef.current = currentLineRef.current.substring(
                0,
                currentLineRef.current.length - 1
              );
              term.write("\b \b");
            }
          } else if (data >= " " && data <= "~") {
            currentLineRef.current += data;
            term.write(`${ANSI_COLORS.INPUT_COLOR}${data}${ANSI_COLORS.RESET}`);
          }
        });
      }

      // Cleanup function
      return () => {
        if (terminalInstance.current) {
          terminalInstance.current.dispose();
        }
      };
    }, []);

    // Helper function to write the prompt with the correct color
    const writePrompt = (term: Terminal) => {
      term.write(`${ANSI_COLORS.PROMPT_COLOR}$ ${ANSI_COLORS.RESET}`);
    };

    useImperativeHandle(ref, () => ({
      writeToTerminal: (output: string) => {
        if (terminalInstance.current) {
          const term = terminalInstance.current;
          term.write("\x1b[2K\r");
          const lines = output.split("\n");
          lines.forEach((line, index) => {
            if (index > 0) {
              term.write("\r\n");
            }
            term.write(
              `${ANSI_COLORS.OUTPUT_COLOR}${line}${ANSI_COLORS.RESET}`
            );
          });
          if (!output.endsWith("\n")) {
            term.write("\r\n");
          }
          writePrompt(term);
        }
      },
      clear: () => {
        if (terminalInstance.current) {
          terminalInstance.current.clear();
          writePrompt(terminalInstance.current);
        }
      },
      fit: () => {
        try {
          fitAddonRef.current?.fit();
        } catch (error) {
          console.error("Imperative fit error:", error);
        }
      },
    }));

    return (
      <div
        ref={terminalRef}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0)",
        }}
        className=""
      />
    );
  }
);

TerminalComponent.displayName = "TerminalComponent";

export default memo(TerminalComponent);
