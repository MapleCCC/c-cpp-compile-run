import { window } from 'vscode';
import { Configuration } from './configuration';
import { File } from './models/file';
import { outputChannel } from './output-channel';
import { promptCompiler, promptFlags } from './utils/prompt-utils';
import { commandExists, isProccessRunning } from './utils/common-utils';
import { CompileOptions } from './models/compile-options';
import { spawnSync } from 'child_process';

export class Compile {
    private file: File;
    private compiler: string;
    private inputFlags: string;
    private shouldAskForInputFlags: boolean;

    constructor(file: File, options?: CompileOptions) {
        this.file = file;
        this.shouldAskForInputFlags = options.shouldAskForInputFlags;
        this.compiler = options.compiler;
        this.inputFlags = options.inputFlags;
    }

    async run() {
        if (Configuration.saveBeforeCompile()) {
            await window.activeTextEditor.document.save();
        }

        if (await isProccessRunning(this.file.executable)) {
            const errorMessage = `${this.file.executable} is already runing! Please close it first to compile successfully!`;
            window.showErrorMessage(errorMessage);
            throw new Error(errorMessage);
        }

        if (!this.isCompilerValid()) {
            const CHANGE_PATH = 'Change path';
            const choiceForDetails: string | undefined =
                await window.showErrorMessage('Compiler not found, try to change path in settings!', CHANGE_PATH);
            if (choiceForDetails === CHANGE_PATH) {
                this.compiler = await promptCompiler();

                if (this.compiler !== null && commandExists(this.compiler)) {
                    await Configuration.setCompiler(this.compiler, this.file.type);
                } else {
                    const errorMessage = 'Compiler not found';
                    await window.showErrorMessage(errorMessage);
                    throw new Error(errorMessage);
                }
            } else { throw new Error('Compiler not set!'); }
        }

        if (this.shouldAskForInputFlags) {
            this.inputFlags = await promptFlags(this.inputFlags);
            if (this.inputFlags === null) {
                throw new Error('No input flags specified');
            }
        }

        let compilerArgs = [this.file.name, '-o', this.file.executable];
        if (this.inputFlags) {
            compilerArgs = compilerArgs.concat(this.inputFlags.split(' '));
        }

        const proccess = spawnSync(`"${this.compiler}"`, compilerArgs, { cwd: this.file.directory, shell: true, encoding: 'utf-8' });

        if (proccess.stderr) {
            outputChannel.appendLine(proccess.stderr, this.file.name);
        }

        if (proccess.stdout) {
            outputChannel.appendLine(proccess.stdout, this.file.name);
        }

        if (proccess.status === 0) {
            window.showInformationMessage('Compiled successfuly!');
        } else {
            window.showErrorMessage('Error compiling!');
            outputChannel.show();
            throw new Error('error');
        }
    }

    async isCompilerValid(): Promise<boolean> {
        return this.compiler !== null && await commandExists(this.compiler);
    }
}
