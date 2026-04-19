import { describe, it, expect } from 'vitest';
import { stripAnsi, formatExecutions, CapturedExecution } from './format';

describe('stripAnsi', () => {
	it('removes colour escape sequences', () => {
		expect(stripAnsi('\x1b[31mred\x1b[0m')).toBe('red');
	});

	it('passes plain text through unchanged', () => {
		expect(stripAnsi('hello world')).toBe('hello world');
	});

	it('strips cursor-movement sequences', () => {
		expect(stripAnsi('before\x1b[2Kafter')).toBe('beforeafter');
	});
});

describe('formatExecutions', () => {
	it('returns a hint when there is no history', () => {
		expect(formatExecutions([])).toMatch(/no terminal commands/i);
	});

	it('marks failed executions with their exit code', () => {
		const exec: CapturedExecution = {
			commandLine: 'npm test',
			cwd: '/tmp/project',
			exitCode: 1,
			startedAt: 0,
			endedAt: 1,
			output: 'Error: nope',
		};
		const out = formatExecutions([exec]);
		expect(out).toContain('FAILED exit 1');
		expect(out).toContain('$ npm test');
		expect(out).toContain('Error: nope');
		expect(out).toContain('/tmp/project');
	});

	it('marks in-flight executions as still running', () => {
		const exec: CapturedExecution = {
			commandLine: 'tail -f log',
			cwd: '/tmp',
			exitCode: undefined,
			startedAt: 0,
			endedAt: undefined,
			output: '',
		};
		expect(formatExecutions([exec])).toContain('still running');
	});

	it('strips ansi sequences from captured output', () => {
		const exec: CapturedExecution = {
			commandLine: 'echo hi',
			cwd: undefined,
			exitCode: 0,
			startedAt: 0,
			endedAt: 1,
			output: '\x1b[32mhi\x1b[0m',
		};
		const out = formatExecutions([exec]);
		expect(out).toContain('hi');
		expect(out).not.toContain('\x1b');
	});
});
