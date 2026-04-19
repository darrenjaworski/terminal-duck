import * as vscode from 'vscode';
import { CapturedExecution, formatExecutions } from './format';

const MAX_HISTORY = 20;
const MAX_OUTPUT_BYTES = 8_000;
const MAX_CONTEXT_EXECUTIONS = 6;

class ShellHistory {
	private readonly buffer: CapturedExecution[] = [];
	private readonly inflight = new Map<vscode.TerminalShellExecution, CapturedExecution>();

	register(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.window.onDidStartTerminalShellExecution(e => this.onStart(e)),
			vscode.window.onDidEndTerminalShellExecution(e => this.onEnd(e)),
		);
	}

	private onStart(e: vscode.TerminalShellExecutionStartEvent) {
		const record: CapturedExecution = {
			commandLine: e.execution.commandLine.value,
			cwd: e.execution.cwd?.fsPath,
			exitCode: undefined,
			startedAt: Date.now(),
			endedAt: undefined,
			output: '',
		};
		this.inflight.set(e.execution, record);
		this.push(record);
		this.drain(e.execution, record);
	}

	private async drain(execution: vscode.TerminalShellExecution, record: CapturedExecution) {
		try {
			for await (const chunk of execution.read()) {
				const remaining = MAX_OUTPUT_BYTES - record.output.length;
				if (remaining <= 0) continue;
				record.output += chunk.length > remaining ? chunk.slice(0, remaining) : chunk;
			}
		} catch {
			// stream ended abnormally; we'll keep whatever output we captured
		}
	}

	private onEnd(e: vscode.TerminalShellExecutionEndEvent) {
		const record = this.inflight.get(e.execution);
		if (!record) return;
		record.exitCode = e.exitCode;
		record.endedAt = Date.now();
		this.inflight.delete(e.execution);
	}

	private push(record: CapturedExecution) {
		this.buffer.push(record);
		if (this.buffer.length > MAX_HISTORY) this.buffer.shift();
	}

	recent(n: number = MAX_CONTEXT_EXECUTIONS): CapturedExecution[] {
		return this.buffer.slice(-n);
	}

	clear() {
		this.buffer.length = 0;
	}
}

const SYSTEM_PROMPT = `You are Duck, a rubber-duck debugging assistant for a developer working in VS Code.
You have access to the real commands the user just ran in their integrated terminal, along with exit codes and captured output.
When the user asks a question, ground your answer in the actual terminal history when relevant — cite the specific command and exit code.
If no commands are relevant, say so and answer from general knowledge.
Be concise. Lead with the most likely cause of any failure, then suggest one concrete next step.`;

async function handleChat(
	history: ShellHistory,
	request: vscode.ChatRequest,
	_context: vscode.ChatContext,
	stream: vscode.ChatResponseStream,
	token: vscode.CancellationToken,
): Promise<void> {
	const executions = history.recent();
	stream.progress(
		executions.length > 0
			? `Looking at your last ${executions.length} terminal command${executions.length === 1 ? '' : 's'}…`
			: 'No terminal history captured yet — answering from the prompt alone…',
	);

	const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
	if (!model) {
		stream.markdown(
			'**No language model available.** Install GitHub Copilot Chat and sign in, then try again.',
		);
		return;
	}

	const messages: vscode.LanguageModelChatMessage[] = [
		vscode.LanguageModelChatMessage.User(SYSTEM_PROMPT),
		vscode.LanguageModelChatMessage.User(
			`Recent terminal activity:\n\n${formatExecutions(executions)}`,
		),
		vscode.LanguageModelChatMessage.User(request.prompt),
	];

	try {
		const response = await model.sendRequest(messages, {}, token);
		for await (const chunk of response.text) {
			stream.markdown(chunk);
		}
	} catch (err) {
		if (err instanceof vscode.LanguageModelError) {
			stream.markdown(`**Language model error:** ${err.message}`);
		} else {
			throw err;
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	const history = new ShellHistory();
	history.register(context);

	const participant = vscode.chat.createChatParticipant(
		'duck.duck',
		(request, chatContext, stream, token) => handleChat(history, request, chatContext, stream, token),
	);
	participant.iconPath = new vscode.ThemeIcon('debug-console');
	context.subscriptions.push(participant);

	context.subscriptions.push(
		vscode.commands.registerCommand('duck.clearHistory', () => {
			history.clear();
			vscode.window.showInformationMessage('Duck: shell history cleared.');
		}),
	);
}

export function deactivate() {}
