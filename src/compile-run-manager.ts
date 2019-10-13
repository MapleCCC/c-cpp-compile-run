import { File } from './models/file';
import { Compile } from './compile';
import { Run } from './run';
import { window } from 'vscode';
import { Configuration } from './configuration';
import { parseFile } from './utils/file-utils';
import { FileType } from './enums/file-type';
import { CompilerConfig } from './models/compiler-config';

export class CompileRunManager {
    public compile(shouldAskForInputFlags = false) {
        const file = this.getFile();
        const config = this.getCompilerConfig(file);

        const compile =
            new Compile(file, { shouldAskForInputFlags, compiler: config.location, inputFlags: config.flags });

        compile.run()
            .catch(error => console.error(error));
    }

    public run(shouldAskForArgs = false) {
        const file = this.getFile();

        const run = new Run(file, { shouldAskForArgs });
        run.run()
            .catch(error => console.error(error));
    }

    public compileRun(shouldAskForInputFlags = false, shouldAskForArgs = false) {
        const file = this.getFile();
        const config = this.getCompilerConfig(file);

        const compile = new Compile(file, { shouldAskForInputFlags, compiler: config.location, inputFlags: config.flags });
        const run = new Run(file, { shouldAskForArgs });

        compile.run()
            .then(() => {
                run.run()
                    .catch(error => console.error(error));
            }).catch(error => console.error(error));
    }

    public getFile(): File {
        if (!window || !window.activeTextEditor || !window.activeTextEditor.document) {
            throw new Error('Invalide active text editor document!');
        }

        const doc = window.activeTextEditor.document;
        if (doc.isUntitled && !Configuration.saveBeforeCompile()) {
            const errorMessage = 'Please save file first then try again!';
            window.showErrorMessage(errorMessage);
            throw new Error(errorMessage);
        }

        return parseFile(doc);
    }

    private getCompilerConfig(file: File): CompilerConfig {
        if (file.type === null || file.type === FileType.unkown) {
            throw new Error('Invalid File!');
        }

        if (file.type === FileType.cplusplus) {
            return { location: Configuration.cppCompiler(), flags: Configuration.cppFlags() };
        }

        if (file.type === FileType.c) {
            return { location: Configuration.cCompiler(), flags: Configuration.cFlags() };
        }

        return { location: 'gcc', flags: null };
    }
}
