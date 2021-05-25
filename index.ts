import process from 'process';
import fsPromises from 'fs/promises';
import path from 'path'
import { Stats } from 'fs';
import { spawn } from 'child_process';

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

function genHandlerFunction(binaryPath: string): any {
    
    const handlerFunction = async (...args: any[]): Promise<any[]> => {
    
        return new Promise<any[]>((resolve, reject) => {
            

            console.log("Opening subprocess: " + binaryPath)
            console.log("With args: " + args)

            const spawnedProcess = spawn(binaryPath, args);
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

async function getGlobalPathFunctionsContext(): Promise<Record<string, unknown> | null> {
    const globalContext: any = {}
    const globalPath: string | undefined = process.env.PATH;
    if (!globalPath) {
        return null;
    }

    const pathDirs: string[] = globalPath.split(':');
    const allBinaries: string[] = await getAllDirsBinaries(pathDirs);
    registerBinariesInContext(allBinaries, globalContext);
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
})
.catch((error: Error) => {
     console.log(error);
});