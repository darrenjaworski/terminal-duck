export interface CapturedExecution {
	commandLine: string;
	cwd: string | undefined;
	exitCode: number | undefined;
	startedAt: number;
	endedAt: number | undefined;
	output: string;
}

export function stripAnsi(s: string): string {
	return s.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
}

export function formatExecutions(executions: CapturedExecution[]): string {
	if (executions.length === 0) {
		return '(no terminal commands have been captured yet — shell integration may not be active)';
	}
	return executions
		.map((x, i) => {
			const status =
				x.exitCode === undefined
					? 'still running'
					: x.exitCode === 0
						? 'exit 0'
						: `FAILED exit ${x.exitCode}`;
			const output = stripAnsi(x.output).trim();
			return [
				`### Command ${i + 1} (${status})`,
				`cwd: ${x.cwd ?? 'unknown'}`,
				'```',
				`$ ${x.commandLine}`,
				output || '(no output captured)',
				'```',
			].join('\n');
		})
		.join('\n\n');
}
