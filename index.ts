import process from 'process';
import fsPromises from 'fs/promises';
import path from 'path'
import { Stats } from 'fs';
import util from 'util';
import { spawn, exec, SpawnOptionsWithoutStdio } from 'child_process';
const execute = util.promisify(exec);

async function getBinsOfPath(dir: string): Promise<string[]> {

    let dirStats: Stats | null = null;
    try {
        dirStats = await fsPromises.stat(dir)  
    }
    catch (error) {
        console.log("File does not exist: " + error)
    }

    if (!dirStats || !dirStats.isDirectory()) {
        return [];
    }
    
    const dirSubPaths: string[] = await fsPromises.readdir(dir);
    
    const binaryFullPaths: string[] = []

    for (const pathName of dirSubPaths) {
        const fullPath = path.join(dir, pathName);
        try {
            const fileStat: Stats = await fsPromises.stat(fullPath);
            if (fileStat.isFile()) {
                binaryFullPaths.push(fullPath);
            }
        }
        catch (error) {
            console.log("File does not exist: " + fullPath)
        }
    };
    return binaryFullPaths;
}

async function getAllDirsBinaries(directoryPaths: string[]): Promise<string[]>{
    const dirBinaryPromises: Promise<string[]>[] = []
    for (const dirPath of directoryPaths) {
        try {
            dirBinaryPromises.push(getBinsOfPath(dirPath));
        } catch (error) {
            console.log("Error when getting bin: " + dirPath)
            console.log(error)
        }
    }

    const dirBinaries: string[][] = await Promise.all(dirBinaryPromises);
    const allBinaries: string[] = dirBinaries.flat();
    return allBinaries;
}

//Disable output processing features, if you know the output to speed up performance
interface ProcessingOptions {
    findTable: boolean;
    findNumbers: boolean;
    findNumberLists: boolean;
    findWords: boolean;
    findWordLists: boolean;
    findLines: boolean;
    findPaths: string;
}
function setProcessingOptions() {
    
}

function genHandlerFunction(binaryPath?: string): any {
    
    const handlerFunction = async (...args: any[]): Promise<any[]> => {
    
        return new Promise<any[]>(async (resolve, reject) => {

            console.log("Opening subprocess: " + binaryPath)
            console.log("With args: " + args)
            const options: SpawnOptionsWithoutStdio = {};

            if (!binaryPath) {
                binaryPath = args.join(" ");
                args = [];
                options.shell = true;
            }

            const spawnedProcess = spawn(binaryPath, args, options);
            const resultDataPackets: any[] = []
    
            spawnedProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
                resultDataPackets.push(data)
            });
            
            spawnedProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });
            
            spawnedProcess.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                return resolve(resultDataPackets);
            });
    
        })
    }
    

    return handlerFunction;
}

function registerBinariesInContext(binaries: string[], context: Record<string, unknown>): void {
    for (const binary of binaries) {
        const baseName: string = path.basename(binary)
        context[baseName] = genHandlerFunction(binary)
    }
}

function registerDefaultFunctions(context: Record<string, unknown>): void {
    context[ 'eval' ] = genHandlerFunction();
    context[ 'call' ] = genHandlerFunction();
    context[ 'exec' ] = genHandlerFunction();
}

async function getGlobalPathFunctionsContext(): Promise<Record<string, unknown> | null> {
    const globalContext: any = {}
    const globalPath: string | undefined = process.env.PATH;
    if (!globalPath) {
        return null;
    }

    const pathDirs: string[] = globalPath.split(':');
    const allBinaries: string[] = await getAllDirsBinaries(pathDirs);
    registerBinariesInContext(allBinaries, globalContext);
    registerDefaultFunctions(globalContext);
    return globalContext;
}

const exportsObj = {
    "getGlobalContext": getGlobalPathFunctionsContext
}
exports = exportsObj;

exportsObj.getGlobalContext()
.then(async(ctx: any) => {
    await ctx.rnmd("--version");
    await ctx.rnmd("/home/pmarkus/repos/rnmd/notebook/test.md");
    await ctx.eval("echo 'test'");
    await ctx.bash("test.sh");
})
.catch((error: Error) => {
     console.log(error);
});