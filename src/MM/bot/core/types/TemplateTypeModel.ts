import {BotController} from "../../controller/BotController";

export abstract class TemplateTypeModel {
    protected error: string;
    protected timeStart: number;
    protected controller: BotController;
    public isUsedLocalStorage: boolean;
    public sendInInit: any;

    constructor() {
        this.controller = null;
        this.error = null;
        this._initProcessingTime();
        this.isUsedLocalStorage = false;
        this.sendInInit = null;
    }

    private _initProcessingTime(): void {
        this.timeStart = Date.now();
    }

    public getProcessingTime(): number {
        return Date.now() - this.timeStart;
    }

    public getError(): string {
        return this.error;
    }

    public abstract init(content: any, controller: any): boolean;

    public abstract getContext(): any;

    public isLocalStorage(): boolean {
        return false;
    }

    public getLocalStorage(): object | string {
        return null;
    }
}
