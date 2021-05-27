export class ProcessResult {

    private fullOut: string | null = null;
    private lines: string[] | null = null;
    private error: string[] | null = null;

    private table: string[][] | null = null;
    private filePaths: string[] | null = null;
    private numbers: number[] | null = null;
    private words: string[] | null = null;
    private numberLists: number[][] | null = null;
    private wordLists: number[][] | null = null;
    private jsonObjects: any[] | null = null;
    
    private success: boolean = false;
    

    public getStringSlice(startChar?: number, endChar?: number): string | null {
        if (!this.fullOut) {
            return null;
        }
        
        if (!startChar || startChar < 0) {
            startChar = 0;
        }
        if (!endChar || endChar > this.fullOut.length) {
            endChar = this.fullOut.length;
        }

        return this.fullOut.slice(startChar, endChar);
    }
    public tryFind(regEx: string): string | null {
        return null;
    }

    public parseStdOut(stdOut: string[]) {
        this.fullOut = stdOut.join("\n");
        this.lines = stdOut;
        this.detectFindTable(this.fullOut);
        this.detectFindNumbers(this.fullOut);
    }

    private detectFindTable(fullString: string) {
        
    }

    private numberRegEx: RegExp = new RegExp(/0-9+/g)
    private detectFindNumbers(fullString: string) {
        
    }

    print() {
        
    }
}