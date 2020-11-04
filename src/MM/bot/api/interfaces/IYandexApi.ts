export interface IYandexCheckOutPlace {
    total: number;
    used: string
}
export interface IYandexRequestDownloadImage {
    id: string;
    origUrl: string;
    size: number;
    createdAt: number
}

export interface IYandexRequestDownloadSound {
    id: string;
    skillId: string;
    size: number;
    originalName:string;
    createdAt: string;
    isProcessed: boolean;
    error?: string;
}
