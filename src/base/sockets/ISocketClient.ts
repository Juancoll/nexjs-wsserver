export interface ISocketClient {
    readonly id: string;
    readonly address: string;
    readonly url: string;
    readonly origin: string | string[] | undefined;
    disconnect(): void;
    onDisconnect(action: () => void): void;
    on(name: string, action: (data: any) => void): ISocketClient;
    emit(name: string, data?: any): void;
}
